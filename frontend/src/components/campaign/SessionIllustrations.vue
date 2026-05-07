<template>
  <div class="si-wrap">
    <div class="si-actions">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        :disabled="generating"
        @click="openModal"
      >
        <span class="si-spark" aria-hidden="true">✦</span>
        {{ illustrations.length ? 'Generar otra ilustración' : 'Generar ilustración con IA' }}
      </button>
      <span v-if="illustrations.length" class="si-count">
        {{ illustrations.length }} {{ illustrations.length === 1 ? 'imagen' : 'imágenes' }}
      </span>
    </div>

    <div v-if="loading" class="text-muted si-loading">Cargando ilustraciones...</div>

    <div v-else-if="illustrations.length" class="si-gallery">
      <figure
        v-for="ill in illustrations"
        :key="ill.id"
        class="si-fig"
      >
        <img
          :src="resolveSrc(ill.image_url)"
          :alt="`Ilustración generada para ${session.title || 'la sesión'}`"
          loading="lazy"
          @click="openLightbox(ill)"
        />
        <figcaption class="si-cap">
          <span class="si-meta">{{ formatDate(ill.created_at) }} · {{ intensityLabel(ill.intensity) }}</span>
          <button type="button" class="btn btn-ghost btn-icon si-del" :aria-label="`Eliminar ilustración`" @click="askDelete(ill)">🗑</button>
        </figcaption>
      </figure>
    </div>

    <!-- Modal generación -->
    <div
      v-if="modalOpen"
      class="si-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="si-modal-title"
      @click.self="closeModal"
    >
      <div class="si-modal-card">
        <header class="si-modal-head">
          <h3 id="si-modal-title">Generar ilustración con IA</h3>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar" @click="closeModal">✕</button>
        </header>

        <p class="hint">
          Se usará el resumen, recap, MVP y botín de esta sesión, junto con las
          fotos de los personajes activos elegidos abajo, para crear una imagen
          en estilo D&D.
        </p>

        <div class="form-group">
          <label class="form-label">Personajes a incluir como referencia visual (máx. 3)</label>
          <p v-if="!availableCharacters.length" class="text-muted">
            Esta campaña no tiene personajes activos.
          </p>
          <ul v-else class="si-char-list">
            <li v-for="c in availableCharacters" :key="c.id" class="si-char-item">
              <label class="check-group">
                <input
                  type="checkbox"
                  :value="c.id"
                  :checked="selectedCharacterIds.includes(c.id)"
                  :disabled="!selectedCharacterIds.includes(c.id) && selectedCharacterIds.length >= 3"
                  @change="toggleCharacter(c.id)"
                />
                <span>
                  <strong>{{ c.name }}</strong>
                  <span class="text-muted"> · {{ c.race }} {{ c.class }} Nv.{{ c.level }}</span>
                  <span v-if="!c.photo_url" class="si-noref"> (sin foto)</span>
                </span>
              </label>
            </li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label">Intensidad visual</label>
          <div class="si-intensity">
            <label v-for="opt in intensities" :key="opt.value" class="si-intensity-opt" :class="{ active: intensity === opt.value }">
              <input type="radio" :value="opt.value" v-model="intensity" />
              <strong>{{ opt.label }}</strong>
              <span class="text-muted">{{ opt.hint }}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas extra para la IA (opcional)</label>
          <textarea
            v-model="extraHints"
            rows="3"
            placeholder="Ej. enfoque en Lyra lanzando la bola de fuego, atardecer, lluvia ligera..."
            maxlength="1000"
          />
          <p class="hint">
            Se agregan al prompt. Sirve para guiar la composición o pedir un detalle puntual.
          </p>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <footer class="si-form-actions">
          <button type="button" class="btn btn-ghost" :disabled="generating" @click="closeModal">Cancelar</button>
          <button type="button" class="btn btn-primary" :disabled="generating || !selectedCharacterIds.length" @click="doGenerate">
            <span v-if="generating">Generando... <span class="si-dots">⏳</span></span>
            <span v-else>Generar imagen</span>
          </button>
        </footer>

        <p v-if="generating" class="hint si-wait">
          Esto suele tardar entre 10 y 30 segundos. No cierres esta ventana.
        </p>
      </div>
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightbox"
      class="si-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de la ilustración"
      @click.self="lightbox = null"
    >
      <img :src="resolveSrc(lightbox.image_url)" :alt="`Ilustración ampliada`" />
      <button type="button" class="btn btn-ghost si-lightbox-close" aria-label="Cerrar" @click="lightbox = null">✕</button>
    </div>

    <ConfirmDialog
      v-if="confirmDelete"
      title="¿Eliminar esta ilustración?"
      message="Se borra la imagen del servidor. Esta acción no se puede deshacer."
      confirm-label="Eliminar"
      danger
      :busy="deleting"
      @confirm="doDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>

<script>
import { dmAPI } from '../../services/api.js'
import ConfirmDialog from '../ConfirmDialog.vue'

const API_HOST = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '')

export default {
  name: 'SessionIllustrations',
  components: { ConfirmDialog },
  inject: ['showToast'],
  props: {
    campaignId: { type: [String, Number], required: true },
    session: { type: Object, required: true },
    rosterCharacters: { type: Array, default: () => [] },
  },
  data() {
    return {
      illustrations: [],
      loading: false,
      modalOpen: false,
      generating: false,
      deleting: false,
      selectedCharacterIds: [],
      intensity: 'medium',
      extraHints: '',
      error: '',
      lightbox: null,
      confirmDelete: null,
      intensities: [
        { value: 'soft', label: 'Suave', hint: 'sin sangre, ideal para escenas familiares' },
        { value: 'medium', label: 'Media', hint: 'combate D&D típico, heridas estilizadas' },
        { value: 'hard', label: 'Intensa', hint: 'oscura, más sangre y heridas visibles' },
      ],
    }
  },
  computed: {
    availableCharacters() {
      return Array.isArray(this.rosterCharacters) ? this.rosterCharacters : []
    },
  },
  watch: {
    'session.id': {
      immediate: true,
      handler(val) { if (val) this.load() },
    },
  },
  methods: {
    async load() {
      if (!this.session?.id) return
      this.loading = true
      try {
        const { data } = await dmAPI.illustrations.list(this.campaignId, this.session.id)
        this.illustrations = Array.isArray(data) ? data : []
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    resolveSrc(url) {
      if (!url) return ''
      if (url.startsWith('http')) return url
      return `${API_HOST}${url}`
    },
    formatDate(s) {
      if (!s) return ''
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString()
    },
    intensityLabel(v) {
      return this.intensities.find((i) => i.value === v)?.label || v
    },
    openModal() {
      this.error = ''
      this.extraHints = ''
      this.intensity = 'medium'
      this.selectedCharacterIds = this.availableCharacters.slice(0, 3).map((c) => c.id)
      this.modalOpen = true
    },
    closeModal() {
      if (this.generating) return
      this.modalOpen = false
    },
    toggleCharacter(id) {
      const idx = this.selectedCharacterIds.indexOf(id)
      if (idx === -1) {
        if (this.selectedCharacterIds.length >= 3) return
        this.selectedCharacterIds.push(id)
      } else {
        this.selectedCharacterIds.splice(idx, 1)
      }
    },
    async doGenerate() {
      this.error = ''
      this.generating = true
      try {
        const { data } = await dmAPI.illustrations.generate(this.campaignId, this.session.id, {
          character_ids: this.selectedCharacterIds,
          intensity: this.intensity,
          extra_hints: this.extraHints,
        })
        if (data?.id) this.illustrations.unshift(data)
        this.showToast('Ilustración lista', 'success')
        this.modalOpen = false
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'No se pudo generar la imagen'
        this.error = msg
        this.showToast(msg, 'error')
      } finally {
        this.generating = false
      }
    },
    openLightbox(ill) { this.lightbox = ill },
    askDelete(ill) { this.confirmDelete = ill },
    async doDelete() {
      if (!this.confirmDelete) return
      this.deleting = true
      try {
        await dmAPI.illustrations.remove(this.confirmDelete.id)
        this.illustrations = this.illustrations.filter((i) => i.id !== this.confirmDelete.id)
        this.showToast('Ilustración eliminada', 'success')
        this.confirmDelete = null
      } catch {
        this.showToast('No se pudo eliminar', 'error')
      } finally {
        this.deleting = false
      }
    },
  },
}
</script>

<style scoped>
.si-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.si-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.si-spark {
  display: inline-block;
  margin-right: 0.25rem;
  color: var(--gold-light);
}
.si-count {
  color: var(--text-muted);
  font-size: 0.78rem;
}
.si-loading { font-size: 0.85rem; padding: 0.4rem 0; }

.si-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
}
.si-fig {
  margin: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.si-fig img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  cursor: zoom-in;
  display: block;
}
.si-cap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
}
.si-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
}
.si-del { color: var(--red-light); }

/* Modal */
.si-modal {
  position: fixed;
  inset: 0;
  background: rgba(8, 6, 3, 0.78);
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1rem;
  overflow: auto;
}
.si-modal-card {
  width: min(640px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  margin: 1rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.si-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
.si-modal-head h3 {
  font-family: var(--font-title);
  color: var(--text-primary);
  font-size: 1rem;
  margin: 0;
}

.si-char-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.si-char-item .check-group {
  align-items: flex-start;
  gap: 0.4rem;
}
.si-noref {
  font-size: 0.72rem;
  color: var(--gold-light);
  margin-left: 0.3rem;
}

.si-intensity {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.4rem;
}
.si-intensity-opt {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 0.82rem;
}
.si-intensity-opt input { display: none; }
.si-intensity-opt.active {
  border-color: var(--gold);
  background: rgba(212, 160, 23, 0.08);
}
.si-intensity-opt strong { color: var(--text-primary); }

.si-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.si-wait {
  text-align: center;
  font-size: 0.78rem;
  color: var(--gold-light);
}
.si-dots {
  display: inline-block;
  animation: si-spin 1.6s linear infinite;
}
@keyframes si-spin {
  to { transform: rotate(360deg); }
}

/* Lightbox */
.si-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.si-lightbox img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid var(--border);
}
.si-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(8, 6, 3, 0.7);
  font-size: 1rem;
}
</style>
