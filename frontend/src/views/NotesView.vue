<template>
  <div class="notes-view">
    <div class="notes-header">
      <button class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <h2 class="notes-title">📝 Notas de Campaña</h2>
      <span></span>
    </div>
    <CharacterNotesPanel :char-id="charId" />
  </div>
</template>

<script>
import CharacterNotesPanel from '../components/CharacterNotesPanel.vue'

export default {
  name: 'NotesView',
  components: { CharacterNotesPanel },
  computed: {
    charId() { return this.$route.params.id }
  }
}
</script>

<style scoped>
.notes-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem; gap: 0.5rem;
  flex-wrap: wrap;
}
.notes-title {
  font-family: var(--font-title); font-size: 1rem; color: var(--text-primary); flex: 1; text-align: center;
}

@media (min-width: 760px) {
  .notes-header {
    flex-wrap: nowrap;
  }
  .notes-title {
    text-align: left;
    font-size: 1.15rem;
  }
  .note-form-actions {
    justify-content: flex-end;
  }
}
</style>