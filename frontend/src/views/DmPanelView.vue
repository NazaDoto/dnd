<template>
  <div class="dm-view">
    <div class="home-header">
      <div>
        <h1 class="home-title">Panel DM</h1>
        <p class="home-sub">Campañas: entrá a cada una para editar datos, preparar sesiones y gestionar personajes.</p>
      </div>
    </div>

    <div class="card mb-3">
      <p class="section-title">Nueva campaña</p>
      <div class="create-row">
        <input v-model="newName" placeholder="Nombre de la campaña" />
        <button type="button" class="btn btn-primary" :disabled="creating" @click="createCampaign">
          {{ creating ? 'Creando...' : 'Crear' }}
        </button>
      </div>
      <p class="hint">Después podés completar mundo, NPCs, preparación y roster desde la vista de campaña.</p>
    </div>

    <div class="card">
      <p class="section-title">Mis campañas</p>
      <div v-if="loading" class="text-muted">Cargando...</div>
      <div v-else-if="!campaigns.length" class="text-muted">Todavía no tenés campañas.</div>
      <div v-else class="table-wrap">
        <div v-for="c in campaigns" :key="c.id" class="campaign-row">
          <div class="campaign-main">
            <strong>{{ c.name }}</strong>
            <p class="text-muted">
              {{ c.setting_name || 'Sin ambientación' }} · {{ c.status }}
              <span v-if="c.active_pc_count != null"> · {{ c.active_pc_count }} PJ</span>
              <span v-if="c.pending_count"> · {{ c.pending_count }} pendiente(s)</span>
            </p>
            <p class="code-line">
              Código: <code>{{ c.invite_code }}</code>
            </p>
          </div>
          <div class="actions">
            <RouterLink :to="`/dm/campaign/${c.id}`" class="btn btn-primary">Abrir</RouterLink>
            <button type="button" class="btn btn-danger" @click="removeCampaign(c.id)">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { dmAPI } from '../services/api.js'

export default {
  name: 'DmPanelView',
  inject: ['showToast'],
  data() {
    return {
      campaigns: [],
      loading: true,
      newName: '',
      creating: false
    }
  },
  async mounted() {
    await this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const { data } = await dmAPI.getCampaigns()
        this.campaigns = data
      } catch {
        this.showToast('No se pudieron cargar las campañas', 'error')
      } finally {
        this.loading = false
      }
    },
    async createCampaign() {
      if (!this.newName.trim()) {
        this.showToast('Escribí un nombre', 'error')
        return
      }
      this.creating = true
      try {
        const { data } = await dmAPI.createCampaign({ name: this.newName.trim() })
        this.showToast('Campaña creada', 'success')
        this.newName = ''
        await this.load()
        if (data?.id) this.$router.push(`/dm/campaign/${data.id}`)
      } catch (err) {
        this.showToast(err.response?.data?.message || 'Error al crear', 'error')
      } finally {
        this.creating = false
      }
    },
    async removeCampaign(id) {
      if (!confirm('¿Eliminar esta campaña y todo su roster?')) return
      try {
        await dmAPI.deleteCampaign(id)
        this.showToast('Campaña eliminada', 'success')
        await this.load()
      } catch {
        this.showToast('No se pudo eliminar', 'error')
      }
    }
  }
}
</script>

<style scoped>
.dm-view {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-width: 100%;
}
.home-header { margin-bottom: 0.35rem; }
.home-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  line-height: 1.2;
}
.home-sub {
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
  max-width: 65ch;
}
.create-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.create-row input { flex: 1; min-width: 160px; }
.hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  line-height: 1.4;
  max-width: 70ch;
}
.table-wrap { display: flex; flex-direction: column; gap: 0.55rem; }
.campaign-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.65rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
.campaign-main { flex: 1; min-width: 0; }
.code-line {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
.code-line code {
  font-family: ui-monospace, monospace;
  color: var(--gold-light);
  font-size: 0.78rem;
}
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }

@media (min-width: 720px) {
  .home-title { font-size: 1.55rem; }
  .home-sub { font-size: 0.92rem; }
  .create-row {
    flex-wrap: nowrap;
    max-width: 48rem;
  }
  .create-row input {
    flex: 1 1 auto;
    min-width: 220px;
    max-width: 28rem;
  }
  .campaign-row {
    flex-wrap: nowrap;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.35rem;
  }
  .campaign-row:last-child { margin-bottom: 0; }
  .actions {
    flex-wrap: nowrap;
    flex-shrink: 0;
  }
}
</style>
