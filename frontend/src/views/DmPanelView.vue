<template>
  <div class="dm-view">
    <div class="home-header">
      <div>
        <h1 class="home-title">Panel DM</h1>
        <p class="home-sub">Campañas y personajes vinculados</p>
      </div>
    </div>

    <div class="card mb-4">
      <p class="section-title">Nueva campaña</p>
      <div class="campaign-form">
        <input v-model="campaignForm.name" placeholder="Nombre de campaña" />
        <input v-model="campaignForm.setting_name" placeholder="Mundo / setting" />
        <select v-model="campaignForm.status">
          <option value="activa">activa</option>
          <option value="pausada">pausada</option>
          <option value="finalizada">finalizada</option>
        </select>
        <input v-model="campaignForm.start_date" type="date" />
        <input v-model="campaignForm.next_session_date" type="date" />
        <textarea v-model="campaignForm.summary" rows="3" placeholder="Resumen, trama, NPCs, objetivos..." />
        <button class="btn btn-primary" @click="createCampaign">Crear campaña</button>
      </div>
    </div>

    <div class="card mb-4">
      <p class="section-title">Campañas</p>
      <div v-if="loadingCampaigns" class="text-muted">Cargando campañas...</div>
      <div v-else-if="!campaigns.length" class="text-muted">Sin campañas todavía.</div>
      <div v-else class="table-wrap">
        <div v-for="c in campaigns" :key="c.id" class="campaign-row">
          <div>
            <strong>{{ c.name }}</strong>
            <p class="text-muted">{{ c.setting_name || 'Sin setting' }} · {{ c.status }}</p>
          </div>
          <div class="actions">
            <button class="btn btn-secondary" @click="downloadCampaign(c)">PDF</button>
            <button class="btn btn-danger" @click="deleteCampaign(c.id)">Eliminar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <p class="section-title">Personajes vinculados (sin notas)</p>
      <div v-if="loadingCharacters" class="text-muted">Cargando personajes...</div>
      <div v-else-if="!characters.length" class="text-muted">No hay personajes vinculados.</div>
      <div v-else class="table-wrap">
        <div v-for="char in characters" :key="char.id" class="campaign-row">
          <div>
            <strong>{{ char.name }}</strong>
            <p class="text-muted">{{ char.player_username }} · {{ char.race }} · {{ char.class }} Nv.{{ char.level }}</p>
          </div>
          <button class="btn btn-secondary" @click="downloadCharacter(char)">PDF</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { dmAPI } from '../services/api.js'
import { exportCampaignPdf, exportCharacterPdf } from '../services/pdfExport.js'

export default {
  name: 'DmPanelView',
  inject: ['showToast'],
  data() {
    return {
      campaigns: [],
      characters: [],
      loadingCampaigns: true,
      loadingCharacters: true,
      campaignForm: {
        name: '',
        setting_name: '',
        summary: '',
        status: 'activa',
        start_date: '',
        next_session_date: ''
      }
    }
  },
  async mounted() {
    await Promise.all([this.loadCampaigns(), this.loadCharacters()])
  },
  methods: {
    async loadCampaigns() {
      this.loadingCampaigns = true
      try {
        const { data } = await dmAPI.getCampaigns()
        this.campaigns = data
      } catch {
        this.showToast('No se pudieron cargar las campañas', 'error')
      } finally {
        this.loadingCampaigns = false
      }
    },
    async loadCharacters() {
      this.loadingCharacters = true
      try {
        const { data } = await dmAPI.getCharacters()
        this.characters = data
      } catch {
        this.showToast('No se pudieron cargar los personajes vinculados', 'error')
      } finally {
        this.loadingCharacters = false
      }
    },
    async createCampaign() {
      if (!this.campaignForm.name.trim()) {
        this.showToast('El nombre de campaña es obligatorio', 'error')
        return
      }
      try {
        await dmAPI.createCampaign(this.campaignForm)
        this.showToast('Campaña creada', 'success')
        this.campaignForm = { name: '', setting_name: '', summary: '', status: 'activa', start_date: '', next_session_date: '' }
        await this.loadCampaigns()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo crear la campaña', 'error')
      }
    },
    async deleteCampaign(id) {
      try {
        await dmAPI.deleteCampaign(id)
        this.showToast('Campaña eliminada', 'success')
        await this.loadCampaigns()
      } catch {
        this.showToast('No se pudo eliminar la campaña', 'error')
      }
    },
    downloadCampaign(campaign) {
      exportCampaignPdf(campaign, this.characters)
    },
    downloadCharacter(character) {
      exportCharacterPdf(character)
    }
  }
}
</script>

<style scoped>
.dm-view { display: flex; flex-direction: column; gap: 0.75rem; }
.home-header { margin-bottom: 0.5rem; }
.home-title { font-family: var(--font-display); font-size: 1.3rem; }
.home-sub { color: var(--text-muted); font-size: 0.9rem; }
.campaign-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.campaign-form textarea { grid-column: 1 / -1; }
.campaign-form button { justify-self: end; }
.table-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.campaign-row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
.actions { display: flex; gap: 0.4rem; }
@media (max-width: 520px) {
  .campaign-form { grid-template-columns: 1fr; }
  .campaign-row { flex-direction: column; align-items: stretch; }
  .actions { justify-content: flex-end; }
}
</style>
