<template>
  <div class="cd-backdrop" role="dialog" aria-modal="true" :aria-labelledby="titleId" @click.self="cancel">
    <div class="cd-card">
      <h3 :id="titleId" class="cd-title">{{ title }}</h3>
      <p v-if="message" class="cd-message">{{ message }}</p>
      <slot />
      <div class="cd-actions">
        <button type="button" class="btn btn-ghost" @click="cancel">{{ cancelLabel }}</button>
        <button
          type="button"
          :class="['btn', danger ? 'btn-danger' : 'btn-primary']"
          :disabled="busy"
          @click="confirm"
        >
          {{ busy ? '...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
let id = 0
export default {
  name: 'ConfirmDialog',
  emits: ['confirm', 'cancel'],
  props: {
    title: { type: String, default: '¿Confirmar?' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: 'Confirmar' },
    cancelLabel: { type: String, default: 'Cancelar' },
    danger: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  },
  data() {
    return { titleId: `cd-title-${++id}` }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    cancel() { if (!this.busy) this.$emit('cancel') },
    confirm() { this.$emit('confirm') },
    onKey(e) {
      if (e.key === 'Escape') this.cancel()
    }
  }
}
</script>

<style scoped>
.cd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 8, 8, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 200;
}
.cd-card {
  width: min(420px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}
.cd-title {
  font-family: var(--font-title);
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}
.cd-message {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 0.85rem;
  line-height: 1.45;
}
.cd-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
</style>
