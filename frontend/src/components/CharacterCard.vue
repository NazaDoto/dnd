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
      <div class="char-name-row">
        <h3 class="char-name">{{ character.name }}</h3>
        <span v-if="character.linked_campaign_name" class="campaign-pill">
          {{ character.linked_campaign_name }}
        </span>
      </div>
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
import { CLASSES } from "../services/dndData.js";
import { charactersAPI } from "../services/api.js";
import { exportCharacterPdfWithOption } from "../services/pdfExport.js";

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
    getCharacterId() {
      return (
        this.character.id ||
        this.character.character_id ||
        this.character.characterId
      );
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
        await exportCharacterPdfWithOption(data);
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

.char-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.campaign-pill {
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--purple);
  background: rgba(124, 58, 237, 0.14);
  color: #c4b5fd;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.62rem;
  font-family: var(--font-title);
  letter-spacing: 0.04em;
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