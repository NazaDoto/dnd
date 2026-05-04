<template>
  <div class="detail-view" v-if="character">
    <!-- Header con foto -->
    <div class="detail-hero">
      <button class="btn btn-ghost btn-icon back-btn" @click="$router.back()">‹</button>

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
          · {{ classLabel }} Nv.{{ character.level }}
        </p>
        <p class="hero-bg" v-if="character.background">
          {{ character.background }} · {{ character.alignment }}
        </p>
      </div>
    </div>

    <!-- HP Bar -->
    <div class="hp-section card">
      <div class="hp-header">
        <span class="section-title" style="margin: 0; border: none; padding: 0">
          Puntos de Vida
        </span>

        <div class="hp-controls">
          <button class="btn btn-secondary btn-icon" @click="adjustHP(-1)">−</button>

          <span class="hp-display">
            <span :class="['hp-current', hpClass]">
              {{ character.hit_points_current }}
            </span>
            <span class="hp-sep">/</span>
            <span class="hp-max">{{ character.hit_points_max }}</span>
          </span>

          <button class="btn btn-secondary btn-icon" @click="adjustHP(+1)">＋</button>
        </div>
      </div>

      <div class="hp-bar-wrap">
        <div
          class="hp-bar"
          :style="{ width: hpPct + '%' }"
          :class="hpClass"
        ></div>
      </div>

      <div v-if="character.hit_points_temp > 0" class="hp-temp">
        ✨ +{{ character.hit_points_temp }} PV temporales
      </div>
    </div>

    <!-- Combat stats rápidos -->
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

    <!-- Combate detallado -->
    <div class="card detail-section">
      <p class="section-title">Combate</p>

      <div v-if="attacks.length" class="attacks-list">
        <div v-for="(atk, i) in attacks" :key="i" class="attack-row">
          <div class="attack-main">
            <span class="attack-name">
              {{ atk.name || 'Ataque ' + (i + 1) }}
            </span>
            <span v-if="atk.type" class="attack-type">{{ atk.type }}</span>
          </div>

          <span class="attack-bonus badge badge-gold">
            {{ atk.bonus || '+0' }}
          </span>

          <span class="attack-damage">
            {{ atk.damage || '—' }}
          </span>
        </div>
      </div>

      <p v-else class="empty-text">Sin ataques registrados.</p>

      <div
        v-if="character.spellcasting_ability || character.spell_save_dc || character.spell_attack_bonus"
        class="spell-summary"
      >
        <div class="spell-box">
          <span class="spell-val">{{ character.spell_save_dc || '—' }}</span>
          <span class="spell-lbl">CD</span>
        </div>

        <div class="spell-box">
          <span class="spell-val">
            {{ character.spell_attack_bonus ? '+' + character.spell_attack_bonus : '—' }}
          </span>
          <span class="spell-lbl">Ataque</span>
        </div>

        <div class="spell-box">
          <span class="spell-val small">{{ abilityLabel }}</span>
          <span class="spell-lbl">Conjuro</span>
        </div>
      </div>

      <div v-if="visibleSpellBlocks.length" class="spell-list">
        <div
          v-for="block in visibleSpellBlocks"
          :key="block.key"
          class="spell-block"
        >
          <div class="spell-block-head">
            <span class="spell-block-title">{{ block.label }}</span>

            <span v-if="block.showSlots" class="spell-slots-label">
              Slots {{ block.slotsUsed }}/{{ block.slots }}
            </span>
          </div>

          <div class="spell-tags">
            <span
              v-for="spell in block.spells"
              :key="spell"
              class="spell-tag"
            >
              {{ spell }}
            </span>
          </div>
        </div>
      </div>

      <p v-else-if="character.spellcasting_ability" class="empty-text spell-empty">
        Sin conjuros cargados.
      </p>
    </div>

    <!-- Equipamiento -->
    <div class="card detail-section">
      <div class="section-head">
        <p class="section-title" style="margin: 0; border: none; padding: 0">
          Equipamiento
        </p>
      </div>

      <div class="coins-row">
        <div v-for="coin in coins" :key="coin.key" class="coin-pill">
          <span class="coin-icon">{{ coin.icon }}</span>
          <span class="coin-value">{{ character[coin.key] || 0 }}</span>
          <span class="coin-label">{{ coin.label }}</span>
        </div>
      </div>

      <div v-if="equipment.length" class="equipment-list">
        <div v-for="(item, i) in equipment" :key="i" class="equipment-row">
          <span class="equipment-name">
            {{ typeof item === 'string' ? item : item.name }}
          </span>

          <span v-if="typeof item === 'object' && item.qty" class="equipment-qty">
            x{{ item.qty }}
          </span>
        </div>
      </div>

      <p v-else class="empty-text">Sin equipo registrado.</p>

      <p v-if="character.treasure" class="treasure-text">
        {{ character.treasure }}
      </p>
    </div>

    <!-- Competencias rápidas -->
    <div v-if="languages.length || otherProfs.length" class="card detail-section">
      <p class="section-title">Idiomas & competencias</p>

      <div class="tag-list">
        <span v-for="lang in languages" :key="lang" class="badge badge-blue">
          {{ lang }}
        </span>

        <span v-for="prof in otherProfs" :key="prof" class="badge badge-gold">
          {{ prof }}
        </span>
      </div>
    </div>

    <!-- Atributos -->
    <div class="card">
      <p class="section-title">Atributos</p>
      <StatsBlock :character="character" />
    </div>

    <!-- Inspiration + Percepción Pasiva -->
    <div class="row-2">
      <div class="card info-pill">
        <span class="pill-icon">{{ character.inspiration ? '✨' : '○' }}</span>
        <span class="pill-lbl">Inspiración</span>
      </div>

      <div class="card info-pill">
        <span class="pill-val">{{ character.passive_perception }}</span>
        <span class="pill-lbl">Perc. Pasiva</span>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="quick-actions">
      <RouterLink :to="`/character/${id}/full`" class="btn btn-primary quick-btn">
        📜 Ficha completa
      </RouterLink>

      <RouterLink :to="`/character/${id}/notes`" class="btn btn-secondary quick-btn">
        📝 Notas
      </RouterLink>

      <RouterLink :to="`/character/${id}/edit`" class="btn btn-ghost quick-btn">
        ✏️ Editar
      </RouterLink>
    </div>

    <!-- XP -->
    <div class="card xp-section">
      <div class="xp-header">
        <span class="section-title" style="margin: 0; border: none; padding: 0">
          Experiencia
        </span>
        <span class="badge badge-gold">{{ character.experience_points }} XP</span>
      </div>

      <div class="xp-bar-wrap">
        <div class="xp-bar" :style="{ width: xpPct + '%' }"></div>
      </div>

      <p class="xp-hint">{{ xpLabel }}</p>
    </div>
  </div>

  <div v-else class="loading-screen">
    <div class="spinner"></div>
    <span>Cargando personaje...</span>
  </div>
</template>

<script>
import StatsBlock from '../components/StatsBlock.vue'
import { charactersAPI } from '../services/api.js'
import {
  CLASSES,
  XP_BY_LEVEL,
  SPELLCASTING_ABILITIES,
  formatModifier
} from '../services/dndData.js'

export default {
  name: 'CharacterDetailView',
  components: { StatsBlock },
  inject: ['showToast'],
  data() {
    return {
      character: null
    }
  },
  computed: {
    id() {
      return this.$route.params.id
    },

    classLabel() {
      const cls = CLASSES.find(c => c.value === this.character?.class)
      return cls ? cls.label : this.character?.class
    },

    hpPct() {
      if (!this.character) return 0

      const max = this.character.hit_points_max || 1

      return Math.max(
        0,
        Math.min(100, (this.character.hit_points_current / max) * 100)
      )
    },

    hpClass() {
      const p = this.hpPct

      if (p > 50) return 'ok'
      if (p > 25) return 'warn'
      return 'danger'
    },

    xpPct() {
      const lvl = this.character?.level || 1
      const cur = this.character?.experience_points || 0
      const base = XP_BY_LEVEL[lvl - 1] || 0
      const next = XP_BY_LEVEL[lvl] || base

      if (!next || next === base) return 100

      return Math.min(100, ((cur - base) / (next - base)) * 100)
    },

    xpLabel() {
      const lvl = this.character?.level || 1

      if (lvl >= 20) return 'Nivel máximo alcanzado'

      const next = XP_BY_LEVEL[lvl] || 0
      const rem = next - (this.character?.experience_points || 0)

      return rem > 0 ? `${rem} XP para nivel ${lvl + 1}` : '¡Listo para subir!'
    },

    attacks() {
      return Array.isArray(this.character?.attacks_spellcasting)
        ? this.character.attacks_spellcasting
        : []
    },

    equipment() {
      return Array.isArray(this.character?.equipment)
        ? this.character.equipment
        : []
    },

    languages() {
      return Array.isArray(this.character?.languages)
        ? this.character.languages
        : []
    },

    otherProfs() {
      return Array.isArray(this.character?.other_proficiencies)
        ? this.character.other_proficiencies
        : []
    },

    abilityLabel() {
      const ability = SPELLCASTING_ABILITIES.find(
        a => a.value === this.character?.spellcasting_ability
      )

      return ability ? ability.label : '—'
    },

    coins() {
      return [
        { key: 'copper_pieces', label: 'PC', icon: '🟤' },
        { key: 'silver_pieces', label: 'PP', icon: '⚪' },
        { key: 'electrum_pieces', label: 'PE', icon: '🔵' },
        { key: 'gold_pieces', label: 'PO', icon: '🟡' },
        { key: 'platinum_pieces', label: 'PPl', icon: '⬜' }
      ]
    },

    normalizedSpells() {
      return this.normalizeSpells(this.character?.spells)
    },

    visibleSpellBlocks() {
      const spells = this.normalizedSpells
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
    }
  },
  async mounted() {
    try {
      const { data } = await charactersAPI.getFull(this.id)
      this.character = data
    } catch {
      this.showToast('Error al cargar personaje', 'error')
      this.$router.push('/home')
    }
  },
  methods: {
    fmtMod(v) {
      return formatModifier(v)
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
        level9: { slots: 0, slots_used: 0, spells: [] }
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

    async adjustHP(delta) {
      const c = this.character

      c.hit_points_current = Math.max(
        0,
        Math.min(c.hit_points_max, c.hit_points_current + delta)
      )

      try {
        const fd = new FormData()

        Object.keys(c).forEach(k => {
          if (c[k] !== null && c[k] !== undefined) {
            fd.append(k, typeof c[k] === 'object' ? JSON.stringify(c[k]) : c[k])
          }
        })

        await charactersAPI.update(this.id, fd)
      } catch {
        /* silencioso */
      }
    }
  }
}
</script>

<style scoped>
.detail-hero {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  position: relative;
}

.back-btn {
  font-size: 1.8rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-top: -0.1rem;
}

.hero-img,
.hero-placeholder {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  border: 2px solid var(--gold-dark);
  flex-shrink: 0;
}

.hero-img {
  object-fit: cover;
}

.hero-placeholder {
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.6rem;
  color: var(--gold);
}

.hero-name {
  font-family: var(--font-title);
  font-size: 1.2rem;
  color: var(--text-primary);
}

.hero-meta {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}

.hero-bg {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}

/* HP */
.hp-section {
  margin-bottom: 0.65rem;
}

.hp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.hp-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.hp-display {
  font-family: var(--font-title);
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
}

.hp-current {
  font-size: 1.4rem;
  font-weight: 700;
}

.hp-current.ok {
  color: #4ade80;
}

.hp-current.warn {
  color: #fbbf24;
}

.hp-current.danger {
  color: #f87171;
}

.hp-sep {
  color: var(--text-dim);
}

.hp-max {
  font-size: 1rem;
  color: var(--text-muted);
}

.hp-bar-wrap {
  height: 8px;
  background: var(--bg-deep);
  border-radius: 4px;
  overflow: hidden;
}

.hp-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.hp-bar.ok {
  background: linear-gradient(to right, var(--green), #4ade80);
}

.hp-bar.warn {
  background: linear-gradient(to right, #ca8a04, #fbbf24);
}

.hp-bar.danger {
  background: linear-gradient(to right, var(--red), var(--red-light));
}

.hp-temp {
  font-size: 0.75rem;
  color: #a78bfa;
  margin-top: 0.35rem;
  text-align: center;
}

/* Combat row */
.combat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.combat-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.25rem;
}

.cbox-val {
  font-family: var(--font-title);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--gold-light);
}

.cbox-lbl {
  font-size: 0.55rem;
  font-family: var(--font-title);
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
}

.detail-section {
  margin-bottom: 0.65rem;
}

/* Combate detallado */
.attacks-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attack-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.attack-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attack-name {
  font-size: 0.88rem;
  color: var(--text-primary);
  font-weight: 600;
}

.attack-type {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.05rem;
}

.attack-bonus {
  font-size: 0.72rem;
  white-space: nowrap;
}

.attack-damage {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* Magia rápida */
.spell-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.spell-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spell-val {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 700;
  color: var(--gold-light);
  text-align: center;
}

.spell-val.small {
  font-size: 0.75rem;
}

.spell-lbl {
  font-family: var(--font-title);
  font-size: 0.55rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 0.1rem;
}

/* Spells */
.spell-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.spell-block {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.55rem;
}

.spell-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.spell-block-title {
  font-family: var(--font-title);
  font-size: 0.78rem;
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.spell-slots-label {
  font-family: var(--font-title);
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.spell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.spell-tag {
  font-size: 0.78rem;
  padding: 0.18rem 0.55rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid var(--purple);
  border-radius: 999px;
  color: #a78bfa;
}

.spell-empty {
  margin-top: 0.6rem;
}

/* Equipamiento */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.45rem;
}

.coins-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}

.coin-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.15rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.coin-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.coin-value {
  font-family: var(--font-title);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.coin-label {
  font-family: var(--font-title);
  font-size: 0.52rem;
  color: var(--text-muted);
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.equipment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.equipment-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.equipment-qty {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.treasure-text {
  margin-top: 0.6rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: pre-line;
  line-height: 1.5;
  padding-top: 0.5rem;
  border-top: 1px solid var(--bg-deep);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.empty-text {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Row 2 */
.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}

.info-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem;
}

.pill-icon {
  font-size: 1.5rem;
}

.pill-val {
  font-family: var(--font-title);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--gold-light);
}

.pill-lbl {
  font-size: 0.65rem;
  font-family: var(--font-title);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Quick actions */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.quick-btn {
  font-size: 0.8rem;
  padding: 0.6rem 0.5rem;
}

/* XP */
.xp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.xp-bar-wrap {
  height: 6px;
  background: var(--bg-deep);
  border-radius: 3px;
  overflow: hidden;
}

.xp-bar {
  height: 100%;
  background: linear-gradient(to right, var(--purple), #a78bfa);
  border-radius: 3px;
  transition: width 0.5s;
}

.xp-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.3rem;
  text-align: right;
}

@media (max-width: 420px) {
  .coins-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .spell-summary {
    grid-template-columns: 1fr;
  }

  .attack-row {
    grid-template-columns: 1fr auto;
  }

  .attack-damage {
    grid-column: 1 / -1;
  }
}
</style>