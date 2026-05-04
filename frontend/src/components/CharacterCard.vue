<template>
  <div class="char-card" @click="$emit('click')">
    <div class="char-avatar">
      <img
        v-if="character.photo_url"
        :src="character.photo_url"
        :alt="character.name"
        class="avatar-img"
      />
      <div v-else class="avatar-placeholder">{{ character.name[0] }}</div>

      <div class="hp-badge" :class="hpClass">
        {{ character.hit_points_current }}/{{ character.hit_points_max }}
      </div>
    </div>

    <div class="char-info">
      <h3 class="char-name">{{ character.name }}</h3>
      <p class="char-subtitle">
        <span class="badge badge-gold">Nv.{{ character.level }}</span>
        {{ character.race }} · {{ classLabel }}
      </p>
      <p class="char-bg" v-if="character.background">
        {{ character.background }}
      </p>
    </div>

    <div class="char-actions">
      <button
        class="pdf-btn"
        type="button"
        title="Descargar PDF"
        :disabled="downloadingPdf"
        @click.stop="downloadPdf"
      >
        {{ downloadingPdf ? "..." : "PDF" }}
      </button>

      <span class="action-arrow">›</span>
    </div>
  </div>
</template>

<script>
import jsPDF from "jspdf";
import {
  CLASSES,
  ATTRIBUTES,
  SKILLS,
  getModifier,
  formatModifier,
} from "../services/dndData.js";
import { charactersAPI } from "../services/api.js";

export default {
  name: "CharacterCard",
  emits: ["click"],
  props: {
    character: { type: Object, required: true },
  },
  data() {
    return {
      downloadingPdf: false,
    };
  },
  computed: {
    classLabel() {
      const cls = CLASSES.find((c) => c.value === this.character.class);
      return cls ? cls.label : this.character.class;
    },

    hpClass() {
      const max = this.character.hit_points_max || 1;
      const pct = this.character.hit_points_current / max;

      if (pct > 0.5) return "hp-ok";
      if (pct > 0.25) return "hp-warn";
      return "hp-danger";
    },
  },
  methods: {
    safeArray(value) {
      if (Array.isArray(value)) return value;

      if (typeof value === "string" && value.trim()) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      return [];
    },

    getCharacterId() {
      return (
        this.character.id ||
        this.character.character_id ||
        this.character.characterId
      );
    },

    getClassLabel(value) {
      const cls = CLASSES.find((c) => c.value === value);
      return cls ? cls.label : value || "-";
    },

    getAttrLabel(key) {
      const attr = ATTRIBUTES.find((a) => a.key === key);
      return attr ? attr.label : key || "-";
    },

    getSkillBonus(character, sk) {
      const skillsProf = this.safeArray(character.skills_prof);
      const skillsExpertise = this.safeArray(character.skills_expertise);

      const mod = getModifier(character?.[sk.attr] || 10);
      const pb = character?.proficiency_bonus || 2;

      let bonus = mod;

      if (skillsExpertise.includes(sk.key)) bonus += pb * 2;
      else if (skillsProf.includes(sk.key)) bonus += pb;

      return formatModifier(bonus);
    },

    pdfTheme() {
      return {
        marginX: 14,
        topY: 14,
        bottomY: 282,
        pageWidth: 210,
        contentWidth: 182,

        dark: [31, 27, 20],
        sectionDark: [42, 36, 27],
        gold: [245, 198, 102],
        mutedGold: [120, 105, 80],
        text: [35, 35, 35],
        muted: [95, 85, 70],
        softBg: [245, 242, 235],
        chipBg: [245, 240, 255],
        chipBorder: [124, 58, 237],
        chipText: [90, 65, 145],
        line: [222, 215, 202],
      };
    },

    setFont(doc, style = "normal", size = 9, color = [35, 35, 35]) {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    },

    ensureSpace(doc, y, needed = 10) {
      const t = this.pdfTheme();

      if (y + needed > t.bottomY) {
        doc.addPage();
        return t.topY;
      }

      return y;
    },

    sanitizePdfText(value, fallback = "-") {
      if (value === null || value === undefined || value === "") return fallback;

      return String(value)
        .replace(/[—–]/g, "-")
        .replace(/[•]/g, "-")
        .replace(/[★]/g, "*")
        .replace(/[●○]/g, "")
        .replace(/\t/g, " ")
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n");
    },

    addSection(doc, title, y) {
      const t = this.pdfTheme();

      y = this.ensureSpace(doc, y, 16);

      doc.setFillColor(...t.sectionDark);
      doc.rect(t.marginX, y, t.contentWidth, 8, "F");

      this.setFont(doc, "bold", 10, t.gold);
      doc.text(this.sanitizePdfText(title).toUpperCase(), t.marginX + 4, y + 5.5);

      return y + 13;
    },

    addParagraph(doc, text, x, y, width = 182, options = {}) {
      const t = this.pdfTheme();

      const {
        fontSize = 9,
        lineHeight = 4.8,
        style = "normal",
        color = t.text,
        gapAfter = 2,
        justify = true,
      } = options;

      const clean = this.sanitizePdfText(text, "");
      if (!clean.trim()) return y;

      this.setFont(doc, style, fontSize, color);

      const paragraphs = clean.split("\n");

      paragraphs.forEach((paragraph, pIndex) => {
        const paragraphText = paragraph.trim();

        if (!paragraphText) {
          y += lineHeight;
          return;
        }

        const lines = doc.splitTextToSize(paragraphText, width);

        lines.forEach((line, index) => {
          y = this.ensureSpace(doc, y, lineHeight + 2);

          const isLastLine = index === lines.length - 1;

          doc.text(line, x, y, {
            maxWidth: width,
            align: justify && !isLastLine ? "justify" : "left",
          });

          y += lineHeight;
        });

        if (pIndex < paragraphs.length - 1) y += 1.5;
      });

      return y + gapAfter;
    },

    addBlockText(doc, title, text, x, y, width = 178, options = {}) {
      const t = this.pdfTheme();

      const clean = this.sanitizePdfText(text, "");
      if (!clean.trim()) return y;

      y = this.addParagraph(doc, `${title}:`, x, y, width, {
        style: "bold",
        fontSize: options.titleSize || 9,
        color: t.muted,
        gapAfter: 1,
        justify: false,
      });

      y = this.addParagraph(doc, clean, x, y, width, {
        fontSize: options.fontSize || 8.7,
        lineHeight: options.lineHeight || 4.7,
        gapAfter: options.gapAfter || 3,
        justify: options.justify !== false,
      });

      return y;
    },

    addKeyValue(doc, label, value, x, y, width = 182, options = {}) {
      const t = this.pdfTheme();

      const {
        labelWidth = 34,
        fontSize = 9,
        lineHeight = 4.8,
        gapAfter = 1.5,
      } = options;

      const labelText = `${this.sanitizePdfText(label)}:`;
      const valueText = this.sanitizePdfText(value);

      const valueX = x + labelWidth;
      const valueWidth = width - labelWidth;

      this.setFont(doc, "normal", fontSize, t.text);
      const valueLines = doc.splitTextToSize(valueText, valueWidth);

      const needed = Math.max(6, valueLines.length * lineHeight);
      y = this.ensureSpace(doc, y, needed + 2);

      this.setFont(doc, "bold", fontSize, t.muted);
      doc.text(labelText, x, y);

      this.setFont(doc, "normal", fontSize, t.text);
      doc.text(valueLines, valueX, y);

      return y + needed + gapAfter;
    },

    addTwoColumnKeyValues(doc, pairs, y) {
      const t = this.pdfTheme();
      const leftX = t.marginX + 2;
      const rightX = t.marginX + 94;
      const colW = 84;

      for (let i = 0; i < pairs.length; i += 2) {
        const left = pairs[i];
        const right = pairs[i + 1];

        const startY = y;

        let yLeft = startY;
        let yRight = startY;

        if (left) {
          yLeft = this.addKeyValue(doc, left[0], left[1], leftX, yLeft, colW, {
            labelWidth: 28,
          });
        }

        if (right) {
          yRight = this.addKeyValue(doc, right[0], right[1], rightX, yRight, colW, {
            labelWidth: 28,
          });
        }

        y = Math.max(yLeft, yRight);
      }

      return y;
    },

    addStatCards(doc, items, y, columns = 3) {
      const t = this.pdfTheme();
      const gap = 5;
      const cardW = (t.contentWidth - gap * (columns - 1)) / columns;
      const cardH = 13;

      items.forEach((item, index) => {
        if (index > 0 && index % columns === 0) y += cardH + 4;

        y = this.ensureSpace(doc, y, cardH + 4);

        const col = index % columns;
        const x = t.marginX + col * (cardW + gap);

        doc.setFillColor(...t.softBg);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");

        this.setFont(doc, "bold", 7, t.muted);
        doc.text(this.sanitizePdfText(item.label).toUpperCase(), x + 3, y + 4);

        this.setFont(doc, "bold", 11, t.text);
        doc.text(this.sanitizePdfText(item.value), x + 3, y + 10);
      });

      return y + cardH + 5;
    },

    addChipList(doc, items, x, y, width = 178) {
      const t = this.pdfTheme();

      const cleanItems = items
        .map((item) => this.sanitizePdfText(item, "").trim())
        .filter(Boolean);

      if (!cleanItems.length) return y;

      let cursorX = x;
      let cursorY = y;
      const chipH = 6;
      const gap = 2;

      cleanItems.forEach((item) => {
        this.setFont(doc, "normal", 8, t.chipText);

        const rawW = doc.getTextWidth(item) + 8;
        const chipW = Math.min(rawW, width);

        if (cursorX + chipW > x + width) {
          cursorX = x;
          cursorY += chipH + gap;
        }

        cursorY = this.ensureSpace(doc, cursorY, chipH + 4);

        doc.setFillColor(...t.chipBg);
        doc.setDrawColor(...t.chipBorder);
        doc.roundedRect(cursorX, cursorY - 4.5, chipW, chipH, 3, 3, "FD");

        doc.setTextColor(...t.chipText);

        const label =
          rawW > width
            ? doc.splitTextToSize(item, chipW - 8)[0]
            : item;

        doc.text(label, cursorX + 4, cursorY);

        cursorX += chipW + gap;
      });

      return cursorY + chipH + 3;
    },

    addSimpleTable(doc, headers, rows, y, widths) {
      const t = this.pdfTheme();
      const x = t.marginX;
      const rowH = 6;

      y = this.ensureSpace(doc, y, rowH * 2);

      doc.setFillColor(...t.softBg);
      doc.rect(x, y - 4.5, t.contentWidth, rowH, "F");

      let cx = x + 2;

      this.setFont(doc, "bold", 7.5, t.muted);

      headers.forEach((h, i) => {
        doc.text(this.sanitizePdfText(h).toUpperCase(), cx, y);
        cx += widths[i];
      });

      y += rowH;

      rows.forEach((row) => {
        y = this.ensureSpace(doc, y, rowH + 2);

        cx = x + 2;
        this.setFont(doc, "normal", 8.5, t.text);

        row.forEach((cell, i) => {
          const text = this.sanitizePdfText(cell);
          const lines = doc.splitTextToSize(text, widths[i] - 2);
          doc.text(lines.slice(0, 1), cx, y);
          cx += widths[i];
        });

        doc.setDrawColor(...t.line);
        doc.line(x, y + 1.5, x + t.contentWidth, y + 1.5);

        y += rowH;
      });

      return y + 2;
    },

    addPageFooters(doc, name) {
      const t = this.pdfTheme();
      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        this.setFont(doc, "normal", 8, [130, 120, 105]);
        doc.text(
          `${this.sanitizePdfText(name || "Personaje")} · Página ${i} de ${pageCount}`,
          t.pageWidth / 2,
          290,
          { align: "center" }
        );
      }
    },

    formatEquipmentItems(equipment) {
      return equipment.map((item) => {
        if (typeof item === "string") return item;

        if (!item || typeof item !== "object") return "Objeto";

        const name = item.name || "Objeto";
        const qty = item.qty ? ` x${item.qty}` : "";

        return `${name}${qty}`;
      });
    },

    normalizeSpells(value) {
      const base = {
        cantrips: [],
        level1: { slots: 0, slots_used: 0, spells: [] },
        level2: { slots: 0, slots_used: 0, spells: [] },
        level3: { slots: 0, slots_used: 0, spells: [] },
        level4: { slots: 0, slots_used: 0, spells: [] },
        level5: { slots: 0, slots_used: 0, spells: [] },
        level6: { slots: 0, slots_used: 0, spells: [] },
        level7: { slots: 0, slots_used: 0, spells: [] },
        level8: { slots: 0, slots_used: 0, spells: [] },
        level9: { slots: 0, slots_used: 0, spells: [] },
      };

      if (!value) return base;

      let parsed = value;

      if (typeof value === "string") {
        try {
          parsed = JSON.parse(value);
        } catch {
          return base;
        }
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return base;
      }

      base.cantrips = Array.isArray(parsed.cantrips) ? parsed.cantrips : [];

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`;
        const level = parsed[key];

        if (level && typeof level === "object") {
          base[key] = {
            slots: Number(level.slots || 0),
            slots_used: Number(level.slots_used || 0),
            spells: Array.isArray(level.spells) ? level.spells : [],
          };
        }
      }

      return base;
    },

    formatSpellsBlocksForPdf(value) {
      const spells = this.normalizeSpells(value);
      const blocks = [];

      const cantrips = spells.cantrips
        .map((spell) => String(spell).trim())
        .filter(Boolean);

      if (cantrips.length) {
        blocks.push({
          title: "Trucos",
          subtitle: "",
          items: cantrips,
        });
      }

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`;
        const level = spells[key];

        const levelSpells = Array.isArray(level.spells)
          ? level.spells.map((spell) => String(spell).trim()).filter(Boolean)
          : [];

        const slots = Number(level.slots || 0);
        const used = Number(level.slots_used || 0);

        if (!levelSpells.length && slots <= 0) continue;

        blocks.push({
          title: `Nivel ${i}`,
          subtitle: slots > 0 ? `Slots ${used}/${slots}` : "",
          items: levelSpells.length ? levelSpells : ["Sin conjuros preparados"],
        });
      }

      return blocks;
    },

    async downloadPdf() {
      const id = this.getCharacterId();

      if (!id) {
        alert("No se encontró el ID del personaje.");
        return;
      }

      this.downloadingPdf = true;

      try {
        const { data } = await charactersAPI.getFull(id);
        const c = data;
        const t = this.pdfTheme();

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const attacks = this.safeArray(c.attacks_spellcasting);
        const equipment = this.safeArray(c.equipment);
        const features = this.safeArray(c.features_traits);
        const languages = this.safeArray(c.languages);
        const otherProfs = this.safeArray(c.other_proficiencies);
        const savingThrows = this.safeArray(c.saving_throws_prof);
        const skillsProf = this.safeArray(c.skills_prof);
        const skillsExpertise = this.safeArray(c.skills_expertise);

        let y = 0;

        doc.setFillColor(...t.dark);
        doc.rect(0, 0, t.pageWidth, 36, "F");

        this.setFont(doc, "bold", 22, t.gold);
        doc.text(this.sanitizePdfText(c.name || "Personaje"), t.marginX, 16);

        this.setFont(doc, "normal", 10, [230, 220, 200]);
        doc.text(
          `${this.sanitizePdfText(c.race || "-")}${
            c.subrace ? ` (${this.sanitizePdfText(c.subrace)})` : ""
          } · ${this.getClassLabel(c.class)} · Nivel ${c.level || 1}`,
          t.marginX,
          24
        );

        const subtitle = [c.background, c.alignment]
          .map((v) => this.sanitizePdfText(v, "").trim())
          .filter(Boolean)
          .join(" · ");

        if (subtitle) {
          doc.text(subtitle, t.marginX, 30);
        }

        y = 46;

        y = this.addSection(doc, "Datos principales", y);
        y = this.addTwoColumnKeyValues(
          doc,
          [
            ["Nombre", c.name],
            ["Raza", `${c.race || "-"}${c.subrace ? ` (${c.subrace})` : ""}`],
            ["Clase", this.getClassLabel(c.class)],
            ["Nivel", c.level],
            ["Trasfondo", c.background],
            ["Alineamiento", c.alignment],
            ["XP", c.experience_points || 0],
          ],
          y
        );

        y += 2;
        y = this.addSection(doc, "Combate", y);

        y = this.addStatCards(doc, [
          { label: "PV", value: `${c.hit_points_current || 0}/${c.hit_points_max || 0}` },
          { label: "PV temp.", value: c.hit_points_temp || 0 },
          { label: "CA", value: c.armor_class || "-" },
          { label: "Iniciativa", value: formatModifier(c.initiative || 0) },
          { label: "Velocidad", value: `${c.speed || 0} ft` },
          { label: "B. competencia", value: formatModifier(c.proficiency_bonus || 2) },
        ]);

        y = this.addSection(doc, "Atributos", y);

        const attrCards = ATTRIBUTES.map((attr) => ({
          label: attr.short || attr.label,
          value: `${c[attr.key] || 10} (${formatModifier(
            getModifier(c[attr.key] || 10)
          )})`,
        }));

        y = this.addStatCards(doc, attrCards, y, 3);

        y = this.addSection(doc, "Salvaciones y habilidades", y);

        const savesText = savingThrows.length
          ? savingThrows.map((attr) => this.getAttrLabel(attr)).join(", ")
          : "Ninguna";

        y = this.addKeyValue(doc, "Salvaciones", savesText, t.marginX + 2, y, 178, {
          labelWidth: 30,
        });

        y = this.addParagraph(doc, "Habilidades", t.marginX + 2, y, 178, {
          style: "bold",
          color: t.muted,
          gapAfter: 1,
          justify: false,
        });

        y = this.addParagraph(
          doc,
          "[P] Competente   [E] Experto   [ ] Sin competencia",
          t.marginX + 2,
          y,
          178,
          {
            style: "italic",
            fontSize: 8,
            color: t.mutedGold,
            gapAfter: 1,
            justify: false,
          }
        );

        const skillRows = SKILLS.map((sk) => {
          const isProf = skillsProf.includes(sk.key);
          const isExpert = skillsExpertise.includes(sk.key);
          const mark = isExpert ? "[E]" : isProf ? "[P]" : "[ ]";

          return [
            mark,
            `${sk.label} (${this.getAttrLabel(sk.attr)})`,
            this.getSkillBonus(c, sk),
          ];
        });

        y = this.addSimpleTable(
          doc,
          ["", "Habilidad", "Bonus"],
          skillRows,
          y,
          [12, 142, 24]
        );

        y = this.addSection(doc, "Ataques", y);

        if (attacks.length) {
          const attackRows = attacks.map((atk) => [
            atk.name || "Ataque",
            atk.bonus || "+0",
            atk.damage || "-",
            atk.type || "-",
          ]);

          y = this.addSimpleTable(
            doc,
            ["Nombre", "Bonus", "Daño", "Tipo"],
            attackRows,
            y,
            [80, 24, 38, 36]
          );
        } else {
          y = this.addParagraph(doc, "Sin ataques registrados.", t.marginX + 2, y);
        }

        y = this.addSection(doc, "Magia", y);

        y = this.addTwoColumnKeyValues(
          doc,
          [
            ["Característica", this.getAttrLabel(c.spellcasting_ability)],
            ["CD salvación", c.spell_save_dc],
            ["Ataque conjuro", c.spell_attack_bonus ? `+${c.spell_attack_bonus}` : "-"],
          ],
          y
        );

        const spellBlocks = this.formatSpellsBlocksForPdf(c.spells);

        if (spellBlocks.length) {
          spellBlocks.forEach((block) => {
            y = this.ensureSpace(doc, y, 18);

            this.setFont(doc, "bold", 9, t.muted);
            doc.text(block.title, t.marginX + 2, y);

            if (block.subtitle) {
              this.setFont(doc, "normal", 8, t.mutedGold);
              doc.text(block.subtitle, t.marginX + 45, y);
            }

            y += 4;
            y = this.addChipList(doc, block.items, t.marginX + 2, y, 178);
          });
        } else {
          y = this.addParagraph(doc, "Sin conjuros registrados.", t.marginX + 2, y);
        }

        y = this.addSection(doc, "Equipo", y);

        y = this.addStatCards(
          doc,
          [
            { label: "PC", value: c.copper_pieces || 0 },
            { label: "PP", value: c.silver_pieces || 0 },
            { label: "PE", value: c.electrum_pieces || 0 },
            { label: "PO", value: c.gold_pieces || 0 },
            { label: "PPl", value: c.platinum_pieces || 0 },
          ],
          y,
          5
        );

        const equipmentItems = equipment.length
          ? this.formatEquipmentItems(equipment)
          : ["Sin equipo registrado."];

        y = this.addParagraph(doc, "Equipo", t.marginX + 2, y, 178, {
          style: "bold",
          color: t.muted,
          gapAfter: 1,
          justify: false,
        });

        y = this.addChipList(doc, equipmentItems, t.marginX + 2, y, 178);

        if (c.treasure) {
          y = this.addBlockText(doc, "Tesoros", c.treasure, t.marginX + 2, y, 178);
        }

        y = this.addSection(doc, "Rasgos, idiomas y competencias", y);

        if (features.length) {
          features.forEach((feat) => {
            const name = typeof feat === "string" ? feat : feat.name;
            const desc = typeof feat === "string" ? "" : feat.description;

            y = this.addParagraph(doc, name || "Rasgo", t.marginX + 2, y, 178, {
              style: "bold",
              color: t.muted,
              gapAfter: 1,
              justify: false,
            });

            if (desc) {
              y = this.addParagraph(doc, desc, t.marginX + 4, y, 174, {
                fontSize: 8.5,
                gapAfter: 2,
                justify: true,
              });
            }
          });
        } else {
          y = this.addParagraph(doc, "Sin rasgos registrados.", t.marginX + 2, y);
        }

        if (languages.length) {
          y = this.addParagraph(doc, "Idiomas", t.marginX + 2, y, 178, {
            style: "bold",
            color: t.muted,
            gapAfter: 1,
            justify: false,
          });

          y = this.addChipList(doc, languages, t.marginX + 2, y, 178);
        }

        if (otherProfs.length) {
          y = this.addParagraph(doc, "Competencias", t.marginX + 2, y, 178, {
            style: "bold",
            color: t.muted,
            gapAfter: 1,
            justify: false,
          });

          y = this.addChipList(doc, otherProfs, t.marginX + 2, y, 178);
        }

        y = this.addSection(doc, "Trasfondo", y);

        y = this.addBlockText(
          doc,
          "Rasgos de personalidad",
          c.personality_traits,
          t.marginX + 2,
          y,
          178
        );

        y = this.addBlockText(
          doc,
          "Ideales",
          c.ideals,
          t.marginX + 2,
          y,
          178
        );

        y = this.addBlockText(
          doc,
          "Vínculos",
          c.bonds,
          t.marginX + 2,
          y,
          178
        );

        y = this.addBlockText(
          doc,
          "Defectos",
          c.flaws,
          t.marginX + 2,
          y,
          178
        );

        y = this.addBlockText(
          doc,
          "Historia",
          c.backstory,
          t.marginX + 2,
          y,
          178,
          {
            fontSize: 8.7,
            lineHeight: 4.7,
            gapAfter: 2,
          }
        );

        y = this.addSection(doc, "Apariencia", y);

        y = this.addTwoColumnKeyValues(
          doc,
          [
            ["Edad", c.age],
            ["Altura", c.height],
            ["Peso", c.weight],
            ["Ojos", c.eyes],
            ["Piel", c.skin],
            ["Cabello", c.hair],
          ],
          y
        );

        y = this.addBlockText(
          doc,
          "Notas de apariencia",
          c.appearance_notes,
          t.marginX + 2,
          y,
          178
        );

        y = this.addSection(doc, "Alianzas", y);

        y = this.addKeyValue(doc, "Facción", c.faction, t.marginX + 2, y, 178, {
          labelWidth: 28,
        });

        y = this.addBlockText(
          doc,
          "Aliados",
          c.allies_organizations,
          t.marginX + 2,
          y,
          178
        );

        this.addPageFooters(doc, c.name);

        const filename = `${String(c.name || "personaje")
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-_]/g, "")}.pdf`;

        doc.save(filename);
      } catch (error) {
        console.error(error);
        alert("No se pudo generar el PDF del personaje.");
      } finally {
        this.downloadingPdf = false;
      }
    },
  },
};
</script>

<style scoped>
.char-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.char-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--gold-dark), var(--gold));
  opacity: 0;
  transition: opacity 0.2s;
}

.char-card:hover {
  border-color: var(--gold-dark);
  box-shadow: var(--shadow-gold);
}

.char-card:hover::before {
  opacity: 1;
}

.char-card:active {
  transform: scale(0.99);
}

.char-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}

.avatar-placeholder {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.4rem;
  color: var(--gold);
  text-transform: uppercase;
}

.hp-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 0.6rem;
  font-family: var(--font-title);
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}

.hp-ok {
  background: rgba(22, 163, 74, 0.2);
  color: #4ade80;
  border-color: var(--green);
}

.hp-warn {
  background: rgba(202, 138, 4, 0.2);
  color: #fbbf24;
  border-color: #ca8a04;
}

.hp-danger {
  background: rgba(185, 28, 28, 0.2);
  color: #f87171;
  border-color: var(--red);
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.char-bg {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
  font-style: italic;
}

.char-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pdf-btn {
  border: 1px solid var(--gold-dark);
  background: rgba(217, 119, 6, 0.12);
  color: var(--gold-light);
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-family: var(--font-title);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s,
    transform 0.2s;
}

.pdf-btn:hover {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  border-color: var(--gold);
  color: var(--bg-deep);
  transform: translateY(-1px);
}

.pdf-btn:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
}

.action-arrow {
  font-size: 1.5rem;
  color: var(--text-dim);
  line-height: 1;
}
</style>