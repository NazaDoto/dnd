<template>
  <nav class="navbar">
    <RouterLink :to="homePath" class="nav-item nav-home" active-class="active">
      <span class="nav-label nav-label-mobile">{{ homeLabel }}</span>
      <span class="nav-label nav-label-desktop">Wachines del DnD</span>
    </RouterLink>
    <button type="button" class="nav-item nav-logout" @click="logout">
      <span class="nav-label">Salir</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  props: {
    user: {
      type: Object,
      default: null
    }
  },
  computed: {
    role() {
      return this.user?.role || 'jugador'
    },
    homePath() {
      if (this.role === 'administrador') return '/admin'
      if (this.role === 'dm') return '/dm'
      return '/home'
    },
    homeLabel() {
      return 'Inicio'
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('dnd_token')
      localStorage.removeItem('dnd_user')
      window.dispatchEvent(new Event('dnd-auth-changed'))
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
  justify-content: center;
  gap: 0.15rem;
  min-height: 2.5rem;
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

.nav-label { font-size: 0.6rem; text-align: center; max-width: 4.5rem; line-height: 1.15; }
.nav-label-desktop { display: none; }

@media (min-width: 1024px) {
  .navbar {
    top: 0;
    bottom: auto;
    margin: 0 auto;
    width: min(1100px, 100%);
    justify-content: flex-start;
    gap: 0.65rem;
    border-top: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0 0 var(--radius) var(--radius);
    padding: 0.55rem 1.1rem;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  }
  .nav-home {
    padding-left: 0.35rem;
  }
  .nav-label-mobile {
    display: none;
  }
  .nav-label-desktop {
    display: inline;
    font-family: var(--font-display);
    font-size: 1.2rem;
    text-transform: none;
    letter-spacing: 0.02em;
    line-height: 1;
  }
  .nav-item {
    flex-direction: row;
    min-height: 2.1rem;
    font-size: 0.72rem;
    padding: 0.35rem 0.85rem;
    border: 1px solid transparent;
  }
  .nav-item.active {
    border-color: var(--border);
    background: var(--bg-surface);
  }
  .nav-label {
    font-size: 0.72rem;
    max-width: none;
  }
  .nav-logout {
    margin-left: auto;
  }
}
</style>