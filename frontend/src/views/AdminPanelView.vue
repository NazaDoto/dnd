<template>
  <div class="admin-view">
    <div class="home-header">
      <div>
        <h1 class="home-title">Panel Administrador</h1>
        <p class="home-sub">Gestión de usuarios y vínculos DM/Jugador</p>
      </div>
    </div>

    <div class="card mb-4">
      <p class="section-title">Usuarios</p>
      <div v-if="loadingUsers" class="text-muted">Cargando usuarios...</div>
      <div v-else class="table-wrap">
        <div v-for="u in users" :key="u.id" class="row">
          <div>
            <strong>{{ u.username }}</strong>
            <p class="text-muted">{{ u.email }}</p>
          </div>
          <select :value="u.role" @change="changeRole(u.id, $event.target.value)">
            <option value="jugador">jugador</option>
            <option value="dm">dm</option>
            <option value="administrador">administrador</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <p class="section-title">Vincular Jugador a DM</p>
      <div class="link-form">
        <select v-model.number="selectedDmId">
          <option :value="null">Seleccionar DM</option>
          <option v-for="u in dmUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
        </select>
        <select v-model.number="selectedPlayerId">
          <option :value="null">Seleccionar Jugador</option>
          <option v-for="u in playerUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
        </select>
        <button class="btn btn-primary" @click="linkPlayer">Vincular</button>
      </div>
    </div>

    <div class="card">
      <p class="section-title">Vínculos actuales</p>
      <div v-if="loadingLinks" class="text-muted">Cargando vínculos...</div>
      <div v-else-if="!links.length" class="text-muted">No hay vínculos creados.</div>
      <div v-else class="table-wrap">
        <div v-for="l in links" :key="l.id" class="row">
          <div>
            <strong>{{ l.player_username }}</strong>
            <p class="text-muted">DM: {{ l.dm_username }}</p>
          </div>
          <button class="btn btn-danger" @click="deleteLink(l.id)">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { adminAPI } from '../services/api.js'

export default {
  name: 'AdminPanelView',
  inject: ['showToast'],
  data() {
    return {
      users: [],
      links: [],
      loadingUsers: true,
      loadingLinks: true,
      selectedDmId: null,
      selectedPlayerId: null
    }
  },
  computed: {
    dmUsers() { return this.users.filter(u => u.role === 'dm') },
    playerUsers() { return this.users.filter(u => u.role === 'jugador') }
  },
  async mounted() {
    await Promise.all([this.loadUsers(), this.loadLinks()])
  },
  methods: {
    async loadUsers() {
      this.loadingUsers = true
      try {
        const { data } = await adminAPI.getUsers()
        this.users = data
      } catch {
        this.showToast('No se pudieron cargar los usuarios', 'error')
      } finally {
        this.loadingUsers = false
      }
    },
    async loadLinks() {
      this.loadingLinks = true
      try {
        const { data } = await adminAPI.getLinks()
        this.links = data
      } catch {
        this.showToast('No se pudieron cargar los vínculos', 'error')
      } finally {
        this.loadingLinks = false
      }
    },
    async changeRole(userId, role) {
      try {
        await adminAPI.updateUserRole(userId, role)
        this.showToast('Rol actualizado', 'success')
        await Promise.all([this.loadUsers(), this.loadLinks()])
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo actualizar el rol', 'error')
      }
    },
    async linkPlayer() {
      if (!this.selectedDmId || !this.selectedPlayerId) {
        this.showToast('Selecciona DM y jugador', 'error')
        return
      }
      try {
        await adminAPI.createLink(this.selectedDmId, this.selectedPlayerId)
        this.showToast('Jugador vinculado', 'success')
        this.selectedPlayerId = null
        await this.loadLinks()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo vincular', 'error')
      }
    },
    async deleteLink(id) {
      try {
        await adminAPI.deleteLink(id)
        this.showToast('Vínculo eliminado', 'success')
        await this.loadLinks()
      } catch {
        this.showToast('No se pudo eliminar el vínculo', 'error')
      }
    }
  }
}
</script>

<style scoped>
.admin-view { display: flex; flex-direction: column; gap: 0.75rem; }
.home-header { margin-bottom: 0.5rem; }
.home-title { font-family: var(--font-display); font-size: 1.3rem; }
.home-sub { color: var(--text-muted); font-size: 0.9rem; }
.table-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
.link-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; }
@media (max-width: 520px) {
  .link-form { grid-template-columns: 1fr; }
}
</style>
