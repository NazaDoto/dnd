<template>
  <div class="notes-view">
    <div class="notes-header">
      <button class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <h2 class="notes-title">📝 Notas de Campaña</h2>
      <button class="btn btn-primary" style="font-size:0.78rem;padding:0.4rem 0.7rem" @click="openNew">
        ＋ Nueva
      </button>
    </div>

    <!-- Formulario nueva/editar nota -->
    <div v-if="showForm" class="card note-form-card">
      <p class="section-title">{{ editingNote ? 'Editar Nota' : 'Nueva Nota' }}</p>
      <div class="form-group mb-4" style="margin-bottom:0.5rem">
        <label class="form-label">Título (opcional)</label>
        <input v-model="form.title" placeholder="Sesión 1, El Encuentro en la Taberna..." />
      </div>
      <div class="form-group mb-4" style="margin-bottom:0.5rem">
        <label class="form-label">Fecha de sesión</label>
        <input v-model="form.session_date" type="date" />
      </div>
      <div class="form-group mb-4" style="margin-bottom:0.5rem">
        <label class="form-label">Notas *</label>
        <textarea v-model="form.content" rows="6" placeholder="Escribí lo que pasó en la sesión..." style="resize:vertical"></textarea>
      </div>
      <div class="form-group mb-4" style="margin-bottom:0.75rem">
        <label class="form-label">Etiquetas</label>
        <div class="tags-input">
          <span v-for="(tag, i) in form.tags" :key="i" class="badge badge-gold">
            {{ tag }}
            <button @click="removeTag(i)" class="tag-remove">×</button>
          </span>
          <input
            v-model="tagInput"
            placeholder="combate, npc, loot..."
            @keydown.enter.prevent="addTag"
            @keydown="onTagKeydown"
            class="tag-input-field"
          />
        </div>
      </div>
      <div class="note-form-actions">
        <button class="btn btn-secondary" @click="closeForm">Cancelar</button>
        <button class="btn btn-primary" @click="saveNote" :disabled="saving">
          {{ saving ? 'Guardando...' : (editingNote ? 'Actualizar' : 'Guardar') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-screen" style="min-height:30vh">
      <div class="spinner"></div>
    </div>

    <!-- Lista de notas -->
    <div v-else-if="notes.length" class="notes-list">
      <div v-for="note in notes" :key="note.id" class="note-card card">
        <div class="note-top">
          <div>
            <h3 class="note-title-text">{{ note.title || 'Sin título' }}</h3>
            <p class="note-date" v-if="note.session_date">🗓️ {{ formatDate(note.session_date) }}</p>
          </div>
          <div class="note-actions">
            <button class="btn btn-ghost btn-icon" @click="editNote(note)" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-icon" @click="deleteNote(note.id)" title="Eliminar">🗑️</button>
          </div>
        </div>
        <p class="note-preview">{{ note.content }}</p>
        <div v-if="note.tags?.length" class="note-tags">
          <span v-for="tag in note.tags" :key="tag" class="badge badge-blue" style="font-size:0.65rem">{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <div class="empty-icon">📜</div>
      <h3>Sin notas aún</h3>
      <p>Registrá lo que sucede en tus aventuras</p>
      <button class="btn btn-primary mt-4" @click="openNew">Escribir primera nota</button>
    </div>
  </div>
</template>

<script>
import { notesAPI } from '../services/api.js'

export default {
  name: 'NotesView',
  inject: ['showToast'],
  data() {
    return {
      notes: [],
      loading: true,
      showForm: false,
      saving: false,
      editingNote: null,
      tagInput: '',
      form: { title: '', content: '', session_date: '', tags: [] }
    }
  },
  computed: {
    charId() { return this.$route.params.id }
  },
  async mounted() {
    await this.loadNotes()
  },
  methods: {
    onTagKeydown(event) {
        if (event.key === ',') {
            event.preventDefault()
            this.addTag()
        }
    },
    async loadNotes() {
      this.loading = true
      try {
        const { data } = await notesAPI.getAll(this.charId)
        this.notes = data
      } catch {
        this.showToast('Error al cargar notas', 'error')
      } finally {
        this.loading = false
      }
    },
    openNew() {
      this.editingNote = null
      this.form = { title: '', content: '', session_date: '', tags: [] }
      this.tagInput = ''
      this.showForm = true
      this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    },
    editNote(note) {
      this.editingNote = note
      this.form = {
        title:        note.title || '',
        content:      note.content,
        session_date: note.session_date ? note.session_date.split('T')[0] : '',
        tags:         [...(note.tags || [])]
      }
      this.showForm = true
      this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    },
    closeForm() { this.showForm = false; this.editingNote = null },
    addTag() {
      const t = this.tagInput.trim().replace(/,$/, '')
      if (t && !this.form.tags.includes(t)) this.form.tags.push(t)
      this.tagInput = ''
    },
    removeTag(i) { this.form.tags.splice(i, 1) },
    async saveNote() {
      if (!this.form.content.trim()) {
        this.showToast('El contenido es obligatorio', 'error'); return
      }
      this.saving = true
      try {
        if (this.editingNote) {
          await notesAPI.update(this.editingNote.id, this.form)
          this.showToast('Nota actualizada', 'success')
        } else {
          await notesAPI.create(this.charId, this.form)
          this.showToast('Nota guardada', 'success')
        }
        this.closeForm()
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
        this.notes = this.notes.filter(n => n.id !== id)
        this.showToast('Nota eliminada', 'success')
      } catch {
        this.showToast('Error al eliminar', 'error')
      }
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })
    }
  }
}
</script>

<style scoped>
.notes-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem; gap: 0.5rem;
}
.notes-title {
  font-family: var(--font-title); font-size: 1rem; color: var(--text-primary); flex: 1; text-align: center;
}

.note-form-card { margin-bottom: 1rem; }
.note-form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.tags-input {
  display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 0.4rem 0.5rem; min-height: 2.4rem;
}
.tag-remove { background: none; border: none; cursor: pointer; color: var(--gold); margin-left: 0.2rem; font-size: 0.9rem; }
.tag-input-field {
  border: none; background: transparent; outline: none; color: var(--text-primary);
  font-family: var(--font-body); font-size: 0.9rem; flex: 1; min-width: 80px;
  box-shadow: none !important;
}

.notes-list { display: flex; flex-direction: column; gap: 0.65rem; }

.note-card { transition: border-color 0.2s; }
.note-card:hover { border-color: var(--gold-dark); }
.note-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.4rem; }
.note-title-text { font-family: var(--font-title); font-size: 0.9rem; color: var(--text-primary); }
.note-date { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem; }
.note-actions { display: flex; gap: 0.1rem; flex-shrink: 0; }
.note-preview {
  font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  white-space: pre-line;
}
.note-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }

.empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
.empty-icon  { font-size: 3rem; margin-bottom: 1rem; }
.empty-state h3 { font-family: var(--font-title); color: var(--text-secondary); margin-bottom: 0.5rem; }
</style>