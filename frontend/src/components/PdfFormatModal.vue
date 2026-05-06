<template>
  <div class="pdf-modal-backdrop" @click.self="$emit('cancel')">
    <div class="pdf-modal-card">
      <h3 class="pdf-modal-title">Descargar PDF</h3>
      <p class="pdf-modal-sub">Elegí el formato del archivo del personaje.</p>
      <div class="pdf-modal-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('choose', 'plain')">
          Comun (texto simple)
        </button>
        <button type="button" class="btn btn-primary" @click="$emit('choose', 'styled')">
          Estilizado
        </button>
      </div>
      <button type="button" class="btn btn-ghost btn-cancel" @click="$emit('cancel')">
        Cancelar
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "PdfFormatModal",
  emits: ["choose", "cancel"],
};
</script>

<style scoped>
.pdf-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 8, 8, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 60;
}
.pdf-modal-card {
  width: min(420px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.9rem;
}
.pdf-modal-title {
  font-family: var(--font-title);
  color: var(--text-primary);
  margin-bottom: 0.2rem;
}
.pdf-modal-sub {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.pdf-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.btn-cancel {
  margin-top: 0.6rem;
  width: 100%;
}
</style>
