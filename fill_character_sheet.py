import json
import math
from typing import Any

from pypdf import PdfReader, PdfWriter


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


def get_spell_block(char: dict[str, Any], level: int) -> dict[str, Any]:
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


def join_csv(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    return ", ".join(as_str(v) for v in values if v is not None and as_str(v).strip())


def build_field_mapping(char: dict[str, Any]) -> dict[str, str]:
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

    field_mapping: dict[str, str] = {
        # Página 1 - Info básica
        "CharacterName": as_str(char.get("name", "")),
        "ClassLevel": f"{as_str(char.get('class', '')).capitalize()} {as_str(char.get('level', ''))}".strip(),
        "Background": as_str(char.get("background", "")),
        "Race": as_str(char.get("race", "")),
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
        "Ideals": as_str(char.get("ideals", "")),
        "Bonds": as_str(char.get("bonds", "")),
        "Flaws": as_str(char.get("flaws", "")),
        "Inspiration": as_str(char.get("inspiration", "")),
        "PWP": as_str(char.get("passive_perception", "")),
        # Atributos
        "STRscore": as_str(char.get("strength", "")),
        "DEXscore": as_str(char.get("dexterity", "")),
        "CONscore": as_str(char.get("constitution", "")),
        "INTscore": as_str(char.get("intelligence", "")),
        "WISscore": as_str(char.get("wisdom", "")),
        "CHAscore": as_str(char.get("charisma", "")),
        # Bonificadores calculados
        "STRbonus": ability_mod(char.get("strength", 10)),
        "DEXbonus": ability_mod(char.get("dexterity", 10)),
        "CONbonus": ability_mod(char.get("constitution", 10)),
        "INTbonus": ability_mod(char.get("intelligence", 10)),
        "WISbonus": ability_mod(char.get("wisdom", 10)),
        "CHAbonus": ability_mod(char.get("charisma", 10)),
        # Monedas
        "CP": as_str(char.get("copper_pieces", "")),
        "SP": as_str(char.get("silver_pieces", "")),
        "EP": as_str(char.get("electrum_pieces", "")),
        "GP": as_str(char.get("gold_pieces", "")),
        "PP": as_str(char.get("platinum_pieces", "")),
        # Armas
        "Wpn Name": atk(0, "name"),
        "Wpn1 AtkBonus": atk(0, "bonus"),
        "Wpn1 Damage": atk_damage(0),
        "Wpn Name 2": atk(1, "name"),
        "Wpn2 AtkBonus": atk(1, "bonus"),
        "Wpn2 Damage": atk_damage(1),
        "Wpn Name 3": atk(2, "name"),
        "Wpn3 AtkBonus": atk(2, "bonus"),
        "Wpn3 Damage": atk_damage(2),
        # Rasgos y equipo
        "Features and Traits": join_lines(char.get("features_traits", [])),
        "Equipment": join_lines(char.get("equipment", [])),
        "ProficienciesLang": join_csv(char.get("languages", [])) + (
            (", " if isinstance(char.get("languages", []), list) and len(char.get("languages", [])) > 0 and isinstance(char.get("other_proficiencies", []), list) and len(char.get("other_proficiencies", [])) > 0 else "")
        ) + join_csv(char.get("other_proficiencies", [])),
        # Página 2
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
        "Feat+Traits": as_str(char.get("appearance_notes", "")),
        # Página 3
        "Spellcasting Class 2": as_str(char.get("class", "")).capitalize(),
        "SpellcastingAbility 2": as_str(char.get("spellcasting_ability", "")).capitalize(),
        "SpellSaveDC  2": as_str(char.get("spell_save_dc", "")),
        "SpellAtkBonus 2": as_str(char.get("spell_attack_bonus", "")),
        # Slots por nivel (SlotsRemaining = slots_used)
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
    }

    # Conjuros - cantrips -> Spells 1014 a 1022 (9 slots)
    cantrip_fields = [f"Spells {n}" for n in range(1014, 1023)]
    for i, field in enumerate(cantrip_fields):
        field_mapping[field] = as_str(cantrips[i]) if i < len(cantrips) else ""

    # Level 1 -> Spells 1023 a 1033 (11 slots)
    lvl1_fields = [f"Spells {n}" for n in range(1023, 1034)]
    lvl1_spells = level1.get("spells", [])
    for i, field in enumerate(lvl1_fields):
        field_mapping[field] = as_str(lvl1_spells[i]) if i < len(lvl1_spells) else ""

    # Level 2 -> Spells 1034 a 1046 (13 slots)
    lvl2_fields = [f"Spells {n}" for n in range(1034, 1047)]
    lvl2_spells = level2.get("spells", [])
    for i, field in enumerate(lvl2_fields):
        field_mapping[field] = as_str(lvl2_spells[i]) if i < len(lvl2_spells) else ""

    # Level 3 -> Spells 1047 a 1059 (13 slots)
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
            states = list(ap["/N"].keys())
            for state in states:
                state_str = as_str(state)
                if state_str not in ("/Off", "Off"):
                    return state_str
    except Exception:
        pass
    return "/Yes"


def build_checkbox_mapping(reader: PdfReader, char: dict[str, Any]) -> dict[str, str]:
    fields = reader.get_fields() or {}
    mapping: dict[str, str] = {}

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
        "persuasion": ["persuasion", "persuasion"],
        "religion": ["religion", "religion"],
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
        elif ("checkbox" in n or "checkbox" in n or "prof" in n or "save" in n or "salv" in n):
            mapping[field_name] = "/Off"

    return mapping


def fill_character_sheet(char: dict[str, Any], input_pdf: str, output_pdf: str) -> None:
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    writer.append(reader)

    field_mapping = build_field_mapping(char)
    checkbox_mapping = build_checkbox_mapping(reader, char)
    merged_mapping = {**field_mapping, **checkbox_mapping}

    # Aplicar mapeo en todas las páginas
    for page_num in range(len(writer.pages)):
        writer.update_page_form_field_values(
            writer.pages[page_num],
            merged_mapping,
            auto_regenerate=False,
        )

    with open(output_pdf, "wb") as output_file:
        writer.write(output_file)


if __name__ == "__main__":
    with open("character.json", "r", encoding="utf-8") as json_file:
        character = json.load(json_file)

    fill_character_sheet(
        character,
        "editable_es.pdf",
        "filled_character_sheet.pdf",
    )
    print("PDF generado: filled_character_sheet.pdf")
