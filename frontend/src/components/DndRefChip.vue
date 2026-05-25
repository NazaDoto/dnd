<template>
  <div class="dnd-ref" :class="{ open: expanded, 'dnd-ref--inline': inline }">
    <button type="button" class="dnd-ref-head" @click="toggle">
      <span class="dnd-ref-name">{{ name }}</span>
      <span v-if="loading" class="dnd-ref-meta">…</span>
      <span v-else-if="entry?.summary" class="dnd-ref-meta">{{ entry.summary }}</span>
      <span v-else-if="extra" class="dnd-ref-meta">{{ extra }}</span>
      <span class="dnd-ref-chevron" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
    </button>
    <div v-if="expanded" class="dnd-ref-body">
      <p v-if="loading" class="dnd-ref-muted">Buscando en SRD…</p>
      <template v-else-if="entry">
        <p v-if="entry.type === 'spell'" class="dnd-ref-line">
          <strong>{{ entry.level }}</strong>
          <span v-if="entry.school"> · {{ entry.school }}</span>
        </p>
        <p v-if="entry.type === 'spell'" class="dnd-ref-line">
          <span v-if="entry.casting_time">{{ entry.casting_time }}</span>
          <span v-if="entry.range"> · {{ entry.range }}</span>
          <span v-if="entry.duration"> · {{ entry.duration }}</span>
        </p>
        <p v-if="entry.type === 'spell' && entry.components" class="dnd-ref-line">
          Componentes: {{ entry.components }}
          <span v-if="entry.concentration"> · Concentración</span>
          <span v-if="entry.ritual"> · Ritual</span>
        </p>
        <p v-if="entry.type === 'weapon'" class="dnd-ref-line">
          <strong>{{ entry.damage_dice }}</strong>
          <span v-if="entry.damage_type"> {{ formatDamageType(entry.damage_type) }}</span>
          <span v-if="entry.category"> · {{ entry.category }}</span>
        </p>
        <p v-if="entry.type === 'weapon' && entry.properties?.length" class="dnd-ref-line">
          {{ entry.properties.join(' · ') }}
        </p>
        <p v-if="entry.desc" class="dnd-ref-desc">{{ entry.desc }}</p>
        <p v-if="entry.higher_level" class="dnd-ref-higher">
          <strong>A mayor nivel:</strong> {{ entry.higher_level }}
        </p>
      </template>
      <p v-else class="dnd-ref-muted">No encontrado en SRD oficial. Podés usar nombre en inglés (ej. Fire Bolt).</p>
    </div>
  </div>
</template>

<script>
import { lookupEntry, formatDamageType } from '../services/srdLookup.js'

export default {
  name: 'DndRefChip',
  props: {
    name: { type: String, required: true },
    extra: { type: String, default: '' },
    inline: { type: Boolean, default: true },
    defaultOpen: { type: Boolean, default: false }
  },
  data() {
    return {
      expanded: this.defaultOpen,
      loading: false,
      entry: null
    }
  },
  watch: {
    name: {
      immediate: true,
      handler() {
        this.entry = null
        if (this.expanded) this.load()
      }
    }
  },
  methods: {
    formatDamageType,
    toggle() {
      this.expanded = !this.expanded
      if (this.expanded && !this.entry && !this.loading) this.load()
    },
    async load() {
      if (!this.name?.trim()) return
      this.loading = true
      try {
        this.entry = await lookupEntry(this.name)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.dnd-ref {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  overflow: hidden;
}
.dnd-ref--inline {
  display: inline-block;
  max-width: 100%;
  vertical-align: top;
}
.dnd-ref-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.35rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  font-size: 0.82rem;
}
.dnd-ref-name {
  font-family: var(--font-title);
  color: var(--gold-light);
}
.dnd-ref-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  flex: 1;
  min-width: 0;
}
.dnd-ref-chevron {
  color: var(--text-dim);
  font-size: 0.65rem;
}
.dnd-ref-body {
  padding: 0.45rem 0.55rem 0.55rem;
  border-top: 1px solid var(--border);
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-secondary);
}
.dnd-ref-line { margin: 0 0 0.25rem; }
.dnd-ref-desc {
  margin: 0.35rem 0 0;
  white-space: pre-line;
}
.dnd-ref-higher { margin: 0.35rem 0 0; color: var(--text-muted); }
.dnd-ref-muted { margin: 0; color: var(--text-dim); font-size: 0.75rem; }
</style>
