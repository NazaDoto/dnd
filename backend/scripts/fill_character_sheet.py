import argparse
import json
import math
from io import BytesIO
from typing import Any, Dict
from urllib.parse import urljoin, urlparse

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject, TextStringObject

try:
    from reportlab.pdfgen import canvas  # type: ignore
    from reportlab.lib.utils import ImageReader  # type: ignore
    HAS_REPORTLAB = True
except Exception:
    HAS_REPORTLAB = False


def as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def ability_mod(score: Any) -> str:
    try:
        score_num = int(score)
    except (TypeError, ValueError):
        score_num = 10
    return str(math.floor((score_num - 10) / 2))


def get_spell_block(char: Dict[str, Any], level: int) -> Dict[str, Any]:
    spells = char.get("spells", {})
    if not isinstance(spells, dict):
        return {"slots": 0, "slots_used": 0, "spells": []}
    block = spells.get(f"level{level}", {})
    if not isinstance(block, dict):
        return {"slots": 0, "slots_used": 0, "spells": []}
    return {
        "slots": block.get("slots", 0),
        "slots_used": block.get("slots_used", 0),
        "spells": block.get("spells", []) if isinstance(block.get("spells", []), list) else [],
    }


def join_lines(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    return "\n".join(as_str(v) for v in values if v is not None and as_str(v).strip())


def join_feature_names(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    lines = []
    for value in values:
        if isinstance(value, dict):
            name = as_str(value.get("name", "")).strip()
            description = as_str(value.get("description", "")).strip()
            line = f"{name}: {description}".strip(": ").strip()
            if line:
                lines.append(line)
        else:
            txt = as_str(value).strip()
            if txt:
                lines.append(txt)
    return "\n".join(lines)


def join_csv(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    return ", ".join(as_str(v) for v in values if v is not None and as_str(v).strip())


def build_field_mapping(char: Dict[str, Any]) -> Dict[str, str]:
    attacks = char.get("attacks_spellcasting", [])
    if not isinstance(attacks, list):
        attacks = []

    def atk(idx: int, key: str) -> str:
        if idx >= len(attacks) or not isinstance(attacks[idx], dict):
            return ""
        return as_str(attacks[idx].get(key, ""))

    def atk_damage(idx: int) -> str:
        if idx >= len(attacks) or not isinstance(attacks[idx], dict):
            return ""
        dmg = as_str(attacks[idx].get("damage", ""))
        typ = as_str(attacks[idx].get("type", ""))
        return f"{dmg} {typ}".strip()

    spells = char.get("spells", {})
    if not isinstance(spells, dict):
        spells = {}
    cantrips = spells.get("cantrips", [])
    if not isinstance(cantrips, list):
        cantrips = []

    level1 = get_spell_block(char, 1)
    level2 = get_spell_block(char, 2)
    level3 = get_spell_block(char, 3)
    level4 = get_spell_block(char, 4)
    level5 = get_spell_block(char, 5)
    level6 = get_spell_block(char, 6)
    level7 = get_spell_block(char, 7)
    level8 = get_spell_block(char, 8)
    level9 = get_spell_block(char, 9)

    skills_prof = set(as_str(v).strip().lower() for v in char.get("skills_prof", []) if as_str(v).strip())
    skills_expertise = set(as_str(v).strip().lower() for v in char.get("skills_expertise", []) if as_str(v).strip())
    saves_prof = set(as_str(v).strip().lower() for v in char.get("saving_throws_prof", []) if as_str(v).strip())

    def to_int(value: Any, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def signed(value: int) -> str:
        return f"+{value}" if value >= 0 else str(value)

    str_mod = math.floor((to_int(char.get("strength"), 10) - 10) / 2)
    dex_mod = math.floor((to_int(char.get("dexterity"), 10) - 10) / 2)
    con_mod = math.floor((to_int(char.get("constitution"), 10) - 10) / 2)
    int_mod = math.floor((to_int(char.get("intelligence"), 10) - 10) / 2)
    wis_mod = math.floor((to_int(char.get("wisdom"), 10) - 10) / 2)
    cha_mod = math.floor((to_int(char.get("charisma"), 10) - 10) / 2)
    pb = to_int(char.get("proficiency_bonus"), 2)

    attr_mod = {
        "strength": str_mod,
        "dexterity": dex_mod,
        "constitution": con_mod,
        "intelligence": int_mod,
        "wisdom": wis_mod,
        "charisma": cha_mod,
    }
    skill_to_attr = {
        "acrobatics": "dexterity",
        "animal_handling": "wisdom",
        "arcana": "intelligence",
        "athletics": "strength",
        "deception": "charisma",
        "history": "intelligence",
        "insight": "wisdom",
        "intimidation": "charisma",
        "investigation": "intelligence",
        "medicine": "wisdom",
        "nature": "intelligence",
        "perception": "wisdom",
        "performance": "charisma",
        "persuasion": "charisma",
        "religion": "intelligence",
        "sleight_of_hand": "dexterity",
        "stealth": "dexterity",
        "survival": "wisdom",
    }

    def skill_bonus(skill_key: str) -> str:
        base = attr_mod.get(skill_to_attr.get(skill_key, "strength"), 0)
        if skill_key in skills_expertise:
            return signed(base + pb * 2)
        if skill_key in skills_prof:
            return signed(base + pb)
        return signed(base)

    def save_bonus(save_key: str) -> str:
        base = attr_mod.get(save_key, 0)
        if save_key in saves_prof:
            return signed(base + pb)
        return signed(base)

    attacks_text = []
    extra_attacks_text = []
    for i in range(len(attacks)):
        line = f"{atk(i, 'name')} {atk(i, 'bonus')} {atk_damage(i)}".strip()
        if line:
            attacks_text.append(line)
            if i >= 3:
                extra_attacks_text.append(line)

    prof_lang_text = (
        f"Competencias: {join_csv(char.get('other_proficiencies', []))}\n"
        f"Idiomas: {join_csv(char.get('languages', []))}"
    ).strip()

    field_mapping: Dict[str, str] = {
        "CharacterName": as_str(char.get("name", "")),
        "PlayerName": as_str(char.get("player_username", "")),
        "ClassLevel": f"{as_str(char.get('class', '')).capitalize()} {as_str(char.get('level', ''))}".strip(),
        "Background": as_str(char.get("background", "")),
        "Race": as_str(char.get("race", "")),
        "Race ": as_str(char.get("race", "")),
        "Alignment": as_str(char.get("alignment", "")).replace("_", " ").title(),
        "XP": as_str(char.get("experience_points", "")),
        "ProfBonus": as_str(char.get("proficiency_bonus", "")),
        "AC": as_str(char.get("armor_class", "")),
        "Initiative": as_str(char.get("initiative", "")),
        "Speed": as_str(char.get("speed", "")),
        "HPMax": as_str(char.get("hit_points_max", "")),
        "HPCurrent": as_str(char.get("hit_points_current", "")),
        "HPTemp": as_str(char.get("hit_points_temp", "") or ""),
        "HDTotal": as_str(char.get("hit_dice", "")),
        "HD": as_str(char.get("hit_dice", "")),
        "PersonalityTraits": as_str(char.get("personality_traits", "")),
        "PersonalityTraits ": as_str(char.get("personality_traits", "")),
        "Ideals": as_str(char.get("ideals", "")),
        "Bonds": as_str(char.get("bonds", "")),
        "Flaws": as_str(char.get("flaws", "")),
        "Inspiration": as_str(char.get("inspiration", "")),
        "PWP": as_str(char.get("passive_perception", "")),
        "STRscore": as_str(char.get("strength", "")),
        "DEXscore": as_str(char.get("dexterity", "")),
        "CONscore": as_str(char.get("constitution", "")),
        "INTscore": as_str(char.get("intelligence", "")),
        "WISscore": as_str(char.get("wisdom", "")),
        "CHAscore": as_str(char.get("charisma", "")),
        "STRbonus": ability_mod(char.get("strength", 10)),
        "DEXbonus": ability_mod(char.get("dexterity", 10)),
        "CONbonus": ability_mod(char.get("constitution", 10)),
        "INTbonus": ability_mod(char.get("intelligence", 10)),
        "WISbonus": ability_mod(char.get("wisdom", 10)),
        "CHAbonus": ability_mod(char.get("charisma", 10)),
        "CP": as_str(char.get("copper_pieces", "")),
        "SP": as_str(char.get("silver_pieces", "")),
        "EP": as_str(char.get("electrum_pieces", "")),
        "GP": as_str(char.get("gold_pieces", "")),
        "PP": as_str(char.get("platinum_pieces", "")),
        "Wpn Name": atk(0, "name"),
        "Wpn1 AtkBonus": atk(0, "bonus"),
        "Wpn1 Damage": atk_damage(0),
        "Wpn Name 2": atk(1, "name"),
        "Wpn2 AtkBonus": atk(1, "bonus"),
        "Wpn2 Damage": atk_damage(1),
        "Wpn Name 3": atk(2, "name"),
        "Wpn3 AtkBonus": atk(2, "bonus"),
        "Wpn3 AtkBonus  ": atk(2, "bonus"),
        "Wpn3 Damage": atk_damage(2),
        "Wpn3 Damage ": atk_damage(2),
        "Wpn2 AtkBonus ": atk(1, "bonus"),
        "Wpn2 Damage ": atk_damage(1),
        "AttacksSpellcasting": "\n".join(extra_attacks_text),
        "Features and Traits": join_feature_names(char.get("features_traits", [])),
        "Equipment": join_lines(char.get("equipment", [])),
        "Equipment 2": "\n".join(extra_attacks_text),
        "ProficienciesLang": join_csv(char.get("languages", [])) + (
            ", " if char.get("languages") and char.get("other_proficiencies") else ""
        ) + join_csv(char.get("other_proficiencies", [])),
        "ProficienciesLang ": prof_lang_text,
        "CharacterName 2": as_str(char.get("name", "")),
        "Age": as_str(char.get("age", "")),
        "Height": as_str(char.get("height", "")),
        "Weight": as_str(char.get("weight", "")),
        "Eyes": as_str(char.get("eyes", "")),
        "Skin": as_str(char.get("skin", "")),
        "Hair": as_str(char.get("hair", "")),
        "Backstory": as_str(char.get("backstory", "")),
        "Allies": as_str(char.get("allies_organizations", "")),
        "Allies 2": as_str(char.get("faction", "")),
        "Treasure": as_str(char.get("treasure", "")),
        "Treasure 2": as_str(char.get("treasure", "")),
        "Feat+Traits": as_str(char.get("appearance_notes", "")),
        "Feat+Traits 2": join_feature_names(char.get("features_traits", [])),
        "Spellcasting Class 2": as_str(char.get("class", "")).capitalize(),
        "SpellcastingAbility 2": as_str(char.get("spellcasting_ability", "")).capitalize(),
        "SpellSaveDC  2": as_str(char.get("spell_save_dc", "")),
        "SpellAtkBonus 2": as_str(char.get("spell_attack_bonus", "")),
        "SlotsTotal 19": as_str(level1.get("slots", 0)),
        "SlotsRemaining 19": as_str(level1.get("slots_used", 0)),
        "SlotsTotal 20": as_str(level2.get("slots", 0)),
        "SlotsRemaining 20": as_str(level2.get("slots_used", 0)),
        "SlotsTotal 21": as_str(level3.get("slots", 0)),
        "SlotsRemaining 21": as_str(level3.get("slots_used", 0)),
        "SlotsTotal 22": as_str(level4.get("slots", 0)),
        "SlotsRemaining 22": as_str(level4.get("slots_used", 0)),
        "SlotsTotal 23": as_str(level5.get("slots", 0)),
        "SlotsRemaining 23": as_str(level5.get("slots_used", 0)),
        "SlotsTotal 24": as_str(level6.get("slots", 0)),
        "SlotsRemaining 24": as_str(level6.get("slots_used", 0)),
        "SlotsTotal 25": as_str(level7.get("slots", 0)),
        "SlotsRemaining 25": as_str(level7.get("slots_used", 0)),
        "SlotsTotal 26": as_str(level8.get("slots", 0)),
        "SlotsRemaining 26": as_str(level8.get("slots_used", 0)),
        "SlotsTotal 27": as_str(level9.get("slots", 0)),
        "SlotsRemaining 27": as_str(level9.get("slots_used", 0)),
        "Acrobatics": skill_bonus("acrobatics"),
        "Athletics": skill_bonus("athletics"),
        "Arcana": skill_bonus("arcana"),
        "Deception": skill_bonus("deception"),
        "History": skill_bonus("history"),
        "Performance": skill_bonus("performance"),
        "Intimidation": skill_bonus("intimidation"),
        "Investigation": skill_bonus("investigation"),
        "SleightofHand": skill_bonus("sleight_of_hand"),
        "Medicine": skill_bonus("medicine"),
        "Nature": skill_bonus("nature"),
        "Perception": skill_bonus("perception"),
        "Insight": skill_bonus("insight"),
        "Persuasion": skill_bonus("persuasion"),
        "Religion": skill_bonus("religion"),
        "Stealth": skill_bonus("stealth"),
        "Survival": skill_bonus("survival"),
        "AnHan": skill_bonus("animal_handling"),
        "STRsave": save_bonus("strength"),
        "DEXsave": save_bonus("dexterity"),
        "CONsave": save_bonus("constitution"),
        "INTsave": save_bonus("intelligence"),
        "WISsave": save_bonus("wisdom"),
        "CHAsave": save_bonus("charisma"),
        "STRsavePROF": "X" if "strength" in saves_prof else "",
        "DEXsavePROF": "X" if "dexterity" in saves_prof else "",
        "CONsavePROF": "X" if "constitution" in saves_prof else "",
        "INTsavePROF": "X" if "intelligence" in saves_prof else "",
        "WISsavePROF": "X" if "wisdom" in saves_prof else "",
        "CHAsavePROF": "X" if "charisma" in saves_prof else "",
        "acroPROF": "X" if "acrobatics" in skills_prof else "",
        "athPROF": "X" if "athletics" in skills_prof else "",
        "arcanaPROF": "X" if "arcana" in skills_prof else "",
        "decepPROF": "X" if "deception" in skills_prof else "",
        "histPROF": "X" if "history" in skills_prof else "",
        "perfPROF": "X" if "performance" in skills_prof else "",
        "intimPROF": "X" if "intimidation" in skills_prof else "",
        "investPROF": "X" if "investigation" in skills_prof else "",
        "sohPROF": "X" if "sleight_of_hand" in skills_prof else "",
        "medPROF": "X" if "medicine" in skills_prof else "",
        "naturePROF": "X" if "nature" in skills_prof else "",
        "perPROF": "X" if "perception" in skills_prof else "",
        "insightPROF": "X" if "insight" in skills_prof else "",
        "persPROF": "X" if "persuasion" in skills_prof else "",
        "religPROF": "X" if "religion" in skills_prof else "",
        "stealthPROF": "X" if "stealth" in skills_prof else "",
        "survPROF": "X" if "survival" in skills_prof else "",
        "anhanPROF": "X" if "animal_handling" in skills_prof else "",
    }

    cantrip_fields = [f"Spells {n}" for n in range(1014, 1023)]
    for i, field in enumerate(cantrip_fields):
        field_mapping[field] = as_str(cantrips[i]) if i < len(cantrips) else ""
    lvl1_fields = [f"Spells {n}" for n in range(1023, 1034)]
    lvl1_spells = level1.get("spells", [])
    for i, field in enumerate(lvl1_fields):
        field_mapping[field] = as_str(lvl1_spells[i]) if i < len(lvl1_spells) else ""
    lvl2_fields = [f"Spells {n}" for n in range(1034, 1047)]
    lvl2_spells = level2.get("spells", [])
    for i, field in enumerate(lvl2_fields):
        field_mapping[field] = as_str(lvl2_spells[i]) if i < len(lvl2_spells) else ""
    lvl3_fields = [f"Spells {n}" for n in range(1047, 1060)]
    lvl3_spells = level3.get("spells", [])
    for i, field in enumerate(lvl3_fields):
        field_mapping[field] = as_str(lvl3_spells[i]) if i < len(lvl3_spells) else ""

    return field_mapping


def norm_name(value: Any) -> str:
    return "".join(ch for ch in as_str(value).lower() if ch.isalnum())


def checkbox_on_value(field_obj: Any) -> str:
    try:
        ap = field_obj.get("/AP")
        if ap and ap.get("/N"):
            for state in ap["/N"].keys():
                state_str = as_str(state)
                if state_str not in ("/Off", "Off"):
                    return state_str
    except Exception:
        pass
    return "/Yes"


def build_checkbox_mapping(reader: PdfReader, char: Dict[str, Any]) -> Dict[str, str]:
    fields = reader.get_fields() or {}
    mapping: Dict[str, str] = {}
    skills_prof = set(as_str(v).strip().lower() for v in char.get("skills_prof", []) if as_str(v).strip())
    saves_prof = set(as_str(v).strip().lower() for v in char.get("saving_throws_prof", []) if as_str(v).strip())
    inspiration = bool(char.get("inspiration"))

    skill_aliases = {
        "acrobatics": ["acrobatics", "acrobacias"],
        "animal_handling": ["animalhandling", "tratoconanimales", "tconanimales"],
        "arcana": ["arcana", "carcano"],
        "athletics": ["athletics", "atletismo"],
        "deception": ["deception", "engano"],
        "history": ["history", "historia"],
        "insight": ["insight", "perspicacia"],
        "intimidation": ["intimidation", "intimidacion"],
        "investigation": ["investigation", "investigacion"],
        "medicine": ["medicine", "medicina"],
        "nature": ["nature", "naturaleza"],
        "perception": ["perception", "percepcion"],
        "performance": ["performance", "interpretacion"],
        "persuasion": ["persuasion"],
        "religion": ["religion"],
        "sleight_of_hand": ["sleightofhand", "juegodemanos"],
        "stealth": ["stealth", "sigilo"],
        "survival": ["survival", "supervivencia"],
    }
    save_aliases = {
        "strength": ["strength", "fuerza"],
        "dexterity": ["dexterity", "destreza"],
        "constitution": ["constitution", "constitucion"],
        "intelligence": ["intelligence", "inteligencia"],
        "wisdom": ["wisdom", "sabiduria"],
        "charisma": ["charisma", "carisma"],
    }

    for field_name, field_obj in fields.items():
        if as_str(field_obj.get("/FT", "")) != "/Btn":
            continue
        n = norm_name(field_name)
        on = checkbox_on_value(field_obj)
        selected = False

        if "inspiration" in n or "inspiracion" in n:
            selected = inspiration
        else:
            for save_key, aliases in save_aliases.items():
                if any(alias in n for alias in aliases) and ("save" in n or "salv" in n or "tirada" in n):
                    selected = save_key in saves_prof
                    break
            if not selected:
                for skill_key, aliases in skill_aliases.items():
                    if any(alias in n for alias in aliases) and ("prof" in n or "compet" in n):
                        selected = skill_key in skills_prof
                        break

        if selected:
            mapping[field_name] = on

    return mapping


def fill_character_sheet(char: Dict[str, Any], input_pdf: str, output_pdf: str) -> None:
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append(reader)
    # Force PDF viewers to regenerate field appearances so values are visible.
    writer.set_need_appearances_writer(True)
    raw_mapping = build_field_mapping(char)
    merged = {**raw_mapping, **build_checkbox_mapping(reader, char)}
    existing = reader.get_fields() or {}
    norm_to_real = {norm_name(k): k for k in existing.keys()}
    final_mapping: Dict[str, str] = {}
    for key, value in merged.items():
        if key in existing:
            final_mapping[key] = value
            continue
        nkey = norm_name(key)
        real_key = norm_to_real.get(nkey)
        if real_key:
            final_mapping[real_key] = value
        else:
            final_mapping[key] = value

    for page_num in range(len(writer.pages)):
        writer.update_page_form_field_values(
            writer.pages[page_num],
            final_mapping,
            auto_regenerate=True,
        )

    apply_field_styles(writer)
    add_profile_image(reader, writer, char)

    with open(output_pdf, "wb") as output_file:
        writer.write(output_file)


def set_widget_style(writer: PdfWriter, field_names: list, font_size: int, multiline: bool = False) -> None:
    names_norm = {norm_name(n) for n in field_names}
    for page in writer.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        for annot_ref in annots:
            annot = annot_ref.get_object()
            title = as_str(annot.get("/T", ""))
            if norm_name(title) not in names_norm:
                continue
            annot[NameObject("/DA")] = TextStringObject(f"/Helv {font_size} Tf 0 g")
            if multiline:
                ff = int(annot.get("/Ff", 0))
                annot[NameObject("/Ff")] = NumberObject(ff | (1 << 12))


def apply_field_styles(writer: PdfWriter) -> None:
    # Campos largos con fuente más chica para evitar overflow.
    set_widget_style(writer, ["PersonalityTraits", "Ideals", "Bonds", "Flaws"], 6, multiline=True)
    set_widget_style(writer, ["Backstory", "Allies", "Allies 2", "Treasure", "Treasure 2"], 6, multiline=True)
    set_widget_style(writer, ["Features and Traits", "Feat+Traits", "Feat+Traits 2"], 5, multiline=True)
    set_widget_style(writer, ["Equipment", "Equipment 2", "AttacksSpellcasting", "ProficienciesLang", "ProficienciesLang "], 5, multiline=True)
    # Conjuros en grilla necesitan fuente pequeña.
    spell_fields = [f"Spells {n}" for n in range(1014, 1100)] + [f"Spells 1010{n}" for n in range(0, 14)]
    set_widget_style(writer, spell_fields, 6, multiline=False)


def resolve_profile_url(char: Dict[str, Any]) -> str:
    local_path = as_str(char.get("__photo_abs_path", "")).strip()
    if local_path:
        return local_path
    raw = as_str(char.get("photo_url", "")).strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    base = as_str(char.get("__base_url", "")).strip()
    if not base:
        return ""
    return urljoin(base, raw)


def add_profile_image(reader: PdfReader, writer: PdfWriter, char: Dict[str, Any]) -> None:
    if not HAS_REPORTLAB:
        return
    image_url = resolve_profile_url(char)
    if not image_url:
        return
    try:
        parsed = urlparse(image_url)
        if parsed.scheme in ("http", "https"):
            import urllib.request
            with urllib.request.urlopen(image_url, timeout=10) as response:  # nosec - controlled URL
                image_bytes = response.read()
        else:
            with open(image_url, "rb") as image_file:
                image_bytes = image_file.read()
    except Exception:
        return

    # Campo de imagen en página 2
    target_page_index = 1
    target_rect = None
    page = reader.pages[target_page_index]
    annots = page.get("/Annots")
    if annots:
        for annot_ref in annots:
            annot = annot_ref.get_object()
            title = as_str(annot.get("/T", ""))
            if title.strip() in ("Imagen1_af_image", "Imagen2_af_image"):
                rect = annot.get("/Rect")
                if rect and len(rect) == 4:
                    target_rect = [float(rect[0]), float(rect[1]), float(rect[2]), float(rect[3])]
                    break
    if not target_rect:
        return

    llx, lly, urx, ury = target_rect
    width = max(1.0, urx - llx)
    height = max(1.0, ury - lly)

    packet = BytesIO()
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)
    c = canvas.Canvas(packet, pagesize=(page_width, page_height))
    c.drawImage(ImageReader(BytesIO(image_bytes)), llx, lly, width=width, height=height, preserveAspectRatio=True, anchor="c", mask="auto")
    c.save()
    packet.seek(0)
    overlay_reader = PdfReader(packet)
    writer.pages[target_page_index].merge_page(overlay_reader.pages[0])


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill DnD character sheet PDF")
    parser.add_argument("--json", required=True, help="Path to character json")
    parser.add_argument("--template", required=True, help="Path to editable template pdf")
    parser.add_argument("--output", required=True, help="Output pdf path")
    args = parser.parse_args()

    with open(args.json, "r", encoding="utf-8") as f:
        char = json.load(f)
    fill_character_sheet(char, args.template, args.output)


if __name__ == "__main__":
    main()
