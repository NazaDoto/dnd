<template>
  <div class="home-view">
    <!-- Header -->
    <div class="home-header">
      <div>
        <h1 class="home-title">Mis Personajes</h1>
        <p class="home-sub" v-if="user">¡Bienvenido, {{ user.username }}!</p>
      </div>
      <RouterLink to="/character/new" class="btn btn-primary">
        Nuevo
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
      <span>Convocando personajes...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!characters.length" class="empty-state">
      <div class="empty-icon">🐉</div>
      <h3>Ningún aventurero aún</h3>
      <p>Creá tu primer personaje y comenzá la aventura</p>
      <RouterLink to="/character/new" class="btn btn-primary mt-4">
        Crear personaje
      </RouterLink>
    </div>

    <!-- Lista -->
    <div v-else class="char-list">
      <CharacterCard
        v-for="char in characters"
        :key="char.id"
        :character="char"
        @click="$router.push(`/character/${char.id}`)"
      />
    </div>
  </div>
</template>

<script>
import CharacterCard from '../components/CharacterCard.vue'
import { charactersAPI } from '../services/api.js'

export default {
  name: 'HomeView',
  components: { CharacterCard },
  inject: ['showToast'],
  data() {
    return { characters: [], loading: true, user: null }
  },
  async mounted() {
    const stored = localStorage.getItem('dnd_user')
    if (stored) this.user = JSON.parse(stored)
    if (this.user?.role === 'administrador') {
      this.$router.replace('/admin')
      return
    }
    if (this.user?.role === 'dm') {
      this.$router.replace('/dm')
      return
    }
    await this.loadCharacters()
  },
  methods: {
    async loadCharacters() {
      this.loading = true
      try {
        const { data } = await charactersAPI.getAll()
        this.characters = data
      } catch {
        this.showToast('Error al cargar personajes', 'error')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.home-view { padding-bottom: 1rem; }

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.home-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.home-sub { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem; }

.char-list { display: flex; flex-direction: column; gap: 0.65rem; }

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}
.empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
.empty-state h3 { font-family: var(--font-title); color: var(--text-secondary); margin-bottom: 0.5rem; }
.empty-state p  { font-size: 0.9rem; }
</style>