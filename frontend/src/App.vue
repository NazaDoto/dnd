<template>
  <div id="dnd-app">
    <NavBar v-if="auth.isAuthenticated.value" />
    <main
      :class="[
        'main-content',
        {
          'with-nav': auth.isAuthenticated.value,
          'main-content--dm': isDmLayout,
          'main-content--auth': isAuthLayout
        }
      ]"
    >
      <RouterView />
    </main>

    <DiceRollerWidget v-if="auth.isAuthenticated.value" />

    <div class="toast-container" role="status" aria-live="polite">
      <div
        v-for="t in toast.state.toasts"
        :key="t.id"
        :class="['toast', t.type]"
        @click="toast.dismiss(t.id)"
      >
        {{ t.msg }}
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue'
import DiceRollerWidget from './components/DiceRollerWidget.vue'
import { useAuth } from './stores/auth.js'
import { useToast } from './stores/toast.js'

export default {
  name: 'App',
  components: { NavBar, DiceRollerWidget },
  setup() {
    const auth = useAuth()
    const toast = useToast()
    return { auth, toast }
  },
  computed: {
    isDmLayout() {
      const p = this.$route?.path || ''
      return p === '/dm' || p.startsWith('/dm/')
    },
    isAuthLayout() {
      const p = this.$route?.path || ''
      return p === '/login' || p === '/register'
    }
  },
  provide() {
    return {
      showToast: (msg, type = 'info') => this.toast.showToast(msg, type)
    }
  }
}
</script>

<style>
html,
body,
#app {
  height: 100%;
  overflow: hidden;
}
#dnd-app {
  position: relative;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#dnd-app::before {
  content: '';
  position: fixed;
  inset: -2rem;
  background-image:
    linear-gradient(180deg, rgba(8, 6, 3, 0.62) 0%, rgba(13, 10, 7, 0.9) 100%),
    url('/bg.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(14px);
  z-index: -1;
  pointer-events: none;
}

@media (min-width: 1024px) {
  #dnd-app::before {
    background-position: center top;
  }
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.9rem;
  max-width: min(1100px, 100%);
  margin: 0 auto;
  width: 100%;
}
.main-content.main-content--auth {
  max-width: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main-content.main-content--dm {
  max-width: min(1200px, 100%);
}
.main-content.with-nav {
  padding-top: 0.9rem;
  padding-bottom: 5rem;
}

@media (min-width: 640px) {
  .main-content { padding: 1.25rem; }
}

@media (min-width: 1024px) {
  .main-content.with-nav {
    padding-top: 4.8rem;
    padding-bottom: 1.5rem;
  }
  .main-content.main-content--auth {
    max-width: 560px;
  }
}

.toast {
  cursor: pointer;
}
</style>
