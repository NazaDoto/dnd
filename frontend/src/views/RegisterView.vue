<template>
  <div class="auth-page">
    <div class="auth-logo">
      <h1 class="logo-title">Wachines del Dnd</h1>
      <p class="logo-sub">Únete a la aventura</p>
    </div>

    <div class="card auth-card">
      <h2 class="section-title" style="text-align:center">Crear Cuenta</h2>

      <form @submit.prevent="register" class="auth-form">
        <div class="form-group">
          <label class="form-label">Usuario</label>
          <input v-model="username" type="text" placeholder="Gandalf el Gris" required minlength="3" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="email" type="email" placeholder="aventurero@taverna.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <input v-model="password" type="password" placeholder="Mínimo 6 caracteres" required minlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Contraseña</label>
          <input v-model="confirm" type="password" placeholder="••••••••" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="register-role">Tipo de cuenta</label>
          <select id="register-role" v-model="role" class="register-role-select" aria-label="Tipo de cuenta">
            <option value="jugador">Jugador — personajes y notas</option>
            <option value="dm">Maestro (DM) — campañas y fichas vinculadas</option>
          </select>
        </div>

        <p v-if="error" class="form-error text-center mt-2">{{ error }}</p>

        <button type="submit" class="btn btn-primary btn-full mt-4" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:1rem;height:1rem;border-width:2px"></span>
          {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
        </button>
      </form>

      <div class="divider">ya tenés cuenta</div>

      <RouterLink to="/login" class="btn btn-secondary btn-full">Ingresar</RouterLink>
    </div>
  </div>
</template>

<script>
import { authAPI } from '../services/api.js'

export default {
  name: 'RegisterView',
  inject: ['showToast'],
  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirm: '',
      role: 'jugador',
      error: '',
      loading: false
    }
  },
  methods: {
    homeForRole(r) {
      if (r === 'administrador') return '/admin'
      if (r === 'dm') return '/dm'
      return '/home'
    },
    async register() {
      this.error = ''
      if (this.password !== this.confirm) {
        this.error = 'Las contraseñas no coinciden'
        return
      }
      this.loading = true
      try {
        const { data } = await authAPI.register({
          username: this.username,
          email: this.email,
          password: this.password,
          role: this.role
        })
        localStorage.setItem('dnd_token', data.token)
        localStorage.setItem('dnd_user', JSON.stringify(data.user))
        window.dispatchEvent(new Event('dnd-auth-changed'))
        this.showToast('¡Cuenta creada!', 'success')
        this.$router.push(this.homeForRole(data.user?.role))
      } catch (err) {
        this.error = err.response?.data?.message || 'Error al registrarse'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  width: 100%;
  padding: 1rem;
  gap: 1.5rem;
}
.logo-title {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.auth-logo { text-align: center; }
.logo-sub { color: var(--text-muted); font-style: italic; margin-top: 0.25rem; }
.auth-card { width: 100%; max-width: 380px; }
.auth-form { display: flex; flex-direction: column; gap: 0.75rem; }
/* Refuerzo local: texto largo en opciones + alineación vertical */
.register-role-select {
  font-size: 0.95rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}

@media (min-width: 1024px) {
  .auth-page {
    padding: 1.25rem 1rem;
    gap: 1rem;
  }
}
</style>