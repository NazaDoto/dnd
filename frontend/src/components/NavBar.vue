<template>
  <nav class="navbar">
    <RouterLink :to="homePath" class="nav-item" active-class="active">
      <span class="nav-icon">⚔️</span>
      <span class="nav-label">{{ homeLabel }}</span>
    </RouterLink>
    <RouterLink v-if="isPlayer" to="/character/new" class="nav-item nav-create" active-class="active">
      <span class="nav-icon-create">＋</span>
    </RouterLink>
    <button class="nav-item" @click="logout">
      <span class="nav-icon">🚪</span>
      <span class="nav-label">Salir</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  computed: {
    user() {
      const raw = localStorage.getItem('dnd_user')
      try {
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    role() {
      return this.user?.role || 'jugador'
    },
    isPlayer() {
      return this.role === 'jugador'
    },
    homePath() {
      if (this.role === 'administrador') return '/admin'
      if (this.role === 'dm') return '/dm'
      return '/home'
    },
    homeLabel() {
      if (this.role === 'administrador') return 'Admin'
      if (this.role === 'dm') return 'DM'
      return 'Personajes'
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('dnd_token')
      localStorage.removeItem('dnd_user')
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.5rem 1rem;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  transition: color 0.2s;
  font-family: var(--font-title);
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.nav-item.active, .nav-item:hover { color: var(--gold-light); }

.nav-icon { font-size: 1.3rem; line-height: 1; }
.nav-label { font-size: 0.6rem; }

.nav-create {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  padding: 0;
  box-shadow: 0 0 15px rgba(212,160,23,0.4);
  margin-bottom: 0.25rem;
}
.nav-icon-create {
  font-size: 1.6rem;
  color: var(--bg-deep);
  font-weight: bold;
  line-height: 1;
}
</style>