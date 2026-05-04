<template>
  <div class="stats-block">
    <div
      v-for="attr in ATTRIBUTES"
      :key="attr.key"
      class="stat-box"
    >
      <div class="stat-short">{{ attr.short }}</div>
      <div class="stat-mod">{{ formatMod(character[attr.key]) }}</div>
      <div class="stat-score">{{ character[attr.key] }}</div>
    </div>
  </div>
</template>

<script>
import { ATTRIBUTES, getModifier, formatModifier } from '../services/dndData.js'

export default {
  name: 'StatsBlock',
  props: {
    character: { type: Object, required: true }
  },
  data() {
    return { ATTRIBUTES }
  },
  methods: {
    formatMod(score) {
      return formatModifier(getModifier(score || 10))
    }
  }
}
</script>

<style scoped>
.stats-block {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.2rem;
  gap: 0.1rem;
}
.stat-short {
  font-family: var(--font-title);
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-transform: uppercase;
}
.stat-mod {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--gold-light);
  line-height: 1;
}
.stat-score {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.05rem 0.35rem;
  min-width: 1.6rem;
  text-align: center;
}
</style>