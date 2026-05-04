<template>
  <div class="char-card" @click="$emit('click')">
    <div class="char-avatar">
      <img v-if="character.photo_url" :src="character.photo_url" :alt="character.name" class="avatar-img" />
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
      <p class="char-bg" v-if="character.background">{{ character.background }}</p>
    </div>
    <div class="char-actions">
      <span class="action-arrow">›</span>
    </div>
  </div>
</template>

<script>
import { CLASSES } from '../services/dndData.js'

export default {
  name: 'CharacterCard',
  emits: ['click'],
  props: {
    character: { type: Object, required: true }
  },
  computed: {
    classLabel() {
      const cls = CLASSES.find(c => c.value === this.character.class)
      return cls ? cls.label : this.character.class
    },
    hpClass() {
      const pct = this.character.hit_points_current / this.character.hit_points_max
      if (pct > 0.5) return 'hp-ok'
      if (pct > 0.25) return 'hp-warn'
      return 'hp-danger'
    }
  }
}
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
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}
.char-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--gold-dark), var(--gold));
  opacity: 0;
  transition: opacity 0.2s;
}
.char-card:hover {
  border-color: var(--gold-dark);
  box-shadow: var(--shadow-gold);
}
.char-card:hover::before { opacity: 1; }
.char-card:active { transform: scale(0.99); }

.char-avatar { position: relative; flex-shrink: 0; }
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
  bottom: -4px; right: -4px;
  font-size: 0.6rem;
  font-family: var(--font-title);
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}
.hp-ok     { background: rgba(22,163,74,0.2);  color: #4ade80; border-color: var(--green); }
.hp-warn   { background: rgba(202,138,4,0.2);  color: #fbbf24; border-color: #ca8a04; }
.hp-danger { background: rgba(185,28,28,0.2);  color: #f87171; border-color: var(--red); }

.char-info { flex: 1; min-width: 0; }
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

.char-actions { flex-shrink: 0; }
.action-arrow {
  font-size: 1.5rem;
  color: var(--text-dim);
  line-height: 1;
}
</style>