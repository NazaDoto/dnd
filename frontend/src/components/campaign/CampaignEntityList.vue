<template>
  <div class="ce-wrap">
    <div class="ce-head">
      <div class="ce-head-info">
        <p class="section-title" style="margin:0;border:none;padding:0">
          <span aria-hidden="true">{{ schema.icon }}</span>
          {{ schema.title }}
          <span class="ce-count">{{ filteredItems.length }}</span>
        </p>
        <p v-if="schema.hint" class="hint" style="margin-top:0.25rem">{{ schema.hint }}</p>
      </div>
      <div class="ce-head-actions">
        <input
          v-model.trim="search"
          class="ce-search"
          type="text"
          :placeholder="`Buscar en ${schema.title.toLowerCase()}...`"
          :aria-label="`Buscar en ${schema.title}`"
        />
        <button type="button" class="btn btn-primary" @click="openCreate">
          + {{ schema.addLabel || 'Nuevo' }}
        </button>
      </div>
    </div>

    <div v-if="schema.filters && schema.filters.length" class="ce-filters">
      <div v-for="f in schema.filters" :key="f.key" class="ce-filter-group">
        <label class="form-label">{{ f.label }}</label>
        <select v-model="filterValues[f.key]">
          <option v-for="opt in f.options" :key="`${f.key}-${opt.value}`" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-muted" style="padding:0.5rem">Cargando...</div>
    <p v-else-if="!items.length" class="ce-empty">
      Todavía no hay {{ schema.title.toLowerCase() }}. Agregá el primero arriba.
    </p>
    <p v-else-if="!filteredItems.length" class="ce-empty">
      Ningún resultado para esos filtros.
    </p>

    <ul v-else class="ce-list">
      <li v-for="item in filteredItems" :key="item.id" class="ce-row card">
        <div class="ce-row-main">
          <div class="ce-row-title">
            <h3 class="ce-name">{{ resolveText(schema.listMain, item) }}</h3>
            <div class="ce-badges">
              <span
                v-for="(b, idx) in renderBadges(item)"
                :key="`${item.id}-b-${idx}`"
                :class="['badge', `badge-${b.color}`]"
                :title="b.title || ''"
              >
                {{ b.label }}
              </span>
            </div>
          </div>
          <p
            v-for="(line, i) in resolveSubs(item)"
            :key="`${item.id}-sub-${i}`"
            class="ce-sub"
          >
            {{ line }}
          </p>
        </div>
        <div class="ce-row-actions">
          <slot name="row-actions" :item="item"></slot>
          <button type="button" class="btn btn-ghost ce-edit-btn" @click="openEdit(item)" :aria-label="`Editar ${resolveText(schema.listMain, item)}`">
            Editar
          </button>
          <button type="button" class="btn btn-ghost ce-del-btn" @click="askDelete(item)" :aria-label="`Eliminar ${resolveText(schema.listMain, item)}`">
            🗑
          </button>
        </div>
        <div v-if="$slots['row-extra']" class="ce-row-extra">
          <slot name="row-extra" :item="item"></slot>
        </div>
      </li>
    </ul>

    <div v-if="formOpen" class="ce-modal" role="dialog" aria-modal="true" :aria-labelledby="formTitleId" @click.self="closeForm">
      <div class="ce-modal-card">
        <header class="ce-modal-head">
          <h3 :id="formTitleId" class="ce-modal-title">
            {{ editingItem?.id ? `Editar ${schema.title.toLowerCase()}` : `Nueva ${schema.title.toLowerCase()}` }}
          </h3>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar" @click="closeForm">✕</button>
        </header>

        <form class="ce-form" @submit.prevent="submit">
          <div
            v-for="field in schema.fields"
            :key="field.key"
            :class="['ce-field', `ce-field-${field.col || 'full'}`]"
          >
            <label class="form-label" :for="`fld-${schema.key}-${field.key}`">
              {{ field.label }}<span v-if="field.required" class="ce-req">*</span>
              <span v-if="field.dmOnly" class="ce-dmonly" title="Solo el DM ve este campo">DM</span>
            </label>

            <textarea
              v-if="field.type === 'textarea'"
              :id="`fld-${schema.key}-${field.key}`"
              v-model="form[field.key]"
              :rows="field.rows || 3"
              :placeholder="field.placeholder || ''"
            />

            <select
              v-else-if="field.type === 'select'"
              :id="`fld-${schema.key}-${field.key}`"
              v-model="form[field.key]"
            >
              <option :value="null">— sin valor —</option>
              <option
                v-for="opt in resolveOptions(field)"
                :key="`opt-${field.key}-${opt.value}`"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>

            <label v-else-if="field.type === 'checkbox'" class="check-group">
              <input
                :id="`fld-${schema.key}-${field.key}`"
                v-model="form[field.key]"
                type="checkbox"
              />
              <span>{{ field.checkboxLabel || 'Sí' }}</span>
            </label>

            <input
              v-else
              :id="`fld-${schema.key}-${field.key}`"
              v-model="form[field.key]"
              :type="inputType(field.type)"
              :min="field.min"
              :max="field.max"
              :placeholder="field.placeholder || ''"
              :required="!!field.required"
            />
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <footer class="ce-form-actions">
            <button type="button" class="btn btn-ghost" @click="closeForm" :disabled="saving">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Guardando...' : (editingItem?.id ? 'Guardar' : 'Crear') }}
            </button>
          </footer>
        </form>
      </div>
    </div>

    <ConfirmDialog
      v-if="confirmingItem"
      :title="`¿Eliminar ${schema.title.toLowerCase().replace(/s$/, '')}?`"
      :message="`Se borra: ${resolveText(schema.listMain, confirmingItem)}`"
      confirm-label="Eliminar"
      danger
      :busy="deleting"
      @confirm="doDelete"
      @cancel="confirmingItem = null"
    />
  </div>
</template>

<script>
import ConfirmDialog from '../ConfirmDialog.vue'

let formCounter = 0

function emptyFormFromSchema(schema) {
  const f = {}
  for (const fld of schema.fields) {
    if (fld.type === 'checkbox') f[fld.key] = false
    else if (fld.type === 'number') f[fld.key] = null
    else f[fld.key] = ''
  }
  return f
}

export default {
  name: 'CampaignEntityList',
  components: { ConfirmDialog },
  inject: ['showToast'],
  emits: ['changed'],
  props: {
    schema: { type: Object, required: true },
    api: { type: Object, required: true },
    campaignId: { type: [String, Number], required: true },
    dynamicOptions: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      items: [],
      loading: false,
      search: '',
      filterValues: this.initialFilters(),
      formOpen: false,
      editingItem: null,
      form: emptyFormFromSchema(this.schema),
      formError: '',
      saving: false,
      formTitleId: `ce-form-title-${++formCounter}`,
      confirmingItem: null,
      deleting: false,
    }
  },
  computed: {
    filteredItems() {
      const term = this.search.toLowerCase().trim()
      const filtered = this.items.filter((it) => {
        for (const f of (this.schema.filters || [])) {
          const sel = this.filterValues[f.key]
          if (sel !== '' && sel != null && String(it[f.key]) !== String(sel)) return false
        }
        if (!term) return true
        const main = this.resolveText(this.schema.listMain, it).toLowerCase()
        const subs = this.resolveSubs(it).join(' ').toLowerCase()
        return main.includes(term) || subs.includes(term)
      })
      const sorter = this.schema.sort
      if (typeof sorter === 'function') {
        return [...filtered].sort(sorter)
      }
      return filtered
    }
  },
  watch: {
    campaignId: { immediate: true, handler() { this.load() } },
    schema() { this.filterValues = this.initialFilters(); this.load() },
  },
  methods: {
    initialFilters() {
      const out = {}
      for (const f of (this.schema?.filters || [])) out[f.key] = ''
      return out
    },
    inputType(t) {
      if (t === 'number') return 'number'
      if (t === 'date') return 'date'
      if (t === 'url') return 'url'
      return 'text'
    },
    resolveText(maybeFn, item) {
      if (typeof maybeFn === 'function') return maybeFn(item) || ''
      if (typeof maybeFn === 'string') return item[maybeFn] || ''
      return ''
    },
    resolveSubs(item) {
      return (this.schema.listSubs || [])
        .map((s) => this.resolveText(s, item))
        .filter((x) => x && String(x).trim())
    },
    resolveOptions(field) {
      if (Array.isArray(field.options)) return field.options
      if (field.dynamicOptions && this.dynamicOptions[field.dynamicOptions]) {
        return this.dynamicOptions[field.dynamicOptions]
      }
      return []
    },
    renderBadges(item) {
      const out = []
      for (const b of (this.schema.listBadges || [])) {
        const v = item[b.key]
        if (v == null || v === '') continue
        if (b.map) {
          const def = b.map[String(v)] || b.map[v]
          if (def) {
            out.push({ label: def.label || String(v), color: def.color || 'gold' })
          }
        } else if (typeof b.valueFn === 'function') {
          const label = b.valueFn(v)
          if (label) {
            const color = typeof b.colorFn === 'function' ? b.colorFn(v) : 'gold'
            out.push({ label: `${b.label ? b.label + ': ' : ''}${label}`, color })
          }
        }
      }
      return out
    },
    async load() {
      if (!this.campaignId) return
      this.loading = true
      try {
        const { data } = await this.api.list(this.campaignId)
        this.items = Array.isArray(data) ? data : []
      } catch (err) {
        console.error(err)
        this.showToast(`No se pudo cargar ${this.schema.title}`, 'error')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editingItem = null
      this.form = emptyFormFromSchema(this.schema)
      this.formError = ''
      this.formOpen = true
    },
    openEdit(item) {
      this.editingItem = item
      const base = emptyFormFromSchema(this.schema)
      for (const fld of this.schema.fields) {
        const raw = item[fld.key]
        if (fld.type === 'checkbox') base[fld.key] = !!raw
        else if (fld.type === 'date') base[fld.key] = raw ? String(raw).slice(0, 10) : ''
        else if (raw == null) base[fld.key] = fld.type === 'number' ? null : ''
        else base[fld.key] = raw
      }
      this.form = base
      this.formError = ''
      this.formOpen = true
    },
    closeForm() {
      if (this.saving) return
      this.formOpen = false
      this.editingItem = null
      this.formError = ''
    },
    buildPayload() {
      const payload = {}
      for (const fld of this.schema.fields) {
        let v = this.form[fld.key]
        if (fld.type === 'number') {
          v = v === '' || v == null ? null : Number(v)
        }
        if (fld.type === 'checkbox') {
          v = !!v
        }
        if (typeof v === 'string') v = v.trim()
        payload[fld.key] = v === '' ? null : v
      }
      return payload
    },
    async submit() {
      this.formError = ''
      const payload = this.buildPayload()
      for (const fld of this.schema.fields) {
        if (fld.required && (payload[fld.key] == null || payload[fld.key] === '')) {
          this.formError = `Falta: ${fld.label}`
          return
        }
      }
      this.saving = true
      try {
        if (this.editingItem?.id) {
          const { data } = await this.api.update(this.campaignId, this.editingItem.id, payload)
          const idx = this.items.findIndex((x) => x.id === this.editingItem.id)
          if (idx !== -1 && data) this.items.splice(idx, 1, data)
          this.showToast('Actualizado', 'success')
        } else {
          const { data } = await this.api.create(this.campaignId, payload)
          if (data?.id) this.items.unshift(data)
          this.showToast('Creado', 'success')
        }
        this.formOpen = false
        this.editingItem = null
        this.$emit('changed')
      } catch (err) {
        this.formError = err.response?.data?.message || 'Error al guardar'
      } finally {
        this.saving = false
      }
    },
    askDelete(item) { this.confirmingItem = item },
    async doDelete() {
      if (!this.confirmingItem) return
      this.deleting = true
      try {
        await this.api.remove(this.campaignId, this.confirmingItem.id)
        this.items = this.items.filter((x) => x.id !== this.confirmingItem.id)
        this.confirmingItem = null
        this.showToast('Eliminado', 'success')
        this.$emit('changed')
      } catch {
        this.showToast('No se pudo eliminar', 'error')
      } finally {
        this.deleting = false
      }
    },
  }
}
</script>

<style scoped>
.ce-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.ce-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: flex-end;
  justify-content: space-between;
}
.ce-head-info { flex: 1; min-width: 0; }
.ce-head-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}
.ce-search {
  min-width: 0;
  width: 14rem;
  max-width: 100%;
}
.ce-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.4rem;
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-family: var(--font-title);
  font-size: 0.7rem;
  margin-left: 0.4rem;
  padding: 0 0.45rem;
}

.ce-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ce-filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 8rem;
}
.ce-filter-group select { min-height: 2.4rem; }

.ce-empty {
  background: var(--bg-surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.ce-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ce-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
}
.ce-row-main { flex: 1; min-width: 0; }
.ce-row-extra {
  flex-basis: 100%;
  margin-top: 0.5rem;
  border-top: 1px dashed var(--border);
  padding-top: 0.5rem;
}
.ce-row-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.2rem;
}
.ce-name {
  font-family: var(--font-title);
  color: var(--text-primary);
  font-size: 1rem;
  margin: 0;
  flex: 1;
  min-width: 0;
}
.ce-badges {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.ce-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  word-break: break-word;
}

.ce-row-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}
.ce-edit-btn { font-size: 0.78rem; padding: 0.35rem 0.6rem; }
.ce-del-btn {
  font-size: 0.95rem;
  padding: 0.3rem 0.5rem;
  color: var(--red-light);
}

/* Modal */
.ce-modal {
  position: fixed;
  inset: 0;
  background: rgba(8, 6, 3, 0.78);
  z-index: 180;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1rem;
  overflow: auto;
}
.ce-modal-card {
  width: min(720px, 100%);
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  margin: 1rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ce-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
.ce-modal-title {
  font-family: var(--font-title);
  color: var(--text-primary);
  font-size: 1rem;
}

.ce-form {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.6rem;
}
.ce-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}
.ce-field-full { grid-column: span 6; }
.ce-field-half { grid-column: span 6; }
.ce-field-third { grid-column: span 6; }
.ce-field-twothirds { grid-column: span 6; }

@media (min-width: 720px) {
  .ce-field-half { grid-column: span 3; }
  .ce-field-third { grid-column: span 2; }
  .ce-field-twothirds { grid-column: span 4; }
}

.ce-form .form-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.ce-req { color: var(--red-light); }
.ce-dmonly {
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  background: rgba(124, 58, 237, 0.18);
  color: #c4b5fd;
  border: 1px solid var(--purple);
  border-radius: 999px;
  padding: 0 0.4rem;
}

.ce-form-actions {
  grid-column: span 6;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.form-error {
  grid-column: span 6;
}
</style>
