<template>
  <div class="admin-view">
    <div class="home-header">
      <div>
        <h1 class="home-title">Panel Administrador</h1>
        <p class="home-sub">Control total de usuarios, campañas, personajes y vínculos</p>
      </div>
      <button type="button" class="btn btn-secondary" :disabled="refreshingAll" @click="refreshAll">
        {{ refreshingAll ? 'Actualizando...' : 'Actualizar todo' }}
      </button>
    </div>

    <div class="kpi-grid">
      <article class="card kpi-card">
        <span class="kpi-label">Usuarios</span>
        <strong class="kpi-value">{{ users.length }}</strong>
      </article>
      <article class="card kpi-card">
        <span class="kpi-label">Campañas</span>
        <strong class="kpi-value">{{ campaigns.length }}</strong>
      </article>
      <article class="card kpi-card">
        <span class="kpi-label">Personajes</span>
        <strong class="kpi-value">{{ allCharacters.length }}</strong>
      </article>
      <article class="card kpi-card">
        <span class="kpi-label">Vínculos</span>
        <strong class="kpi-value">{{ ccLinks.length }}</strong>
      </article>
    </div>

    <div class="card mb-3">
      <div class="section-head">
        <p class="section-title">Navegación admin</p>
        <div class="tabs" role="tablist" aria-label="Secciones del panel admin">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'users'" class="card mb-3">
      <div class="section-head">
        <p class="section-title">Usuarios</p>
        <input
          v-model.trim="userSearch"
          type="search"
          class="search-input"
          placeholder="Buscar por usuario, email o rol..."
        />
      </div>
      <div v-if="loadingUsers" class="text-muted">Cargando usuarios...</div>
      <div v-else-if="!filteredUsers.length" class="text-muted">No hay usuarios para este filtro.</div>
      <div v-else class="table-wrap">
        <div v-for="u in filteredUsers" :key="u.id" class="admin-row">
          <div>
            <strong>{{ u.username }}</strong>
            <p class="text-muted">{{ u.email }}</p>
          </div>
          <div class="row-actions">
            <span class="role-pill" :class="`role-${u.role}`">{{ u.role }}</span>
            <select :value="u.role" @change="changeRole(u.id, $event.target.value)">
              <option value="jugador">jugador</option>
              <option value="dm">dm</option>
              <option value="administrador">administrador</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'campaigns'" class="card mb-3">
      <div class="section-head">
        <p class="section-title">Campañas</p>
        <input
          v-model.trim="campaignSearch"
          type="search"
          class="search-input"
          placeholder="Buscar por campaña, DM, código o estado..."
        />
      </div>
      <div v-if="!filteredCampaigns.length" class="text-muted">No hay campañas para este filtro.</div>
      <div class="table-wrap">
        <div v-for="c in filteredCampaigns" :key="c.id" class="admin-row">
          <div>
            <strong>{{ c.name }}</strong>
            <p class="text-muted">DM: {{ c.dm_username }} · Código: {{ c.invite_code || 'sin código' }}</p>
          </div>
          <span class="role-pill role-campaign">{{ c.status || 'sin estado' }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'characters'" class="card mb-3">
      <div class="section-head">
        <p class="section-title">Personajes</p>
        <input
          v-model.trim="characterSearch"
          type="search"
          class="search-input"
          placeholder="Buscar por personaje, dueño, clase o raza..."
        />
      </div>
      <div v-if="!filteredCharacters.length" class="text-muted">No hay personajes para este filtro.</div>
      <div v-else class="table-wrap">
        <div v-for="ch in filteredCharacters" :key="ch.id" class="admin-row">
          <div>
            <strong>{{ ch.name }}</strong>
            <p class="text-muted">{{ ch.owner_username }} · {{ ch.race || 'raza -' }} · {{ ch.class || 'clase -' }} · Nv.{{ ch.level || 1 }}</p>
          </div>
          <button type="button" class="btn btn-secondary" @click="prepareAssignCharacter(ch.id)">
            Asignar a campaña
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card">
      <p class="section-title">Vínculos campaña ↔ personaje</p>
      <p class="hint">Podés asignar forzado y administrar todos los vínculos activos.</p>
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
      <div class="filter-row">
        <label class="form-label" for="filter-camp">Filtrar por campaña</label>
        <select id="filter-camp" v-model.number="filterCampaignId" @change="loadLinks">
          <option :value="null">Todas</option>
          <option v-for="c in campaigns" :key="'f-' + c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div v-if="loadingLinks" class="text-muted">Cargando vínculos...</div>
      <div v-else-if="!ccLinks.length" class="text-muted">No hay vínculos.</div>
      <div v-else class="table-wrap">
        <div v-for="l in ccLinks" :key="l.id" class="admin-row">
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
      tabs: [
        { id: 'users', label: 'Usuarios' },
        { id: 'campaigns', label: 'Campañas' },
        { id: 'characters', label: 'Personajes' },
        { id: 'links', label: 'Vínculos' },
      ],
      activeTab: 'users',
      users: [],
      campaigns: [],
      allCharacters: [],
      ccLinks: [],
      loadingUsers: true,
      loadingLinks: true,
      refreshingAll: false,
      assignCampaignId: null,
      assignCharacterId: null,
      filterCampaignId: null,
      userSearch: '',
      campaignSearch: '',
      characterSearch: ''
    }
  },
  computed: {
    filteredUsers() {
      const q = this.userSearch.toLowerCase()
      if (!q) return this.users
      return this.users.filter((u) =>
        [u.username, u.email, u.role].some((v) => String(v || '').toLowerCase().includes(q)),
      )
    },
    filteredCampaigns() {
      const q = this.campaignSearch.toLowerCase()
      if (!q) return this.campaigns
      return this.campaigns.filter((c) =>
        [c.name, c.dm_username, c.invite_code, c.status].some((v) => String(v || '').toLowerCase().includes(q)),
      )
    },
    filteredCharacters() {
      const q = this.characterSearch.toLowerCase()
      if (!q) return this.allCharacters
      return this.allCharacters.filter((ch) =>
        [ch.name, ch.owner_username, ch.class, ch.race].some((v) => String(v || '').toLowerCase().includes(q)),
      )
    },
  },
  async mounted() {
    await Promise.all([this.loadUsers(), this.loadCampaigns(), this.loadAllCharacters(), this.loadLinks()])
  },
  methods: {
    async refreshAll() {
      this.refreshingAll = true
      try {
        await Promise.all([this.loadUsers(), this.loadCampaigns(), this.loadAllCharacters(), this.loadLinks()])
        this.showToast('Panel actualizado', 'success')
      } catch {
        this.showToast('No se pudo actualizar todo el panel', 'error')
      } finally {
        this.refreshingAll = false
      }
    },
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
    prepareAssignCharacter(characterId) {
      this.assignCharacterId = characterId
      this.activeTab = 'links'
      this.showToast('Personaje seleccionado para asignar', 'success')
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
.home-header { margin-bottom: 0.5rem; display: flex; align-items: flex-end; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.home-title { font-family: var(--font-display); font-size: 1.3rem; }
.home-sub { color: var(--text-muted); font-size: 0.9rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
.kpi-card { display: flex; flex-direction: column; gap: 0.2rem; }
.kpi-label { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
.kpi-value { font-size: 1.45rem; line-height: 1.1; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.65rem; }
.tabs { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.tab-btn { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 999px; padding: 0.3rem 0.75rem; cursor: pointer; }
.tab-btn.active { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.search-input { width: min(100%, 360px); }
.table-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.admin-row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.45rem; flex-wrap: wrap; }
.row-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.link-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; }
.hint { font-size: 0.78rem; color: var(--text-muted); margin: -0.25rem 0 0.5rem; line-height: 1.4; }
.filter-row { margin-bottom: 0.65rem; }
.filter-row select { max-width: 100%; }
.role-pill { border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.73rem; font-weight: 700; text-transform: capitalize; border: 1px solid var(--border); }
.role-administrador { color: #7d3af2; border-color: #7d3af2; background: #7d3af21a; }
.role-dm { color: #0f766e; border-color: #0f766e; background: #0f766e1a; }
.role-jugador { color: #1f4bb8; border-color: #1f4bb8; background: #1f4bb81a; }
.role-campaign { color: #6a4f1e; border-color: #6a4f1e; background: #6a4f1e1a; }
@media (max-width: 520px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .link-form { grid-template-columns: 1fr; }
}
</style>
