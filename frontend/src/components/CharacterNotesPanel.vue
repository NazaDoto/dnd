<template>
  <div class="notes-hub">
    <aside v-if="character" class="notes-sheet card">
      <p class="section-title">Referencia rápida</p>
      <p class="sheet-name">{{ character.name }}</p>
      <p class="sheet-meta">
        Nv.{{ character.level }} · {{ character.race || '—' }} · {{ classLabel }}
      </p>

      <div class="sheet-stats">
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ character.hit_points_current }}/{{ character.hit_points_max }}</span>
          <span class="sheet-stat-lbl">PV</span>
        </div>
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ character.armor_class ?? '—' }}</span>
          <span class="sheet-stat-lbl">CA</span>
        </div>
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ fmtMod(character.initiative) }}</span>
          <span class="sheet-stat-lbl">Init</span>
        </div>
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ character.speed }}ft</span>
          <span class="sheet-stat-lbl">Vel</span>
        </div>
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ fmtMod(character.proficiency_bonus) }}</span>
          <span class="sheet-stat-lbl">Prof</span>
        </div>
        <div class="sheet-stat">
          <span class="sheet-stat-val">{{ character.passive_perception ?? '—' }}</span>
          <span class="sheet-stat-lbl">P.Pasiva</span>
        </div>
      </div>

      <div v-if="abilityMods.length" class="sheet-block">
        <p class="sheet-block-title">Atributos</p>
        <div class="sheet-abilities">
          <span v-for="a in abilityMods" :key="a.key" class="sheet-ability">
            <span class="ab-short">{{ a.short }}</span>
            <span class="ab-mod">{{ a.mod }}</span>
          </span>
        </div>
      </div>

      <div v-if="attacks.length" class="sheet-block">
        <p class="sheet-block-title">Ataques</p>
        <div class="sheet-compact-list">
          <div v-for="(atk, i) in attacks" :key="'atk-'+i" class="sheet-compact-item">
            <DndRefChip
              v-if="atk.name"
              :name="atk.name"
              :extra="[atk.bonus, atk.damage].filter(Boolean).join(' ')"
            />
          </div>
        </div>
      </div>

      <div v-if="spellLines.length" class="sheet-block">
        <p class="sheet-block-title">Conjuros</p>
        <div class="sheet-compact-list">
          <DndRefChip
            v-for="(sp, i) in spellLines"
            :key="'sp-'+i"
            :name="sp"
          />
        </div>
      </div>
    </aside>

    <section class="notes-main">
      <div class="notes-composer card">
        <div class="composer-head">
          <p class="section-title" style="margin:0;border:0;padding:0">
            {{ editingNote ? 'Editando nota' : 'Nueva anotación' }}
          </p>
          <span v-if="autosaveHint" class="autosave-hint">{{ autosaveHint }}</span>
        </div>
        <input
          v-model="form.title"
          class="composer-title"
          type="text"
          placeholder="Título (opcional) — ej. Sesión 12"
        />
        <input v-model="form.session_date" class="composer-date" type="date" />
        <textarea
          v-model="form.content"
          class="composer-body"
          rows="8"
          placeholder="Qué pasó en la sesión, NPCs, pistas, loot..."
          @blur="flushAutosave"
        ></textarea>
        <div class="tags-input">
          <span v-for="(tag, i) in form.tags" :key="i" class="badge badge-gold">
            {{ tag }}
            <button type="button" @click="removeTag(i)" class="tag-remove">×</button>
          </span>
          <input
            v-model="tagInput"
            placeholder="etiquetas (Enter)"
            @keydown.enter.prevent="addTag"
            @keydown="onTagKeydown"
            class="tag-input-field"
          />
        </div>
        <div class="composer-actions">
          <button v-if="editingNote || showForm" type="button" class="btn btn-ghost" @click="resetComposer">
            Limpiar
          </button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="saveNote">
            {{ saving ? 'Guardando…' : (editingNote ? 'Listo' : 'Guardar nota') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-screen" style="min-height:20vh">
        <div class="spinner"></div>
      </div>

      <div v-else-if="notes.length" class="notes-feed">
        <button
          v-for="note in notes"
          :key="note.id"
          type="button"
          class="note-card card"
          :class="{ active: editingNote?.id === note.id }"
          @click="editNote(note)"
        >
          <div class="note-top">
            <h3 class="note-title-text">{{ note.title || 'Sin título' }}</h3>
            <span v-if="note.session_date" class="note-date">{{ formatDate(note.session_date) }}</span>
          </div>
          <p class="note-preview">{{ note.content }}</p>
          <div v-if="note.tags?.length" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="badge badge-blue">{{ tag }}</span>
          </div>
          <div class="note-card-actions" @click.stop>
            <button type="button" class="btn btn-ghost note-action-btn" @click="editNote(note)">Editar</button>
            <button type="button" class="btn btn-ghost note-action-btn" @click="deleteNote(note.id)">Eliminar</button>
          </div>
        </button>
      </div>

      <div v-else class="empty-state card">
        <p>Escribí arriba y se guarda solo. Tocá una nota del listado para editarla.</p>
      </div>
    </section>
  </div>
</template>

<script>
import { notesAPI } from '../services/api.js'
import DndRefChip from './DndRefChip.vue'
import { CLASSES, ATTRIBUTES, formatModifier } from '../services/dndData.js'

const AUTOSAVE_MS = 900

export default {
  name: 'CharacterNotesPanel',
  components: { DndRefChip },
  inject: ['showToast'],
  props: {
    charId: { type: [String, Number], required: true },
    character: { type: Object, default: null }
  },
  data() {
    return {
      notes: [],
      loading: true,
      showForm: true,
      saving: false,
      editingNote: null,
      tagInput: '',
      form: { title: '', content: '', session_date: '', tags: [] },
      autosaveTimer: null,
      autosaveStatus: 'idle',
      autosaveInFlight: false,
      autosaveSavedTimer: null
    }
  },
  computed: {
    autosaveHint() {
      if (this.autosaveStatus === 'saving') return 'Guardando…'
      if (this.autosaveStatus === 'saved') return 'Guardado'
      if (this.autosaveStatus === 'error') return 'Error al guardar — probá el botón'
      return ''
    },
    classLabel() {
      const cls = CLASSES.find(c => c.value === this.character?.class)
      return cls ? cls.label : (this.character?.class || '—')
    },
    abilityMods() {
      if (!this.character) return []
      return ATTRIBUTES.map(a => ({
        key: a.key,
        short: a.short,
        mod: formatModifier(Math.floor(((this.character[a.key] || 10) - 10) / 2))
      }))
    },
    attacks() {
      return Array.isArray(this.character?.attacks_spellcasting)
        ? this.character.attacks_spellcasting
        : []
    },
    spellLines() {
      const spells = this.character?.spells
      if (!spells || typeof spells !== 'object') return []
      const out = []
      if (Array.isArray(spells.cantrips)) {
        spells.cantrips.forEach(s => { if (String(s).trim()) out.push(String(s).trim()) })
      }
      for (let i = 1; i <= 9; i++) {
        const block = spells[`level${i}`]
        if (block?.spells && Array.isArray(block.spells)) {
          block.spells.forEach(s => { if (String(s).trim()) out.push(String(s).trim()) })
        }
      }
      return out.slice(0, 12)
    }
  },
  watch: {
    form: {
      deep: true,
      handler() {
        this.scheduleAutosave()
      }
    }
  },
  async mounted() {
    await this.loadNotes()
    this._onVis = () => {
      if (document.visibilityState === 'hidden') this.flushAutosave()
    }
    document.addEventListener('visibilitychange', this._onVis)
  },
  beforeUnmount() {
    document.removeEventListener('visibilitychange', this._onVis)
    this.clearAutosaveTimer()
    if (this.autosaveSavedTimer) clearTimeout(this.autosaveSavedTimer)
    this.flushAutosave()
  },
  methods: {
    fmtMod: formatModifier,
    onTagKeydown(event) {
      if (event.key === ',') {
        event.preventDefault()
        this.addTag()
      }
    },
    clearAutosaveTimer() {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer)
        this.autosaveTimer = null
      }
    },
    scheduleAutosave() {
      this.clearAutosaveTimer()
      if (this.autosaveSavedTimer) {
        clearTimeout(this.autosaveSavedTimer)
        this.autosaveSavedTimer = null
      }
      if (this.autosaveStatus === 'saved' || this.autosaveStatus === 'error') {
        this.autosaveStatus = 'idle'
      }
      this.autosaveTimer = setTimeout(() => this.runAutosave(), AUTOSAVE_MS)
    },
    formPayload() {
      return {
        title: (this.form.title || '').trim() || null,
        content: this.form.content || '',
        session_date: this.form.session_date || null,
        tags: Array.isArray(this.form.tags) ? [...this.form.tags] : []
      }
    },
    async runAutosave() {
      this.autosaveTimer = null
      const payload = this.formPayload()
      if (!String(payload.content || '').trim()) return
      if (this.autosaveInFlight) {
        await new Promise(r => setTimeout(r, 50))
        if (this.autosaveInFlight) return
      }

      this.autosaveInFlight = true
      this.autosaveStatus = 'saving'
      try {
        if (this.editingNote?.id) {
          await notesAPI.update(this.editingNote.id, payload)
        } else {
          const { data } = await notesAPI.create(this.charId, {
            title: payload.title || undefined,
            content: payload.content,
            session_date: payload.session_date || undefined,
            tags: payload.tags
          })
          this.editingNote = { id: data.id }
        }
        this.autosaveStatus = 'saved'
        await this.loadNotes({ silent: true })
        if (this.autosaveSavedTimer) clearTimeout(this.autosaveSavedTimer)
        this.autosaveSavedTimer = setTimeout(() => {
          if (this.autosaveStatus === 'saved') this.autosaveStatus = 'idle'
          this.autosaveSavedTimer = null
        }, 2000)
      } catch {
        this.autosaveStatus = 'error'
      } finally {
        this.autosaveInFlight = false
      }
    },
    async flushAutosave() {
      this.clearAutosaveTimer()
      while (this.autosaveInFlight) {
        await new Promise(r => setTimeout(r, 40))
      }
      return this.runAutosave()
    },
    async loadNotes({ silent = false } = {}) {
      if (!silent) this.loading = true
      try {
        const { data } = await notesAPI.getAll(this.charId)
        this.notes = data
      } catch {
        if (!silent) this.showToast('Error al cargar notas', 'error')
      } finally {
        if (!silent) this.loading = false
      }
    },
    resetComposer() {
      this.clearAutosaveTimer()
      this.editingNote = null
      this.form = { title: '', content: '', session_date: '', tags: [] }
      this.tagInput = ''
      this.autosaveStatus = 'idle'
    },
    editNote(note) {
      this.clearAutosaveTimer()
      this.autosaveStatus = 'idle'
      this.editingNote = note
      this.form = {
        title: note.title || '',
        content: note.content,
        session_date: note.session_date ? note.session_date.split('T')[0] : '',
        tags: [...(note.tags || [])]
      }
      this.showForm = true
    },
    addTag() {
      const t = this.tagInput.trim().replace(/,$/, '')
      if (t && !this.form.tags.includes(t)) this.form.tags.push(t)
      this.tagInput = ''
    },
    removeTag(i) {
      this.form.tags.splice(i, 1)
    },
    async saveNote() {
      this.clearAutosaveTimer()
      if (!this.form.content.trim()) {
        this.showToast('Escribí algo en la nota', 'error')
        return
      }
      this.saving = true
      try {
        await this.flushAutosave()
        this.showToast(this.editingNote ? 'Nota actualizada' : 'Nota guardada', 'success')
        this.resetComposer()
        await this.loadNotes()
      } catch {
        this.showToast('Error al guardar nota', 'error')
      } finally {
        this.saving = false
      }
    },
    async deleteNote(id) {
      if (!confirm('¿Eliminar esta nota?')) return
      try {
        await notesAPI.delete(id)
        if (this.editingNote?.id === id) this.resetComposer()
        this.notes = this.notes.filter(n => n.id !== id)
        this.showToast('Nota eliminada', 'success')
      } catch {
        this.showToast('Error al eliminar', 'error')
      }
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  }
}
</script>

<style scoped>
.notes-hub {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
}
@media (min-width: 900px) {
  .notes-hub {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  }
}

.notes-sheet {
  position: sticky;
  top: 0.5rem;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sheet-name {
  font-family: var(--font-title);
  font-size: 1rem;
  margin: 0 0 0.15rem;
}
.sheet-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 0.65rem;
}
.sheet-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}
.sheet-stat {
  text-align: center;
  padding: 0.35rem 0.2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}
.sheet-stat-val {
  display: block;
  font-family: var(--font-title);
  font-size: 0.88rem;
  color: var(--gold-light);
}
.sheet-stat-lbl {
  font-size: 0.58rem;
  text-transform: uppercase;
  color: var(--text-dim);
}
.sheet-block { margin-top: 0.55rem; }
.sheet-block-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin: 0 0 0.35rem;
}
.sheet-abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.sheet-ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 2.2rem;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
}
.ab-short { color: var(--text-muted); font-size: 0.6rem; }
.ab-mod { font-weight: 700; color: var(--gold-light); }
.sheet-compact-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.notes-main { display: flex; flex-direction: column; gap: 0.65rem; min-width: 0; }
.notes-composer { display: flex; flex-direction: column; gap: 0.5rem; }
.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.autosave-hint { font-size: 0.72rem; color: var(--text-muted); }
.composer-title,
.composer-date,
.composer-body {
  width: 100%;
  font-family: var(--font-body);
  font-size: 0.9rem;
}
.composer-body {
  resize: vertical;
  min-height: 10rem;
  line-height: 1.55;
}
.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.5rem;
  min-height: 2.4rem;
}
.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gold);
  margin-left: 0.2rem;
}
.tag-input-field {
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  flex: 1;
  min-width: 80px;
  font-size: 0.85rem;
}
.notes-feed {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.note-card {
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s;
}
.note-card.active {
  border-color: var(--gold);
}
.note-card:hover { border-color: var(--gold-dark); }
.note-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.note-title-text {
  font-family: var(--font-title);
  font-size: 0.9rem;
  margin: 0;
}
.note-date { font-size: 0.7rem; color: var(--text-muted); flex-shrink: 0; }
.note-preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.note-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.35rem; }
.note-card-actions {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
  margin-top: 0.45rem;
}
.note-action-btn { font-size: 0.68rem; padding: 0.3rem 0.5rem; }
.empty-state {
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}
</style>
