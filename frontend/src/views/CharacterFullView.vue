<template>
  <div class="full-view" v-if="character">
    <div class="full-header">
      <button type="button" class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <h2 class="full-title">{{ character.name }}</h2>
      <div class="full-header-actions">
        <RouterLink
          v-if="!isDmCampaignReader"
          :to="`/character/${id}/edit`"
          class="btn btn-secondary"
          style="font-size: 0.78rem; padding: 0.4rem 0.7rem"
        >
          Editar
        </RouterLink>
        <template v-else>
          <RouterLink
            :to="`/dm/campaign/${campaignId}`"
            class="btn btn-ghost"
            style="font-size: 0.78rem; padding: 0.4rem 0.7rem"
          >
            Campaña
          </RouterLink>
          <button
            type="button"
            class="btn btn-secondary"
            style="font-size: 0.78rem; padding: 0.4rem 0.7rem"
            @click="downloadDmPdf"
          >
            PDF
          </button>
        </template>
      </div>
    </div>

    <div class="full-overview">
      <div class="detail-hero card">
        <div class="hero-photo">
          <img
            v-if="character.photo_url"
            :src="character.photo_url"
            :alt="character.name"
            class="hero-img"
          />
          <div v-else class="hero-placeholder">{{ character.name[0] }}</div>
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ character.name }}</h1>
          <p class="hero-meta">
            {{ character.race }}
            <span v-if="character.subrace"> ({{ character.subrace }})</span>
            · {{ character.class }} Nv.{{ character.level }}
          </p>
          <p class="hero-bg" v-if="character.background">
            {{ character.background }} · {{ character.alignment }}
          </p>
        </div>
      </div>

      <div class="hp-section card">
        <div class="hp-header">
          <span class="section-title" style="margin: 0; border: none; padding: 0">Puntos de Vida</span>
          <div class="hp-controls">
            <button class="btn btn-secondary btn-icon" @click="adjustHP(-1)">-</button>
            <span class="hp-display">
              <span :class="['hp-current', hpClass]">{{ character.hit_points_current }}</span>
              <span class="hp-sep">/</span>
              <span class="hp-max">{{ character.hit_points_max }}</span>
            </span>
            <button class="btn btn-secondary btn-icon" @click="adjustHP(1)">+</button>
          </div>
        </div>
        <div class="hp-bar-wrap">
          <div class="hp-bar" :style="{ width: hpPct + '%' }" :class="hpClass"></div>
        </div>
        <div v-if="character.hit_points_temp > 0" class="hp-temp">
          +{{ character.hit_points_temp }} PV temporales
        </div>
      </div>

      <div class="combat-row">
        <div class="combat-box">
          <span class="cbox-val">{{ character.armor_class }}</span>
          <span class="cbox-lbl">CA</span>
        </div>
        <div class="combat-box">
          <span class="cbox-val">{{ fmtMod(character.initiative) }}</span>
          <span class="cbox-lbl">Iniciativa</span>
        </div>
        <div class="combat-box">
          <span class="cbox-val">{{ character.speed }}ft</span>
          <span class="cbox-lbl">Velocidad</span>
        </div>
        <div class="combat-box">
          <span class="cbox-val">{{ fmtMod(character.proficiency_bonus) }}</span>
          <span class="cbox-lbl">B.Profic.</span>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Atributos</p>
        <StatsBlock :character="character" />
      </div>

      <div class="row-2">
        <div class="card info-pill">
          <span class="pill-icon">{{ character.inspiration ? '✨' : '○' }}</span>
          <span class="pill-lbl">Inspiracion</span>
        </div>
        <div class="card info-pill">
          <span class="pill-val">{{ character.passive_perception ?? '-' }}</span>
          <span class="pill-lbl">Perc. Pasiva</span>
        </div>
      </div>

      <div class="card xp-section">
        <div class="xp-header">
          <span class="section-title" style="margin: 0; border: none; padding: 0">Experiencia</span>
          <span class="badge badge-gold">{{ character.experience_points || 0 }} XP</span>
        </div>
        <div class="xp-bar-wrap">
          <div class="xp-bar" :style="{ width: xpPct + '%' }"></div>
        </div>
        <p class="xp-hint">{{ xpLabel }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>

    <!-- ── PESTAÑA: Habilidades ── -->
    <div v-if="activeTab === 'skills'" class="tab-content">
      <div class="tab-edit-row" v-if="!isDmCampaignReader">
        <button type="button" class="edit-icon-btn" @click="goEditSection('skills')" title="Editar habilidades">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.34 1.34 3.91 3.91 1.34-1.34z"/></svg>
        </button>
      </div>
      <div class="card mb-4">
        <p class="section-title">Salvaciones</p>
        <div class="skill-list">
          <div v-for="attr in ATTRIBUTES" :key="attr.key" class="skill-row">
            <span :class="['prof-dot', hasSavingThrow(attr.key) ? 'filled' : '']"></span>
            <span class="skill-name">{{ attr.label }}</span>
            <span class="skill-bonus">{{ getSavingThrowBonus(attr.key) }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <p class="section-title">Habilidades</p>
        <div class="skill-list">
          <div v-for="sk in SKILLS" :key="sk.key" class="skill-row">
            <span :class="[
              'prof-dot',
              hasExpertise(sk.key)
                ? 'expertise'
                : hasSkill(sk.key)
                  ? 'filled'
                  : '',
            ]"></span>
            <span class="skill-name">{{ sk.label }}
              <span class="skill-attr">({{ attrShort(sk.attr) }})</span></span>
            <span class="skill-bonus">{{ getSkillBonus(sk) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── PESTAÑA: Combate ── -->
    <div v-if="activeTab === 'combat'" class="tab-content">
      <div class="tab-edit-row" v-if="!isDmCampaignReader">
        <button type="button" class="edit-icon-btn" @click="goEditSection('combat')" title="Editar combate">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.34 1.34 3.91 3.91 1.34-1.34z"/></svg>
        </button>
      </div>
      <div class="card mb-4">
        <p class="section-title">Ataques</p>
        <div v-if="attacks.length" class="attacks-list">
          <div v-for="(atk, i) in attacks" :key="i" class="attack-row">
            <span class="atk-name">{{ atk.name || "Ataque " + (i + 1) }}</span>
            <span class="atk-bonus badge badge-gold">{{
              atk.bonus || "+0"
            }}</span>
            <span class="atk-dmg">{{ atk.damage || "—" }}</span>
            <span class="atk-type text-muted" style="font-size: 0.72rem">{{
              atk.type || ""
            }}</span>
          </div>
        </div>
        <p v-else class="text-muted" style="font-size: 0.85rem">
          Sin ataques registrados
        </p>
      </div>
      <div class="card mb-4">
        <p class="section-title">Lanzamiento de Conjuros</p>
        <div v-if="character.spellcasting_ability" class="spell-meta">
          <div class="spell-meta-box">
            <span class="smb-val">{{ character.spell_save_dc || "—" }}</span>
            <span class="smb-lbl">CD Salvación</span>
          </div>
          <div class="spell-meta-box">
            <span class="smb-val">{{
              character.spell_attack_bonus
                ? "+" + character.spell_attack_bonus
                : "—"
            }}</span>
            <span class="smb-lbl">Ataque Conjuro</span>
          </div>
          <div class="spell-meta-box">
            <span class="smb-val">{{ abilityLabel }}</span>
            <span class="smb-lbl">Característica</span>
          </div>
        </div>
        <p v-else class="text-muted" style="font-size: 0.85rem">
          Personaje no lanzador
        </p>
      </div>
      <div class="card" v-if="visibleSpellBlocks.length">
        <p class="section-title">Conjuros</p>

        <div v-for="block in visibleSpellBlocks" :key="block.key" class="spell-level-block">
          <div class="spell-level-header">
            <span class="spell-level-name">{{ block.label }}</span>

            <span v-if="block.showSlots" class="slots-indicator">
              <span v-for="n in block.slots" :key="n" :class="[
                'slot-pip',
                n <= block.slotsUsed ? 'used' : '',
              ]"></span>
            </span>
          </div>

          <div class="spell-tags">
            <span v-for="sp in block.spells" :key="sp" class="spell-tag">
              {{ sp }}
            </span>
          </div>
        </div>
      </div>
      </div>

      <!-- ── PESTAÑA: Equipo ── -->
      <div v-if="activeTab === 'equipment'" class="tab-content">
        <div class="tab-edit-row" v-if="!isDmCampaignReader">
          <button type="button" class="edit-icon-btn" @click="goEditSection('equipment')" title="Editar equipo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.34 1.34 3.91 3.91 1.34-1.34z"/></svg>
          </button>
        </div>
        <div class="card mb-4">
          <p class="section-title">Monedas</p>
          <div class="coins-grid">
            <div v-for="coin in coins" :key="coin.key" class="coin-box" :style="{ borderColor: coin.color }">
              <span class="coin-icon">{{ coin.icon }}</span>
              <span class="coin-val">{{ character[coin.key] || 0 }}</span>
              <span class="coin-lbl">{{ coin.label }}</span>
            </div>
          </div>
        </div>
        <div class="card mb-4">
          <p class="section-title">Equipo</p>
          <div v-if="equipment.length">
            <div v-for="(item, i) in equipment" :key="i" class="equip-row">
              <span class="equip-name">{{ item.name || item }}</span>
              <span v-if="item.qty" class="equip-qty">x{{ item.qty }}</span>
            </div>
          </div>
          <p v-else class="text-muted" style="font-size: 0.85rem">
            Mochila vacía
          </p>
        </div>
        <div class="card" v-if="character.treasure">
          <p class="section-title">Tesoros & Otros</p>
          <p style="
            font-size: 0.9rem;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.treasure }}
          </p>
        </div>
      </div>

      <!-- ── PESTAÑA: Trasfondo ── -->
      <div v-if="activeTab === 'backstory'" class="tab-content">
        <div class="tab-edit-row" v-if="!isDmCampaignReader">
          <button type="button" class="edit-icon-btn" @click="goEditSection('backstory')" title="Editar trasfondo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.34 1.34 3.91 3.91 1.34-1.34z"/></svg>
          </button>
        </div>
        <div class="card mb-4" v-if="
          character.personality_traits ||
          character.ideals ||
          character.bonds ||
          character.flaws
        ">
          <p class="section-title">Personalidad</p>
          <div class="trait-grid">
            <div v-if="character.personality_traits" class="trait-box">
              <p class="trait-lbl">Rasgos</p>
              <p class="trait-val">{{ character.personality_traits }}</p>
            </div>
            <div v-if="character.ideals" class="trait-box">
              <p class="trait-lbl">Ideales</p>
              <p class="trait-val">{{ character.ideals }}</p>
            </div>
            <div v-if="character.bonds" class="trait-box">
              <p class="trait-lbl">Vínculos</p>
              <p class="trait-val">{{ character.bonds }}</p>
            </div>
            <div v-if="character.flaws" class="trait-box">
              <p class="trait-lbl">Defectos</p>
              <p class="trait-val">{{ character.flaws }}</p>
            </div>
          </div>
        </div>
        <div class="card mb-4" v-if="character.backstory">
          <p class="section-title">Historia</p>
          <p style="
            font-size: 0.9rem;
            line-height: 1.7;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.backstory }}
          </p>
        </div>
        <div class="card mb-4">
          <p class="section-title">Apariencia</p>
          <div class="appear-grid">
            <div v-for="f in visibleAppearanceFields" :key="f.key" class="appear-row">
              <span class="appear-lbl">{{ f.label }}</span>
              <span class="appear-val">{{ character[f.key] }}</span>
            </div>
          </div>
          <p v-if="character.appearance_notes" style="
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.appearance_notes }}
          </p>
        </div>
        <div class="card" v-if="character.allies_organizations || character.faction">
          <p class="section-title">Alianzas & Organizaciones</p>
          <p v-if="character.faction" class="badge badge-purple mb-2">
            {{ character.faction }}
          </p>
          <p style="font-size: 0.9rem; color: var(--text-secondary)">
            {{ character.allies_organizations }}
          </p>
        </div>
      </div>

      <!-- ── PESTAÑA: Rasgos ── -->
      <div v-if="activeTab === 'features'" class="tab-content">
        <div class="tab-edit-row" v-if="!isDmCampaignReader">
          <button type="button" class="edit-icon-btn" @click="goEditSection('features')" title="Editar rasgos">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.34 1.34 3.91 3.91 1.34-1.34z"/></svg>
          </button>
        </div>
        <div class="card mb-4" v-if="features.length">
          <p class="section-title">Rasgos & Capacidades</p>
          <div v-for="(feat, i) in features" :key="i" class="feat-block">
            <p class="feat-name">{{ feat.name }}</p>
            <p class="feat-desc" v-if="feat.description">
              {{ feat.description }}
            </p>
          </div>
        </div>
        <div class="card" v-if="languages.length || otherProfs.length">
          <p class="section-title">Competencias & Idiomas</p>
          <div class="lang-tags">
            <span v-for="l in languages" :key="l" class="badge badge-blue">{{
              l
            }}</span>
            <span v-for="p in otherProfs" :key="p" class="badge badge-gold">{{
              p
            }}</span>
          </div>
        </div>
      </div>
      <div v-if="activeTab === 'notes'" class="tab-content">
        <CharacterNotesPanel :char-id="id" />
      </div>
    </div>

    <div v-else class="loading-screen">
      <div class="spinner"></div>
      <span>Cargando ficha...</span>
    </div>
</template>

<script>
import { charactersAPI, dmAPI } from "../services/api.js";
import { exportCharacterPdf } from "../services/pdfExport.js";
import CharacterNotesPanel from "../components/CharacterNotesPanel.vue";
import StatsBlock from "../components/StatsBlock.vue";
import { XP_BY_LEVEL } from "../services/dndData.js";
import {
  ATTRIBUTES,
  SKILLS,
  SPELLCASTING_ABILITIES,
  getModifier,
  formatModifier,
} from "../services/dndData.js";

export default {
  name: "CharacterFullView",
  components: { CharacterNotesPanel, StatsBlock },
  inject: ["showToast"],
  data() {
    return {
      character: null,
      activeTab: "skills",
      ATTRIBUTES,
      SKILLS,
      tabs: [
        { id: "skills", label: "Habilidades" },
        { id: "combat", label: "Combate" },
        { id: "equipment", label: "Equipo" },
        { id: "backstory", label: "Trasfondo" },
        { id: "features", label: "Rasgos" },
        { id: "notes", label: "Notas" },
      ],
      coins: [
        { key: "copper_pieces", label: "PC", icon: "🟤", color: "#92400e" },
        { key: "silver_pieces", label: "PP", icon: "⚪", color: "#9ca3af" },
        { key: "electrum_pieces", label: "PE", icon: "🔵", color: "#3b82f6" },
        { key: "gold_pieces", label: "PO", icon: "🟡", color: "#d97706" },
        { key: "platinum_pieces", label: "PPl", icon: "⬜", color: "#e2e8f0" },
      ],
      appearanceFields: [
        { key: "age", label: "Edad" },
        { key: "height", label: "Altura" },
        { key: "weight", label: "Peso" },
        { key: "eyes", label: "Ojos" },
        { key: "skin", label: "Piel" },
        { key: "hair", label: "Cabello" },
      ],
    };
  },
  computed: {
    visibleAppearanceFields() {
      return this.appearanceFields.filter(f => this.character[f.key])
    },
    id() {
      return this.$route.params.id;
    },
    campaignId() {
      return this.$route.params.campaignId;
    },
    isDmCampaignReader() {
      return this.$route.name === "DmCampaignCharacter";
    },
    attacks() {
      return Array.isArray(this.character?.attacks_spellcasting)
        ? this.character.attacks_spellcasting
        : [];
    },
    spells() {
      return this.normalizeSpells(this.character?.spells)
    },

    visibleSpellBlocks() {
      const spells = this.spells
      const blocks = []

      const cantrips = spells.cantrips
        .map(spell => String(spell).trim())
        .filter(Boolean)

      if (cantrips.length) {
        blocks.push({
          key: 'cantrips',
          label: 'Trucos',
          spells: cantrips,
          slots: 0,
          slotsUsed: 0,
          showSlots: false
        })
      }

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`
        const level = spells[key]

        const levelSpells = Array.isArray(level.spells)
          ? level.spells.map(spell => String(spell).trim()).filter(Boolean)
          : []

        const slots = Number(level.slots || 0)
        const slotsUsed = Number(level.slots_used || 0)

        const hasSpells = levelSpells.length > 0
        const hasSlots = slots > 0

        if (!hasSpells && !hasSlots) continue

        blocks.push({
          key,
          label: `Nivel ${i}`,
          spells: levelSpells,
          slots,
          slotsUsed,
          showSlots: hasSlots
        })
      }

      return blocks
    },
    equipment() {
      return Array.isArray(this.character?.equipment)
        ? this.character.equipment
        : [];
    },
    features() {
      return Array.isArray(this.character?.features_traits)
        ? this.character.features_traits
        : [];
    },
    languages() {
      return Array.isArray(this.character?.languages)
        ? this.character.languages
        : [];
    },
    otherProfs() {
      return Array.isArray(this.character?.other_proficiencies)
        ? this.character.other_proficiencies
        : [];
    },
    abilityLabel() {
      const sa = SPELLCASTING_ABILITIES.find(
        (a) => a.value === this.character?.spellcasting_ability,
      );
      return sa ? sa.label.split(" ")[0] : "—";
    },
    hpPct() {
      if (!this.character) return 0;
      const max = this.character.hit_points_max || 1;
      return Math.max(0, Math.min(100, (this.character.hit_points_current / max) * 100));
    },
    hpClass() {
      const p = this.hpPct;
      if (p > 50) return "ok";
      if (p > 25) return "warn";
      return "danger";
    },
    xpPct() {
      const lvl = this.character?.level || 1;
      const cur = this.character?.experience_points || 0;
      const base = XP_BY_LEVEL[lvl - 1] || 0;
      const next = XP_BY_LEVEL[lvl] || base;
      if (!next || next === base) return 100;
      return Math.min(100, ((cur - base) / (next - base)) * 100);
    },
    xpLabel() {
      const lvl = this.character?.level || 1;
      if (lvl >= 20) return "Nivel maximo alcanzado";
      const next = XP_BY_LEVEL[lvl] || 0;
      const rem = next - (this.character?.experience_points || 0);
      return rem > 0 ? `${rem} XP para nivel ${lvl + 1}` : "Listo para subir";
    }
  },
  async mounted() {
    try {
      if (this.isDmCampaignReader) {
        const { data } = await dmAPI.getCampaignCharacter(this.campaignId, this.id);
        this.character = data;
      } else {
        const { data } = await charactersAPI.getFull(this.id);
        this.character = data;
      }
    } catch {
      this.showToast("Error al cargar ficha", "error");
      this.$router.back();
    }
  },
  methods: {
    goEditSection(section) {
      this.$router.push(`/character/${this.id}/edit?section=${section}`);
    },
    fmtMod(v) {
      return formatModifier(v);
    },
    async adjustHP(delta) {
      const c = this.character;
      c.hit_points_current = Math.max(0, Math.min(c.hit_points_max || 0, (c.hit_points_current || 0) + delta));
      try {
        const fd = new FormData();
        Object.keys(c).forEach((k) => {
          if (c[k] !== null && c[k] !== undefined) {
            fd.append(k, typeof c[k] === "object" ? JSON.stringify(c[k]) : c[k]);
          }
        });
        await charactersAPI.update(this.id, fd);
      } catch {
        // silencioso para no interrumpir UX del ajuste rapido
      }
    },
    downloadDmPdf() {
      if (this.character) exportCharacterPdf(this.character);
    },
    hasSavingThrow(attr) {
      return (this.character?.saving_throws_prof || []).includes(attr);
    },
    hasSkill(key) {
      return (this.character?.skills_prof || []).includes(key);
    },
    hasExpertise(key) {
      return (this.character?.skills_expertise || []).includes(key);
    },
    getSavingThrowBonus(attr) {
      const mod = getModifier(this.character?.[attr] || 10);
      const pb = this.character?.proficiency_bonus || 2;
      return formatModifier(this.hasSavingThrow(attr) ? mod + pb : mod);
    },
    getSkillBonus(sk) {
      const mod = getModifier(this.character?.[sk.attr] || 10);
      const pb = this.character?.proficiency_bonus || 2;
      let bonus = mod;
      if (this.hasExpertise(sk.key)) bonus += pb * 2;
      else if (this.hasSkill(sk.key)) bonus += pb;
      return formatModifier(bonus);
    },
    attrShort(attr) {
      return (
        ATTRIBUTES.find((a) => a.key === attr)?.short ||
        attr.toUpperCase().slice(0, 3)
      );
    },
    emptySpells() {
  return {
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
  }
},

normalizeSpells(value) {
  const base = this.emptySpells()

  if (!value) return base

  let parsed = value

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return base
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return base
  }

  base.cantrips = Array.isArray(parsed.cantrips) ? parsed.cantrips : []

  for (let i = 1; i <= 9; i++) {
    const key = `level${i}`
    const level = parsed[key]

    if (level && typeof level === 'object') {
      base[key] = {
        slots: Number(level.slots || 0),
        slots_used: Number(level.slots_used || 0),
        spells: Array.isArray(level.spells) ? level.spells : []
      }
    }
  }

  return base
},
    levelLabel(key) {
      if (key === "cantrips") return "Trucos";
      return `Nivel ${key.replace("level", "")}`;
    },
  },
};
</script>

<style scoped>
.full-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.full-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.full-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--text-primary);
  flex: 1;
  text-align: center;
}
.full-overview {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}
.detail-hero {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.hero-img,
.hero-placeholder {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  border: 2px solid var(--gold-dark);
  flex-shrink: 0;
}
.hero-img { object-fit: cover; }
.hero-placeholder {
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.4rem;
  color: var(--gold);
}
.hero-name {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--text-primary);
}
.hero-meta {
  font-size: 0.82rem;
  color: var(--text-secondary);
}
.hero-bg {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.hp-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.45rem; }
.hp-controls { display: flex; align-items: center; gap: 0.4rem; }
.hp-display { font-family: var(--font-title); display: inline-flex; align-items: baseline; gap: 0.15rem; }
.hp-current { font-size: 1.2rem; font-weight: 700; }
.hp-current.ok { color: #4ade80; }
.hp-current.warn { color: #fbbf24; }
.hp-current.danger { color: #f87171; }
.hp-sep { color: var(--text-dim); }
.hp-max { color: var(--text-muted); font-size: 0.95rem; }
.hp-bar-wrap { height: 8px; border-radius: 4px; background: var(--bg-deep); overflow: hidden; }
.hp-bar { height: 100%; transition: width 0.3s; }
.hp-bar.ok { background: linear-gradient(to right, var(--green), #4ade80); }
.hp-bar.warn { background: linear-gradient(to right, #ca8a04, #fbbf24); }
.hp-bar.danger { background: linear-gradient(to right, var(--red), var(--red-light)); }
.hp-temp { font-size: 0.74rem; color: #a78bfa; margin-top: 0.35rem; }
.combat-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
.combat-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.45rem 0.2rem;
}
.cbox-val { font-family: var(--font-title); font-size: 1.2rem; color: var(--gold-light); }
.cbox-lbl { font-size: 0.56rem; text-transform: uppercase; color: var(--text-muted); }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
.info-pill { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.pill-icon { font-size: 1.35rem; }
.pill-val { font-family: var(--font-title); font-size: 1.25rem; color: var(--gold-light); }
.pill-lbl { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); }
.xp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
.xp-bar-wrap { height: 6px; background: var(--bg-deep); border-radius: 3px; overflow: hidden; }
.xp-bar { height: 100%; background: linear-gradient(to right, var(--purple), #a78bfa); transition: width 0.4s; }
.xp-hint { margin-top: 0.3rem; font-size: 0.74rem; color: var(--text-muted); text-align: right; }

/* Tabs */
.tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  margin-bottom: 0.75rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--bg-deep);
  border-color: var(--gold);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.tab-edit-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -0.25rem;
}
.edit-icon-btn {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  border-radius: 999px;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.edit-icon-btn:hover {
  border-color: var(--gold-dark);
  color: var(--gold-light);
}
.edit-icon-btn svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

.mb-4 {
  margin-bottom: 0 !important;
}

/* Skills */
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.prof-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--text-dim);
  flex-shrink: 0;
  transition: all 0.2s;
}

.prof-dot.filled {
  background: var(--gold);
  border-color: var(--gold);
}

.prof-dot.expertise {
  background: var(--gold-light);
  border-color: var(--gold-light);
  box-shadow: 0 0 4px var(--gold-light);
}

.skill-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.skill-attr {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.skill-bonus {
  font-family: var(--font-title);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--gold-light);
  min-width: 2rem;
  text-align: right;
}

/* Attacks */
.attacks-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.attack-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.atk-name {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.atk-dmg {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Spells */
.spell-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.spell-meta-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
}

.smb-val {
  font-family: var(--font-title);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--gold-light);
}

.smb-lbl {
  font-size: 0.6rem;
  font-family: var(--font-title);
  color: var(--text-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.spell-level-block {
  margin-bottom: 0.6rem;
}

.spell-level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.spell-level-name {
  font-family: var(--font-title);
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.slots-indicator {
  display: flex;
  gap: 3px;
}

.slot-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--purple);
  opacity: 0.9;
}

.slot-pip.used {
  background: var(--bg-deep);
  border: 1px solid var(--purple);
  opacity: 0.5;
}

.spell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.spell-tag {
  font-size: 0.78rem;
  padding: 0.15rem 0.5rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid var(--purple);
  border-radius: 999px;
  color: #a78bfa;
}

/* Coins */
.coins-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
}

.coin-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.15rem;
}

.coin-icon {
  font-size: 1rem;
  line-height: 1;
}

.coin-val {
  font-family: var(--font-title);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.coin-lbl {
  font-size: 0.55rem;
  color: var(--text-muted);
  font-family: var(--font-title);
}

/* Equipment */
.equip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--bg-deep);
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.equip-qty {
  color: var(--text-muted);
  font-size: 0.78rem;
}

/* Traits */
.trait-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.trait-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.6rem;
}

.trait-lbl {
  font-family: var(--font-title);
  font-size: 0.65rem;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.2rem;
}

.trait-val {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Appearance */
.appear-grid {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.appear-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  padding: 0.15rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.appear-lbl {
  font-family: var(--font-title);
  color: var(--text-muted);
  font-size: 0.78rem;
  min-width: 4rem;
}

.appear-val {
  color: var(--text-secondary);
}

/* Features */
.feat-block {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.feat-name {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--gold-light);
  margin-bottom: 0.2rem;
}

.feat-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.lang-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

@media (max-width: 760px) {
  .full-header {
    flex-wrap: wrap;
  }
  .full-title {
    order: 3;
    width: 100%;
    text-align: left;
  }
  .attack-row {
    grid-template-columns: 1fr auto;
    gap: 0.35rem;
  }
  .atk-dmg,
  .atk-type {
    grid-column: 1 / -1;
  }
  .spell-meta {
    grid-template-columns: 1fr;
  }
  .coins-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .trait-grid {
    grid-template-columns: 1fr;
  }
  .combat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .row-2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 980px) {
  .full-view {
    display: grid;
    grid-template-columns: minmax(9rem, 12rem) minmax(0, 1fr);
    grid-template-areas:
      "header header"
      "tabs content";
    column-gap: 1rem;
    align-items: start;
  }
  .full-header {
    grid-area: header;
    margin-bottom: 0.25rem;
  }
  .tabs {
    grid-area: tabs;
    flex-direction: column;
    overflow: visible;
    position: sticky;
    top: 5.5rem;
    gap: 0.35rem;
  }
  .tab-btn {
    width: 100%;
    text-align: left;
    text-transform: none;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    padding: 0.5rem 0.7rem;
  }
  .tab-content {
    grid-area: content;
  }
  .coins-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    max-width: 34rem;
  }
}
</style>
