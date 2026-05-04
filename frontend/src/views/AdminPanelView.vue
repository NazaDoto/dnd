<template>
  <div class="admin-view">
    <div class="home-header">
      <div>
        <h1 class="home-title">Panel Administrador</h1>
        <p class="home-sub">Usuarios y asignación de personajes a campañas</p>
      </div>
    </div>

    <div class="card mb-3">
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

    <div class="card mb-3">
      <p class="section-title">Asignar personaje a campaña</p>
      <p class="hint">El personaje queda activo en el roster sin pasar por solicitud del jugador.</p>
      <div class="link-form">
        <select v-model.number="assignCampaignId">
          <option :value="null">Elegir campaña</option>
          <option v-for="c in campaigns" :key="c.id" :value="c.id">
            {{ c.name }} ({{ c.dm_username }})
          </option>
        </select>
        <select v-model.number="assignCharacterId">
          <option :value="null">Elegir personaje</option>
          <option v-for="ch in allCharacters" :key="ch.id" :value="ch.id">
            {{ ch.name }} — {{ ch.owner_username }} (Nv.{{ ch.level }})
          </option>
        </select>
        <button type="button" class="btn btn-primary" @click="assignToCampaign">Asignar</button>
      </div>
    </div>

    <div class="card">
      <p class="section-title">Vínculos campaña ↔ personaje</p>
      <div class="filter-row">
        <label class="form-label" for="filter-camp">Filtrar por campaña</label>
        <select id="filter-camp" v-model.number="filterCampaignId" @change="loadLinks">
          <option :value="null">Todas</option>
          <option v-for="c in campaigns" :key="'f-' + c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div v-if="loadingLinks" class="text-muted">Cargando...</div>
      <div v-else-if="!ccLinks.length" class="text-muted">No hay vínculos.</div>
      <div v-else class="table-wrap">
        <div v-for="l in ccLinks" :key="l.id" class="row">
          <div>
            <strong>{{ l.character_name }}</strong>
            <p class="text-muted">{{ l.campaign_name }} · {{ l.owner_username }} · {{ l.status }}</p>
          </div>
          <button type="button" class="btn btn-danger" @click="removeLink(l.id)">Eliminar</button>
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
      campaigns: [],
      allCharacters: [],
      ccLinks: [],
      loadingUsers: true,
      loadingLinks: true,
      assignCampaignId: null,
      assignCharacterId: null,
      filterCampaignId: null
    }
  },
  async mounted() {
    await Promise.all([this.loadUsers(), this.loadCampaigns(), this.loadAllCharacters(), this.loadLinks()])
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
    async loadCampaigns() {
      try {
        const { data } = await adminAPI.getCampaigns()
        this.campaigns = data
      } catch {
        this.showToast('No se pudieron cargar las campañas', 'error')
      }
    },
    async loadAllCharacters() {
      try {
        const { data } = await adminAPI.getAllCharacters()
        this.allCharacters = data
      } catch {
        this.showToast('No se pudieron cargar los personajes', 'error')
      }
    },
    async loadLinks() {
      this.loadingLinks = true
      try {
        const { data } = await adminAPI.getCampaignCharacters(this.filterCampaignId || undefined)
        this.ccLinks = data
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
        await this.loadUsers()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo actualizar el rol', 'error')
      }
    },
    async assignToCampaign() {
      if (!this.assignCampaignId || !this.assignCharacterId) {
        this.showToast('Elegí campaña y personaje', 'error')
        return
      }
      try {
        await adminAPI.assignCharacterToCampaign(this.assignCampaignId, this.assignCharacterId)
        this.showToast('Personaje asignado', 'success')
        this.assignCharacterId = null
        await this.loadLinks()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo asignar', 'error')
      }
    },
    async removeLink(id) {
      if (!confirm('¿Eliminar este vínculo?')) return
      try {
        await adminAPI.removeCampaignCharacter(id)
        this.showToast('Eliminado', 'success')
        await this.loadLinks()
      } catch {
        this.showToast('No se pudo eliminar', 'error')
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
.row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; flex-wrap: wrap; }
.link-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; }
.hint { font-size: 0.78rem; color: var(--text-muted); margin: -0.25rem 0 0.5rem; line-height: 1.4; }
.filter-row { margin-bottom: 0.65rem; }
.filter-row select { max-width: 100%; }
@media (max-width: 520px) {
  .link-form { grid-template-columns: 1fr; }
}
</style>
