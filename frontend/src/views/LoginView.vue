<template>
  <div class="auth-page">
    <div class="auth-logo">
      <h1 class="logo-title">Wachines del DnD</h1>
      <p class="logo-sub">Guardá la leyenda de tus héroes</p>
    </div>

    <div class="card auth-card">
      <h2 class="section-title" style="text-align:center">Ingresar</h2>

      <form @submit.prevent="login" class="auth-form">
        <div class="form-group">
          <label class="form-label">Usuario</label>
          <input
            v-model.trim="username"
            type="text"
            placeholder="Tu nombre de usuario"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <div class="input-pwd">
            <input
              v-model="password"
              :type="showPwd ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
            <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="form-error text-center mt-2">{{ error }}</p>

        <button type="submit" class="btn btn-primary btn-full mt-4" :disabled="loading">
          <span
            v-if="loading"
            class="spinner"
            style="width:1rem;height:1rem;border-width:2px"
          ></span>
          {{ loading ? 'Entrando...' : '⚔️ Ingresar' }}
        </button>
      </form>

      <div class="divider">o</div>

      <RouterLink to="/register" class="btn btn-secondary btn-full">
        Crear cuenta
      </RouterLink>
    </div>

    <p class="auth-deco">⚜ Que los dados te sean favorables ⚜</p>
  </div>
</template>

<script>
import { authAPI } from '../services/api.js'

export default {
  name: 'LoginView',
  inject: ['showToast'],
  data() {
    return {
      username: '',
      password: '',
      error: '',
      loading: false,
      showPwd: false
    }
  },
  methods: {
    async login() {
      this.error = ''
      this.loading = true

      try {
        const { data } = await authAPI.login({
          username: this.username,
          password: this.password
        })

        localStorage.setItem('dnd_token', data.token)
        localStorage.setItem('dnd_user', JSON.stringify(data.user))

        const r = data.user?.role
        if (r === 'administrador') this.$router.push('/admin')
        else if (r === 'dm') this.$router.push('/dm')
        else this.$router.push('/home')
      } catch (err) {
        this.error = err.response?.data?.message || 'Error al ingresar'
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
  min-height: 100dvh;
  padding: 1.5rem;
  gap: 1.5rem;
}

.auth-logo {
  text-align: center;
}

.logo-title {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}

.logo-sub {
  color: var(--text-muted);
  font-style: italic;
  margin-top: 0.25rem;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-pwd {
  position: relative;
}

.input-pwd input {
  padding-right: 2.5rem;
}

.pwd-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.auth-deco {
  font-family: var(--font-title);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  text-align: center;
}
</style>