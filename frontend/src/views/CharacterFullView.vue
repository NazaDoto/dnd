<template>
  <div class="full-view" v-if="character">
    <div class="full-top-sticky">
    <div class="full-header">
      <button type="button" class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <div class="full-header-main">
        <h2 class="full-title">{{ character.name }}</h2>
        <p class="hero-meta">
          {{ character.race }}
          <span v-if="character.subrace"> ({{ character.subrace }})</span>
          · {{ character.class }} Nv.{{ character.level }}
        </p>
        <div class="quick-state-grid">
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">PV</span>
            <span class="state-val">{{ character.hit_points_current }}/{{ character.hit_points_max }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">CA</span>
            <span class="state-val">{{ character.armor_class ?? '-' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">Ini</span>
            <span class="state-val">{{ fmtMod(character.initiative) }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">Vel</span>
            <span class="state-val">{{ character.speed }}ft</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">Prof</span>
            <span class="state-val">{{ fmtMod(character.proficiency_bonus) }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('skills')">
            <span class="state-key">Insp</span>
            <span class="state-val">{{ character.inspiration ? 'Si' : 'No' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('skills')">
            <span class="state-key">P. Pasiva</span>
            <span class="state-val">{{ character.passive_perception ?? '-' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startInlineEdit('combat')">
            <span class="state-key">XP</span>
            <span class="state-val">{{ character.experience_points || 0 }}</span>
          </button>
        </div>
      </div>
      <div class="full-header-actions">
        <template v-if="isDmCampaignReader">
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

    <!-- Tabs -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>
    </div>

    <!-- ── PESTAÑA: Habilidades ── -->
    <div v-if="activeTab === 'skills'" class="tab-content">
      <div class="tab-edit-row" v-if="!isDmCampaignReader">
        <button v-if="editingTab !== 'skills'" type="button" class="edit-icon-btn" @click="startInlineEdit('skills')" title="Editar habilidades">
          Editar
        </button>
        <div v-else class="inline-actions">
          <button type="button" class="btn btn-primary" @click="saveInlineEdit('skills')">Guardar</button>
          <button type="button" class="btn btn-secondary" @click="cancelInlineEdit">Cancelar</button>
        </div>
      </div>
      <div v-if="editingTab === 'skills'" class="card inline-editor">
        <p class="section-title">Editar habilidades</p>
        <label class="form-label">Idiomas (separados por coma)</label>
        <input v-model="editDraft.languages_text" />
        <label class="form-label mt-2">Otras competencias (separadas por coma)</label>
        <input v-model="editDraft.other_proficiencies_text" />
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
        <button v-if="editingTab !== 'combat'" type="button" class="edit-icon-btn" @click="startInlineEdit('combat')" title="Editar combate">Editar</button>
        <div v-else class="inline-actions">
          <button type="button" class="btn btn-primary" @click="saveInlineEdit('combat')">Guardar</button>
          <button type="button" class="btn btn-secondary" @click="cancelInlineEdit">Cancelar</button>
        </div>
      </div>
      <div v-if="editingTab === 'combat'" class="card inline-editor">
        <p class="section-title">Editar combate</p>
        <div class="inline-grid">
          <input v-model.number="editDraft.hit_points_current" type="number" placeholder="PV actuales" />
          <input v-model.number="editDraft.hit_points_max" type="number" placeholder="PV maximos" />
          <input v-model.number="editDraft.hit_points_temp" type="number" placeholder="PV temp" />
          <input v-model.number="editDraft.armor_class" type="number" placeholder="CA" />
          <input v-model.number="editDraft.initiative" type="number" placeholder="Iniciativa" />
          <input v-model.number="editDraft.speed" type="number" placeholder="Velocidad" />
          <input v-model.number="editDraft.proficiency_bonus" type="number" placeholder="Prof" />
        </div>
        <label class="check-inline"><input v-model="editDraft.inspiration" type="checkbox" /> Inspiracion</label>
        <label class="form-label mt-2">Ataques (nombre|bonus|dano|tipo por linea)</label>
        <textarea v-model="editDraft.attacks_text" rows="4"></textarea>
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
          <button v-if="editingTab !== 'equipment'" type="button" class="edit-icon-btn" @click="startInlineEdit('equipment')" title="Editar equipo">Editar</button>
          <div v-else class="inline-actions">
            <button type="button" class="btn btn-primary" @click="saveInlineEdit('equipment')">Guardar</button>
            <button type="button" class="btn btn-secondary" @click="cancelInlineEdit">Cancelar</button>
          </div>
        </div>
        <div v-if="editingTab === 'equipment'" class="card inline-editor">
          <p class="section-title">Editar equipo</p>
          <div class="inline-grid">
            <input v-model.number="editDraft.copper_pieces" type="number" placeholder="PC" />
            <input v-model.number="editDraft.silver_pieces" type="number" placeholder="PP" />
            <input v-model.number="editDraft.electrum_pieces" type="number" placeholder="PE" />
            <input v-model.number="editDraft.gold_pieces" type="number" placeholder="PO" />
            <input v-model.number="editDraft.platinum_pieces" type="number" placeholder="PPl" />
          </div>
          <label class="form-label mt-2">Equipo (1 por linea)</label>
          <textarea v-model="editDraft.equipment_text" rows="4"></textarea>
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
          <button v-if="editingTab !== 'backstory'" type="button" class="edit-icon-btn" @click="startInlineEdit('backstory')" title="Editar trasfondo">Editar</button>
          <div v-else class="inline-actions">
            <button type="button" class="btn btn-primary" @click="saveInlineEdit('backstory')">Guardar</button>
            <button type="button" class="btn btn-secondary" @click="cancelInlineEdit">Cancelar</button>
          </div>
        </div>
        <div v-if="editingTab === 'backstory'" class="card inline-editor">
          <p class="section-title">Editar trasfondo</p>
          <textarea v-model="editDraft.backstory" rows="4" placeholder="Historia"></textarea>
          <textarea v-model="editDraft.personality_traits" rows="2" placeholder="Rasgos"></textarea>
          <textarea v-model="editDraft.ideals" rows="2" placeholder="Ideales"></textarea>
          <textarea v-model="editDraft.bonds" rows="2" placeholder="Vinculos"></textarea>
          <textarea v-model="editDraft.flaws" rows="2" placeholder="Defectos"></textarea>
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
          <button v-if="editingTab !== 'features'" type="button" class="edit-icon-btn" @click="startInlineEdit('features')" title="Editar rasgos">Editar</button>
          <div v-else class="inline-actions">
            <button type="button" class="btn btn-primary" @click="saveInlineEdit('features')">Guardar</button>
            <button type="button" class="btn btn-secondary" @click="cancelInlineEdit">Cancelar</button>
          </div>
        </div>
        <div v-if="editingTab === 'features'" class="card inline-editor">
          <p class="section-title">Editar rasgos</p>
          <label class="form-label">Un rasgo por linea</label>
          <textarea v-model="editDraft.features_text" rows="5"></textarea>
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
import {
  ATTRIBUTES,
  SKILLS,
  SPELLCASTING_ABILITIES,
  getModifier,
  formatModifier,
} from "../services/dndData.js";

export default {
  name: "CharacterFullView",
  components: { CharacterNotesPanel },
  inject: ["showToast"],
  data() {
    return {
      character: null,
      activeTab: "skills",
      editingTab: null,
      editDraft: {},
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
    startInlineEdit(section) {
      this.editingTab = section;
      const c = this.character || {};
      const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
      if (section === "skills") {
        this.editDraft = {
          saving_throws_prof: clone(c.saving_throws_prof) || [],
          skills_prof: clone(c.skills_prof) || [],
          skills_expertise: clone(c.skills_expertise) || [],
          languages_text: (Array.isArray(c.languages) ? c.languages : []).join(", "),
          other_proficiencies_text: (Array.isArray(c.other_proficiencies) ? c.other_proficiencies : []).join(", ")
        };
      } else if (section === "combat") {
        this.editDraft = {
          hit_points_current: Number(c.hit_points_current || 0),
          hit_points_max: Number(c.hit_points_max || 1),
          hit_points_temp: Number(c.hit_points_temp || 0),
          armor_class: Number(c.armor_class || 10),
          initiative: Number(c.initiative || 0),
          speed: Number(c.speed || 30),
          proficiency_bonus: Number(c.proficiency_bonus || 2),
          inspiration: Boolean(c.inspiration),
          attacks_text: (Array.isArray(c.attacks_spellcasting) ? c.attacks_spellcasting : [])
            .map(a => `${a.name || ""}|${a.bonus || ""}|${a.damage || ""}|${a.type || ""}`)
            .join("\n"),
          spellcasting_ability: c.spellcasting_ability || "",
          spell_save_dc: c.spell_save_dc ?? "",
          spell_attack_bonus: c.spell_attack_bonus ?? ""
        };
      } else if (section === "equipment") {
        this.editDraft = {
          copper_pieces: Number(c.copper_pieces || 0),
          silver_pieces: Number(c.silver_pieces || 0),
          electrum_pieces: Number(c.electrum_pieces || 0),
          gold_pieces: Number(c.gold_pieces || 0),
          platinum_pieces: Number(c.platinum_pieces || 0),
          equipment_text: (Array.isArray(c.equipment) ? c.equipment : []).map(i => (typeof i === "string" ? i : i?.name || "")).filter(Boolean).join("\n"),
          treasure: c.treasure || ""
        };
      } else if (section === "backstory") {
        this.editDraft = {
          personality_traits: c.personality_traits || "",
          ideals: c.ideals || "",
          bonds: c.bonds || "",
          flaws: c.flaws || "",
          backstory: c.backstory || "",
          age: c.age || "",
          height: c.height || "",
          weight: c.weight || "",
          eyes: c.eyes || "",
          skin: c.skin || "",
          hair: c.hair || "",
          appearance_notes: c.appearance_notes || "",
          faction: c.faction || "",
          allies_organizations: c.allies_organizations || ""
        };
      } else if (section === "features") {
        this.editDraft = {
          features_text: (Array.isArray(c.features_traits) ? c.features_traits : [])
            .map(f => (typeof f === "string" ? f : f?.name || ""))
            .filter(Boolean)
            .join("\n")
        };
      }
    },
    cancelInlineEdit() {
      this.editingTab = null;
      this.editDraft = {};
    },
    toList(value) {
      return String(value || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
    },
    async persistCharacterPatch(patch) {
      const { data } = await charactersAPI.updateFields(this.id, patch);
      this.character = data?.character || { ...this.character, ...patch };
    },
    async saveInlineEdit(section) {
      try {
        if (section === "skills") {
          await this.persistCharacterPatch({
            saving_throws_prof: this.editDraft.saving_throws_prof || [],
            skills_prof: this.editDraft.skills_prof || [],
            skills_expertise: this.editDraft.skills_expertise || [],
            languages: this.toList(this.editDraft.languages_text),
            other_proficiencies: this.toList(this.editDraft.other_proficiencies_text)
          });
        } else if (section === "combat") {
          const attacks = String(this.editDraft.attacks_text || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [name = "", bonus = "", damage = "", type = ""] = line.split("|");
              return { name: name.trim(), bonus: bonus.trim(), damage: damage.trim(), type: type.trim() };
            });
          await this.persistCharacterPatch({
            hit_points_current: Number(this.editDraft.hit_points_current || 0),
            hit_points_max: Math.max(1, Number(this.editDraft.hit_points_max || 1)),
            hit_points_temp: Number(this.editDraft.hit_points_temp || 0),
            armor_class: Number(this.editDraft.armor_class || 0),
            initiative: Number(this.editDraft.initiative || 0),
            speed: Number(this.editDraft.speed || 0),
            proficiency_bonus: Number(this.editDraft.proficiency_bonus || 2),
            inspiration: Boolean(this.editDraft.inspiration),
            attacks_spellcasting: attacks,
            spellcasting_ability: this.editDraft.spellcasting_ability || "",
            spell_save_dc: this.editDraft.spell_save_dc === "" ? null : Number(this.editDraft.spell_save_dc),
            spell_attack_bonus: this.editDraft.spell_attack_bonus === "" ? null : Number(this.editDraft.spell_attack_bonus)
          });
        } else if (section === "equipment") {
          await this.persistCharacterPatch({
            copper_pieces: Number(this.editDraft.copper_pieces || 0),
            silver_pieces: Number(this.editDraft.silver_pieces || 0),
            electrum_pieces: Number(this.editDraft.electrum_pieces || 0),
            gold_pieces: Number(this.editDraft.gold_pieces || 0),
            platinum_pieces: Number(this.editDraft.platinum_pieces || 0),
            equipment: String(this.editDraft.equipment_text || "").split("\n").map(v => v.trim()).filter(Boolean),
            treasure: this.editDraft.treasure || ""
          });
        } else if (section === "backstory") {
          await this.persistCharacterPatch({ ...this.editDraft });
        } else if (section === "features") {
          const features = String(this.editDraft.features_text || "")
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .map(name => ({ name, description: "" }));
          await this.persistCharacterPatch({ features_traits: features });
        }
        this.showToast("Seccion actualizada", "success");
        this.cancelInlineEdit();
      } catch {
        this.showToast("No se pudo guardar la seccion", "error");
      }
    },
    fmtMod(v) {
      return formatModifier(v);
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
  margin-bottom: 0.6rem;
  gap: 0.5rem;
}
.full-top-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--bg-deep);
  padding-bottom: 0.5rem;
  margin-bottom: 0.55rem;
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
  text-align: left;
}
.full-header-main {
  flex: 1;
  min-width: 0;
}
.hero-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
  margin-bottom: 0.55rem;
}
.quick-state-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}
.state-pill {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  min-height: 2.4rem;
  padding: 0.3rem 0.45rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  cursor: pointer;
}
.state-pill:hover {
  border-color: var(--gold-dark);
  color: var(--gold-light);
}
.state-key {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.state-val {
  font-family: var(--font-title);
  font-size: 0.82rem;
  line-height: 1.15;
}

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
.inline-actions {
  display: flex;
  gap: 0.4rem;
}
.inline-editor {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.inline-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}
.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
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
  .full-header-main {
    order: 3;
    width: 100%;
  }
  .quick-state-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .inline-grid { grid-template-columns: 1fr; }
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
}

@media (min-width: 980px) {
  .full-top-sticky { top: 0; }
  .tabs { gap: 0.4rem; }
  .tab-btn {
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    padding: 0.5rem 0.7rem;
  }
  .coins-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    max-width: 34rem;
  }
}
</style>
