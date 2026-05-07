<template>
  <div>
    <button
      type="button"
      class="dice-fab"
      :class="{ active: dice.state.open }"
      :aria-expanded="dice.state.open"
      aria-label="Abrir tirador de dados"
      title="Tirador de dados (D20)"
      @click="dice.toggle()"
    >
      <span class="dice-fab-icon" aria-hidden="true">🎲</span>
      <span class="dice-fab-last" v-if="dice.state.lastRoll">
        {{ dice.state.lastRoll.total }}
      </span>
    </button>

    <div v-if="dice.state.open" class="dice-panel" role="dialog" aria-label="Tirador de dados">
      <div class="dice-panel-head">
        <p class="dice-panel-title">Tirador de dados</p>
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar tirador" @click="dice.close()">✕</button>
      </div>

      <div class="dice-quick">
        <button
          v-for="d in QUICK_DICE"
          :key="d.label"
          type="button"
          class="dice-chip"
          :aria-label="`Tirar 1${d.label}`"
          @click="quickRoll(d.expr, `${d.label}`)"
        >
          {{ d.label }}
        </button>
      </div>

      <div class="dice-form">
        <div class="dice-row">
          <label class="form-label" for="dice-count">N</label>
          <input id="dice-count" v-model.number="count" type="number" min="1" max="20" />
          <span class="dice-x" aria-hidden="true">×</span>
          <label class="form-label" for="dice-sides">d</label>
          <select id="dice-sides" v-model.number="sides">
            <option v-for="s in SIDES" :key="s" :value="s">{{ s }}</option>
          </select>
          <label class="form-label" for="dice-mod">mod</label>
          <input id="dice-mod" v-model.number="mod" type="number" />
        </div>
        <div class="dice-mode">
          <label class="check-group">
            <input type="radio" v-model="mode" value="normal" />
            <span>Normal</span>
          </label>
          <label class="check-group">
            <input type="radio" v-model="mode" value="adv" :disabled="!isD20Single" />
            <span>Ventaja</span>
          </label>
          <label class="check-group">
            <input type="radio" v-model="mode" value="dis" :disabled="!isD20Single" />
            <span>Desventaja</span>
          </label>
        </div>
        <div class="dice-row">
          <input
            v-model="freeForm"
            placeholder="o escribí: 2d6+3, 1d20+5 adv, 4d6kh3..."
            aria-label="Expresión libre de tirada"
            @keydown.enter.prevent="rollFree"
          />
          <button type="button" class="btn btn-primary" @click="rollComposed">Tirar</button>
        </div>
      </div>

      <div v-if="dice.state.lastRoll" class="dice-result" :class="resultClass">
        <div class="dice-result-top">
          <span class="dice-result-total">{{ dice.state.lastRoll.total }}</span>
          <span class="dice-result-tag">
            <span v-if="dice.state.lastRoll.critical" class="tag tag-crit">¡Crítico!</span>
            <span v-else-if="dice.state.lastRoll.fumble" class="tag tag-fumble">Pifia</span>
            <span v-else-if="dice.state.lastRoll.advantage" class="tag tag-adv">Ventaja</span>
            <span v-else-if="dice.state.lastRoll.disadvantage" class="tag tag-dis">Desventaja</span>
          </span>
        </div>
        <p class="dice-result-expr">{{ dice.state.lastRoll.label || dice.state.lastRoll.expression }}</p>
        <p class="dice-result-detail">{{ describeBreakdown(dice.state.lastRoll.breakdown) }}</p>
      </div>

      <div class="dice-history">
        <div class="dice-history-head">
          <p class="section-title" style="margin:0;border:none;padding:0">Historial</p>
          <button v-if="dice.state.history.length" type="button" class="btn btn-ghost" style="padding:0.25rem 0.5rem;font-size:0.7rem" @click="dice.clearHistory()">Limpiar</button>
        </div>
        <ul v-if="dice.state.history.length" class="dice-history-list">
          <li v-for="entry in dice.state.history.slice(0, 12)" :key="entry.id" class="dice-history-row">
            <span class="dh-total">{{ entry.total }}</span>
            <span class="dh-expr">{{ entry.label || entry.expression }}</span>
            <span class="dh-time">{{ formatTime(entry.at) }}</span>
          </li>
        </ul>
        <p v-else class="text-muted" style="font-size:0.8rem">Sin tiradas todavía.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { useDice } from '../stores/dice.js'
import { QUICK_DICE, describeBreakdown } from '../services/dice.js'

const SIDES = [4, 6, 8, 10, 12, 20, 100]

export default {
  name: 'DiceRollerWidget',
  setup() {
    return { dice: useDice() }
  },
  data() {
    return {
      count: 1,
      sides: 20,
      mod: 0,
      mode: 'normal',
      freeForm: '',
      QUICK_DICE,
      SIDES,
      describeBreakdown,
    }
  },
  computed: {
    isD20Single() {
      return this.sides === 20 && this.count === 1
    },
    resultClass() {
      const r = this.dice.state.lastRoll
      if (!r) return ''
      if (r.critical) return 'is-critical'
      if (r.fumble) return 'is-fumble'
      return ''
    }
  },
  watch: {
    isD20Single(v) {
      if (!v && this.mode !== 'normal') this.mode = 'normal'
    }
  },
  methods: {
    formatTime(ts) {
      const d = new Date(ts)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    quickRoll(expr, label) {
      this.dice.roll(expr, label)
    },
    rollComposed() {
      const c = Math.max(1, Math.min(20, parseInt(this.count) || 1))
      const s = parseInt(this.sides) || 20
      const m = parseInt(this.mod) || 0
      let expr = `${c}d${s}`
      if (m > 0) expr += `+${m}`
      if (m < 0) expr += `${m}`
      const isD20 = s === 20 && c === 1
      if (isD20 && this.mode === 'adv') expr += ' adv'
      if (isD20 && this.mode === 'dis') expr += ' dis'
      this.dice.roll(expr)
    },
    rollFree() {
      const expr = (this.freeForm || '').trim()
      if (!expr) return
      const result = this.dice.roll(expr)
      if (!result) {
        return
      }
      this.freeForm = ''
    }
  }
}
</script>

<style scoped>
.dice-fab {
  position: fixed;
  right: 1rem;
  bottom: 5.5rem;
  z-index: 90;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 50%;
  border: 1px solid var(--gold-dark);
  background: linear-gradient(135deg, var(--bg-elevated), var(--bg-card));
  color: var(--gold-light);
  font-size: 1.4rem;
  cursor: pointer;
  box-shadow: var(--shadow), 0 0 22px rgba(212, 160, 23, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.dice-fab:hover { transform: translateY(-2px); border-color: var(--gold); }
.dice-fab.active {
  border-color: var(--gold);
  box-shadow: var(--shadow), 0 0 28px rgba(240, 192, 64, 0.4);
}
.dice-fab-icon { font-size: 1.4rem; line-height: 1; }
.dice-fab-last {
  font-family: var(--font-title);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  color: var(--gold-light);
  margin-top: 0.05rem;
}

@media (min-width: 1024px) {
  .dice-fab {
    bottom: 1.25rem;
  }
}

.dice-panel {
  position: fixed;
  right: 1rem;
  bottom: 9rem;
  z-index: 95;
  width: min(360px, calc(100vw - 2rem));
  max-height: min(75vh, 540px);
  overflow: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
@media (min-width: 1024px) {
  .dice-panel { bottom: 5rem; }
}

.dice-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dice-panel-title {
  font-family: var(--font-title);
  font-size: 0.95rem;
  color: var(--text-primary);
}

.dice-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.dice-chip {
  font-family: var(--font-title);
  font-size: 0.78rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.dice-chip:hover { border-color: var(--gold-dark); color: var(--gold-light); }

.dice-form { display: flex; flex-direction: column; gap: 0.45rem; }
.dice-row { display: flex; align-items: center; gap: 0.4rem; }
.dice-row input,
.dice-row select { flex: 1; min-height: 2.4rem; }
.dice-row input[type="number"] { max-width: 4rem; }
.dice-row select { max-width: 5rem; }
.dice-x { color: var(--text-muted); font-family: var(--font-title); }

.dice-mode {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.dice-result {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.65rem;
}
.dice-result.is-critical { border-color: var(--gold); box-shadow: 0 0 12px rgba(240, 192, 64, 0.35) inset; }
.dice-result.is-fumble { border-color: var(--red); }
.dice-result-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.dice-result-total {
  font-family: var(--font-display);
  font-size: 1.7rem;
  color: var(--gold-light);
  line-height: 1;
}
.tag {
  font-family: var(--font-title);
  font-size: 0.65rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tag-crit { background: rgba(240, 192, 64, 0.18); color: var(--gold-light); border: 1px solid var(--gold-dark); }
.tag-fumble { background: rgba(185, 28, 28, 0.18); color: var(--red-light); border: 1px solid var(--red); }
.tag-adv { background: rgba(22, 163, 74, 0.18); color: #4ade80; border: 1px solid var(--green); }
.tag-dis { background: rgba(124, 58, 237, 0.18); color: #c4b5fd; border: 1px solid var(--purple); }
.dice-result-expr {
  font-family: var(--font-title);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
.dice-result-detail {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
  word-break: break-word;
}

.dice-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}
.dice-history-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 11rem;
  overflow: auto;
}
.dice-history-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.55rem;
  font-size: 0.78rem;
}
.dh-total {
  font-family: var(--font-title);
  color: var(--gold-light);
  font-weight: 700;
  min-width: 1.6rem;
}
.dh-expr {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dh-time {
  color: var(--text-dim);
  font-size: 0.7rem;
}
</style>
