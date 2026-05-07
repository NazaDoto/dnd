<template>
  <div class="it-overlay" role="dialog" aria-modal="true" aria-label="Tracker de iniciativa" @click.self="$emit('close')">
    <div class="it-panel card">
      <header class="it-head">
        <div>
          <h2 class="it-title">Combate · Iniciativa</h2>
          <p class="it-sub" v-if="enc.active">
            Ronda <strong>{{ enc.round }}</strong> · Turno {{ enc.turnIndex + 1 }} / {{ enc.combatants.length }}
          </p>
          <p class="it-sub" v-else>{{ enc.combatants.length }} combatiente(s) preparados</p>
        </div>
        <div class="it-head-actions">
          <button v-if="!enc.active" type="button" class="btn btn-primary" :disabled="!enc.combatants.length" @click="onStart">
            Iniciar combate
          </button>
          <template v-else>
            <button type="button" class="btn btn-ghost btn-icon" aria-label="Turno anterior" @click="store.previousTurn()">‹</button>
            <button type="button" class="btn btn-primary" @click="store.nextTurn()">Próximo turno ›</button>
            <button type="button" class="btn btn-danger" @click="store.endCombat()">Terminar</button>
          </template>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar" @click="$emit('close')">✕</button>
        </div>
      </header>

      <section class="it-section">
        <p class="section-title">Agregar combatientes</p>
        <div class="it-add-grid">
          <input v-model.trim="form.name" placeholder="Nombre (Goblin, Lobo, NPC...)" />
          <input v-model.number="form.dexterity" type="number" placeholder="DEX" min="1" max="30" />
          <input v-model.number="form.ac" type="number" placeholder="CA" min="0" />
          <input v-model.number="form.hp_max" type="number" placeholder="PV máx" min="0" />
          <input v-model.number="form.initiative" type="number" placeholder="Iniciativa (opcional)" />
          <button type="button" class="btn btn-secondary" @click="addMonster">Agregar</button>
        </div>
        <div v-if="rosterCharacters && rosterCharacters.length" class="it-add-pcs">
          <p class="hint" style="margin-top:0.25rem">PJs del roster:</p>
          <div class="it-pc-row">
            <button
              v-for="pc in rosterCharacters"
              :key="pc.id"
              type="button"
              class="dice-chip"
              :disabled="hasPc(pc.id)"
              @click="addPc(pc)"
            >
              {{ pc.name }} <span style="opacity:0.6">{{ pc.class || '' }} Nv.{{ pc.level || 1 }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="it-section">
        <div class="it-list-head">
          <p class="section-title" style="margin:0;border:none;padding:0">Orden de iniciativa</p>
          <div class="it-list-actions">
            <button type="button" class="btn btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.6rem" @click="store.rollAllInitiative()">
              Tirar faltantes
            </button>
            <button type="button" class="btn btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.6rem" @click="confirmReset = true">
              Reiniciar
            </button>
          </div>
        </div>

        <p v-if="!enc.combatants.length" class="text-muted" style="font-size:0.85rem">
          Agregá combatientes para empezar.
        </p>

        <ul v-else class="it-list">
          <li
            v-for="(c, idx) in sortedCombatants"
            :key="c.id"
            :class="['it-row', kindClass(c), { 'is-active': enc.active && idx === enc.turnIndex, 'is-down': isDown(c) }]"
          >
            <div class="it-init">
              <input
                type="number"
                :value="c.initiative ?? ''"
                @change="updateInit(c.id, $event.target.value)"
                aria-label="Iniciativa"
              />
              <button type="button" class="btn btn-ghost btn-icon" aria-label="Tirar iniciativa" @click="store.rollInitiative(c.id)">🎲</button>
            </div>

            <div class="it-main">
              <div class="it-name-row">
                <span class="it-kind-pill" :title="c.kind === 'pc' ? 'Personaje jugador' : 'Monstruo / NPC'">
                  {{ c.kind === 'pc' ? 'PJ' : 'M' }}
                </span>
                <strong class="it-name">{{ c.name }}</strong>
                <span v-if="c.ac != null" class="badge badge-blue" title="Clase de armadura">CA {{ c.ac }}</span>
              </div>
              <div class="it-conditions">
                <button
                  v-for="cond in c.conditions"
                  :key="cond"
                  type="button"
                  class="cond-chip"
                  :title="conditionDesc(cond)"
                  @click="store.toggleCondition(c.id, cond)"
                >
                  {{ conditionLabel(cond) }} ✕
                </button>
                <button
                  type="button"
                  class="cond-chip cond-add"
                  @click="openConditionPicker(c.id)"
                >
                  + condición
                </button>
              </div>
            </div>

            <div class="it-hp">
              <button type="button" class="btn btn-ghost btn-icon" aria-label="-1 PV" @click="store.adjustHp(c.id, -1)">-</button>
              <div class="it-hp-display">
                <input
                  type="number"
                  :value="c.hp_current ?? ''"
                  @change="updateHpCurrent(c, $event.target.value)"
                  aria-label="PV actuales"
                />
                <span>/</span>
                <input
                  type="number"
                  :value="c.hp_max ?? ''"
                  @change="updateHpMax(c, $event.target.value)"
                  aria-label="PV máximos"
                />
              </div>
              <button type="button" class="btn btn-ghost btn-icon" aria-label="+1 PV" @click="store.adjustHp(c.id, 1)">+</button>
            </div>

            <button type="button" class="btn btn-ghost btn-icon it-remove" aria-label="Quitar combatiente" @click="store.removeCombatant(c.id)">🗑</button>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="picker.open" class="it-overlay" style="z-index:300" @click.self="picker.open = false">
      <div class="it-picker card">
        <div class="it-picker-head">
          <p class="section-title" style="margin:0;border:none;padding:0">Elegir condición</p>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar" @click="picker.open = false">✕</button>
        </div>
        <div class="it-picker-grid">
          <button
            v-for="cond in CONDITIONS"
            :key="cond.id"
            type="button"
            class="cond-chip"
            :title="cond.desc"
            @click="pickCondition(cond.id)"
          >
            {{ cond.label }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="confirmReset"
      title="¿Reiniciar combate?"
      message="Se eliminan todos los combatientes y la ronda actual."
      confirm-label="Reiniciar"
      danger
      @confirm="doReset"
      @cancel="confirmReset = false"
    />
  </div>
</template>

<script>
import { useInitiative } from '../stores/initiative.js'
import { CONDITIONS, CONDITIONS_BY_ID } from '../data/conditions.js'
import ConfirmDialog from './ConfirmDialog.vue'

export default {
  name: 'InitiativeTracker',
  components: { ConfirmDialog },
  emits: ['close'],
  props: {
    campaignId: { type: [String, Number], required: true },
    rosterCharacters: { type: Array, default: () => [] },
  },
  setup(props) {
    return { store: useInitiative(props.campaignId) }
  },
  data() {
    return {
      form: { name: '', dexterity: 10, ac: null, hp_max: null, initiative: null },
      picker: { open: false, combatantId: null },
      confirmReset: false,
      CONDITIONS,
    }
  },
  computed: {
    enc() {
      return this.store.encounter
    },
    sortedCombatants() {
      if (this.enc.active) return this.enc.combatants
      return [...this.enc.combatants].sort((a, b) => {
        const ai = Number(a.initiative ?? -Infinity)
        const bi = Number(b.initiative ?? -Infinity)
        if (bi !== ai) return bi - ai
        return Number(b.dexterity ?? 10) - Number(a.dexterity ?? 10)
      })
    }
  },
  methods: {
    kindClass(c) {
      return c.kind === 'pc' ? 'is-pc' : 'is-monster'
    },
    isDown(c) {
      return c.hp_current != null && c.hp_current <= 0
    },
    hasPc(charId) {
      return this.enc.combatants.some((c) => c.kind === 'pc' && c.characterId === charId)
    },
    addMonster() {
      if (!this.form.name) return
      this.store.addCombatant({
        kind: 'monster',
        name: this.form.name,
        dexterity: this.form.dexterity ?? 10,
        ac: this.form.ac ?? null,
        hp_max: this.form.hp_max ?? null,
        hp_current: this.form.hp_max ?? null,
        initiative: this.form.initiative ?? null,
      })
      this.form = { name: '', dexterity: 10, ac: null, hp_max: null, initiative: null }
    },
    addPc(pc) {
      this.store.addPlayerCharacter(pc)
    },
    onStart() {
      this.store.rollAllInitiative()
      this.store.startCombat()
    },
    updateInit(id, val) {
      const c = this.enc.combatants.find((x) => x.id === id)
      if (!c) return
      const n = parseInt(val, 10)
      c.initiative = Number.isNaN(n) ? null : n
    },
    updateHpCurrent(c, val) {
      const n = parseInt(val, 10)
      c.hp_current = Number.isNaN(n) ? null : n
    },
    updateHpMax(c, val) {
      const n = parseInt(val, 10)
      c.hp_max = Number.isNaN(n) ? null : n
    },
    openConditionPicker(combatantId) {
      this.picker.open = true
      this.picker.combatantId = combatantId
    },
    pickCondition(condId) {
      if (!this.picker.combatantId) return
      this.store.toggleCondition(this.picker.combatantId, condId)
      this.picker.open = false
      this.picker.combatantId = null
    },
    conditionLabel(id) { return CONDITIONS_BY_ID[id]?.label || id },
    conditionDesc(id) { return CONDITIONS_BY_ID[id]?.desc || '' },
    doReset() {
      this.store.reset()
      this.confirmReset = false
    },
  }
}
</script>

<style scoped>
.it-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 6, 3, 0.78);
  z-index: 150;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1rem;
  overflow: auto;
}
.it-panel {
  width: min(960px, 100%);
  margin: 1rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.it-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.it-title {
  font-family: var(--font-title);
  color: var(--text-primary);
  font-size: 1.1rem;
}
.it-sub { font-size: 0.85rem; color: var(--text-muted); }
.it-head-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }

.it-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}
.it-add-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;
}
.it-add-grid input { min-height: 2.4rem; }
@media (min-width: 640px) {
  .it-add-grid {
    grid-template-columns: 2fr repeat(4, 1fr) auto;
    align-items: center;
  }
}
.it-add-pcs { margin-top: 0.5rem; }
.it-pc-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }

.it-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.it-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.it-list-actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }

.it-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.it-row.is-active {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(240, 192, 64, 0.25);
}
.it-row.is-down {
  opacity: 0.55;
  background: rgba(185, 28, 28, 0.08);
}
.it-row.is-pc { border-left: 3px solid var(--gold-dark); }
.it-row.is-monster { border-left: 3px solid var(--purple); }

.it-init {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.it-init input {
  width: 3.2rem;
  text-align: center;
  font-family: var(--font-title);
  font-weight: 700;
}

.it-main { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.it-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.it-kind-pill {
  font-family: var(--font-title);
  font-size: 0.6rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  color: var(--text-secondary);
}
.it-name {
  color: var(--text-primary);
  font-family: var(--font-title);
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.it-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.cond-chip {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.7rem;
  font-family: var(--font-title);
  cursor: pointer;
}
.cond-chip:hover { border-color: var(--gold-dark); color: var(--gold-light); }
.cond-add { border-style: dashed; }

.it-hp {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.it-hp-display {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  color: var(--text-secondary);
  font-family: var(--font-title);
}
.it-hp-display input {
  width: 3rem;
  text-align: center;
}

.it-remove { color: var(--red-light); }

.it-picker {
  width: min(560px, 100%);
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.it-picker-head { display: flex; align-items: center; justify-content: space-between; }
.it-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.4rem;
}
</style>
