<template>
  <div id="dnd-app">
    <NavBar v-if="isAuthenticated" />
    <main
      :class="[
        'main-content',
        { 'with-nav': isAuthenticated, 'main-content--dm': isDmLayout }
      ]"
    >
      <RouterView />
    </main>
    <!-- Toast global -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', t.type]"
      >{{ t.msg }}</div>
    </div>
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue'

export default {
  name: 'App',
  components: { NavBar },
  data() {
    return { toasts: [] }
  },
  computed: {
    isAuthenticated() {
      return !!localStorage.getItem('dnd_token')
    },
    /** Rutas del panel DM: ancho de lectura mayor en escritorio */
    isDmLayout() {
      const p = this.$route?.path || ''
      return p === '/dm' || p.startsWith('/dm/')
    }
  },
  methods: {
    showToast(msg, type = 'info') {
      const id = Date.now()
      this.toasts.push({ id, msg, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 3000)
    }
  },
  provide() {
    return { showToast: this.showToast }
  }
}
</script>

<style>
#dnd-app { min-height: 100dvh; display: flex; flex-direction: column; }

.main-content {
  flex: 1;
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}
/* Panel DM y ficha en contexto campaña: aprovechar pantallas anchas */
.main-content.main-content--dm {
  max-width: min(1200px, 100%);
}
.main-content.with-nav {
  padding-top: 1rem;
  padding-bottom: 5rem; /* espacio para navbar bottom */
}

@media (min-width: 640px) {
  .main-content { padding: 1.5rem; }
}
</style>