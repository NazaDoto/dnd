<template>
  <div class="dm-campaign" v-if="loaded">
    <div class="campaign-top">
      <button type="button" class="btn btn-ghost btn-icon" @click="$router.push('/dm')">‹</button>
      <div class="campaign-top-main">
        <h1 class="campaign-title">{{ form.name || 'Campaña' }}</h1>
        <p class="campaign-meta text-muted">
          Código de invitación: <code class="invite-code">{{ form.invite_code }}</code>
        </p>
      </div>
      <div class="campaign-top-actions">
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="saveAll">Guardar</button>
        <button type="button" class="btn btn-ghost" @click="rotateInvite">Nuevo código</button>
        <button type="button" class="btn btn-secondary" @click="downloadPdf">PDF</button>
      </div>
    </div>

    <div class="dm-split">
      <div class="tabs" role="tablist" aria-label="Secciones de campaña">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tab === t.id"
          :class="['tab-btn', { active: tab === t.id }]"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="tab-panels">
    <!-- Resumen -->
    <div v-show="tab === 'core'" class="tab-panel">
      <div class="card mb-3">
        <p class="section-title">Datos generales</p>
        <div class="grid-2 grid-core-desk">
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input v-model="form.name" />
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select v-model="form.status">
              <option value="activa">Activa</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Mundo / ambientación</label>
            <input v-model="form.setting_name" placeholder="Ej. Faerûn, mundo homebrew..." />
          </div>
          <div class="form-group">
            <label class="form-label">Próxima sesión</label>
            <input v-model="form.next_session_date" type="date" />
          </div>
          <div class="form-group">
            <label class="form-label">Inicio aproximado</label>
            <input v-model="form.start_date" type="date" />
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">Resumen visible (elevator pitch)</label>
          <textarea v-model="form.summary" rows="4" placeholder="De qué va la campaña en unas pocas frases..." />
        </div>
        <div class="form-group">
          <label class="form-label">Gancho principal (1 línea)</label>
          <input v-model="form.campaign_hook" placeholder="Ej. Los héroes deben impedir que el pacto se cumpla antes de la luna nueva." />
        </div>
      </div>
    </div>

    <!-- Trama y mundo -->
    <div v-show="tab === 'world'" class="tab-panel">
      <div class="world-desk-grid">
        <div class="card mb-3 world-main-card">
        <p class="section-title">Trama y fuerzas</p>
        <p class="hint">Inspirado en guías tipo “Lazy DM”: verdades del mundo, frentes y antagonistas, pistas.</p>
        <div class="form-group">
          <label class="form-label">Verdades / temas del mundo</label>
          <textarea v-model="form.themes_truths" rows="5" placeholder="Qué es verdad en tu setting: facciones, tabúes, leyes mágicas..." />
        </div>
        <div class="form-group">
          <label class="form-label">Frentes, antagonistas, relojes</label>
          <textarea v-model="form.fronts_antagonists" rows="5" placeholder="Quién empuja la trama, qué pasa si nadie actúa..." />
        </div>
        <div class="form-group">
          <label class="form-label">Misiones / quests activas</label>
          <textarea v-model="form.active_quests" rows="4" />
        </div>
        <div class="form-group">
          <label class="form-label">Ubicaciones y mapas (notas)</label>
          <textarea v-model="form.locations_maps" rows="4" placeholder="Taberna del Puerto, Torre Oeste, enlace a mapa externo..." />
        </div>
        <div class="form-group">
          <label class="form-label">Enlaces y recursos</label>
          <textarea v-model="form.resources_links" rows="3" placeholder="URLs a VTT, carpetas, PDFs..." />
        </div>
        </div>

        <div class="world-desk-side">
      <div class="card mb-3">
        <p class="section-title">NPCs (rápido)</p>
        <p class="hint">Nombre, rol o función, notas breves. Podés agregar filas.</p>
        <div v-for="(npc, idx) in npcList" :key="idx" class="npc-row card inner-card">
          <input v-model="npc.name" placeholder="Nombre" />
          <input v-model="npc.role" placeholder="Rol (tabernero, villano...)" />
          <textarea v-model="npc.notes" rows="2" placeholder="Notas" />
          <button type="button" class="btn btn-danger btn-sm" @click="removeNpc(idx)">Quitar</button>
        </div>
        <button type="button" class="btn btn-secondary mt-2" @click="addNpc">Agregar NPC</button>
      </div>

      <div class="card">
        <p class="section-title">Reglas de mesa</p>
        <textarea v-model="form.house_rules" rows="4" placeholder="Variantes, límites de PvP, descansos, líneas y velos..." />
      </div>
        </div>
      </div>
    </div>

    <!-- Preparación de sesión -->
    <div v-show="tab === 'session'" class="tab-panel">
      <div class="session-desk-top">
      <div class="card mb-3">
        <p class="section-title">Preparación próxima sesión</p>
        <p class="hint">Checklist mental: fuerte inicio, escenas posibles, secretos, encuentros.</p>
        <textarea v-model="form.session_prep" rows="8" placeholder="Strong start, posibles escenas, pistas, encuentros, ítems..." />
      </div>
      <div class="card mb-3">
        <p class="section-title">Resumen última sesión</p>
        <textarea v-model="form.last_session_recap" rows="6" placeholder="Qué pasó, decisiones de los PJ, consecuencias..." />
      </div>
      </div>
      <div class="session-desk-bottom">
      <div class="card mb-3">
        <p class="section-title">Tesoro / botín compartido (notas)</p>
        <textarea v-model="form.treasure_log" rows="4" />
      </div>
      <div class="card">
        <p class="section-title">Notas privadas del DM</p>
        <p class="hint">Solo vos; no la ven los jugadores en la app.</p>
        <textarea v-model="form.dm_private_notes" rows="6" />
      </div>
      </div>
    </div>

    <!-- Roster -->
    <div v-show="tab === 'roster'" class="tab-panel">
      <div class="roster-desk-grid">
      <div class="card mb-3">
        <p class="section-title">Personajes en campaña</p>
        <div v-if="!roster.active.length" class="text-muted">Nadie aceptado aún. Los jugadores pueden pedir ingreso con el código.</div>
        <div v-else class="roster-list">
          <div v-for="row in roster.active" :key="row.id" class="roster-row">
            <div class="roster-main">
              <strong>{{ row.name }}</strong>
              <p class="text-muted">{{ row.player_username }} · {{ row.race }} {{ row.class }} Nv.{{ row.level }}</p>
              <div class="roster-stats">
                <span class="stat-pill stat-pill-ca">CA {{ row.armor_class ?? '-' }}</span>
                <div class="stat-pill stat-pill-hp">
                  <button type="button" class="hp-step" @click="adjustMemberHp(row, -1)">-</button>
                  <span>PV {{ row.hit_points_current ?? 0 }}/{{ row.hit_points_max ?? 0 }}</span>
                  <button type="button" class="hp-step" @click="adjustMemberHp(row, 1)">+</button>
                </div>
              </div>
            </div>
            <div class="roster-actions">
              <RouterLink :to="`/dm/campaign/${cid}/character/${row.id}`" class="btn btn-secondary">Ver ficha</RouterLink>
              <button type="button" class="btn btn-ghost" @click="pdfOne(row)">PDF</button>
              <button type="button" class="btn btn-danger" @click="removeMember(row.link_id)">Quitar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card roster-pending-card">
        <p class="section-title">Solicitudes pendientes</p>
        <div v-if="!roster.pending.length" class="text-muted">No hay solicitudes.</div>
        <div v-else class="roster-list">
          <div v-for="p in roster.pending" :key="p.link_id" class="roster-row">
            <div>
              <strong>{{ p.character_name }}</strong>
              <p class="text-muted">{{ p.player_username }}</p>
            </div>
            <div class="roster-actions">
              <button type="button" class="btn btn-primary" @click="acceptPending(p.link_id)">Aceptar</button>
              <button type="button" class="btn btn-secondary" @click="rejectPending(p.link_id)">Rechazar</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
      </div>
    </div>
  </div>

  <div v-else class="loading-screen">
    <div class="spinner"></div>
    <span>Cargando campaña...</span>
  </div>
  <PdfFormatModal
    v-if="pdfModalOpen && pdfCharacter"
    @cancel="closePdfModal"
    @choose="downloadCharacterPdfByFormat"
  />
</template>

<script>
import { dmAPI } from '../services/api.js'
import { exportCampaignPdf, exportCharacterPdf } from '../services/pdfExport.js'
import PdfFormatModal from '../components/PdfFormatModal.vue'

const emptyForm = () => ({
  name: '',
  invite_code: '',
  status: 'activa',
  setting_name: '',
  summary: '',
  start_date: '',
  next_session_date: '',
  campaign_hook: '',
  themes_truths: '',
  fronts_antagonists: '',
  locations_maps: '',
  session_prep: '',
  last_session_recap: '',
  active_quests: '',
  treasure_log: '',
  house_rules: '',
  dm_private_notes: '',
  resources_links: ''
})

export default {
  name: 'DmCampaignDetailView',
  components: { PdfFormatModal },
  inject: ['showToast'],
  data() {
    return {
      loaded: false,
      saving: false,
      tab: 'core',
      tabs: [
        { id: 'core', label: 'Resumen' },
        { id: 'world', label: 'Mundo y trama' },
        { id: 'session', label: 'Sesión' },
        { id: 'roster', label: 'Personajes' }
      ],
      form: emptyForm(),
      npcList: [],
      roster: { active: [], pending: [] },
      pdfModalOpen: false,
      pdfCharacter: null
    }
  },
  computed: {
    cid() {
      return this.$route.params.id
    }
  },
  async mounted() {
    await this.reload()
  },
  methods: {
    normalizeNpcs(val) {
      if (!val) return []
      if (Array.isArray(val)) {
        return val.map((n) => ({
          name: n.name || '',
          role: n.role || '',
          notes: n.notes || ''
        }))
      }
      return []
    },
    applyCampaignToForm(c) {
      this.form = { ...emptyForm(), ...c }
      this.npcList = this.normalizeNpcs(c.npcs_json)
    },
    buildPayload() {
      const npcs_json = this.npcList
        .filter((n) => (n.name || '').trim() || (n.role || '').trim() || (n.notes || '').trim())
        .map((n) => ({
          name: (n.name || '').trim(),
          role: (n.role || '').trim(),
          notes: (n.notes || '').trim()
        }))
      return { ...this.form, npcs_json }
    },
    async reload() {
      this.loaded = false
      try {
        const [{ data: camp }, { data: roster }] = await Promise.all([
          dmAPI.getCampaign(this.cid),
          dmAPI.getRoster(this.cid)
        ])
        this.applyCampaignToForm(camp)
        this.roster = roster
      } catch {
        this.showToast('No se pudo cargar la campaña', 'error')
        this.$router.push('/dm')
        return
      }
      this.loaded = true
    },
    async saveAll() {
      if (!this.form.name || !String(this.form.name).trim()) {
        this.showToast('El nombre es obligatorio', 'error')
        return
      }
      this.saving = true
      try {
        await dmAPI.updateCampaign(this.cid, this.buildPayload())
        this.showToast('Guardado', 'success')
        await this.reload()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'Error al guardar', 'error')
      } finally {
        this.saving = false
      }
    },
    async rotateInvite() {
      try {
        const { data } = await dmAPI.rotateInvite(this.cid)
        this.form.invite_code = data.invite_code
        this.showToast(data.message || 'Código actualizado', 'success')
      } catch {
        this.showToast('No se pudo generar código', 'error')
      }
    },
    downloadPdf() {
      exportCampaignPdf(this.buildPayload(), this.roster.active)
    },
    async pdfOne(row) {
      this.pdfCharacter = row
      this.pdfModalOpen = true
    },
    closePdfModal() {
      this.pdfModalOpen = false
      this.pdfCharacter = null
    },
    async downloadCharacterPdfByFormat(format) {
      if (!this.pdfCharacter) return
      const character = this.pdfCharacter
      this.closePdfModal()
      try {
        console.log('[pdf-ui] DmCampaignDetailView download', { format, id: character?.id, name: character?.name })
        await exportCharacterPdf(character, { format })
      } catch (error) {
        console.error('[pdf-ui] DmCampaignDetailView download failed', error)
        this.showToast('No se pudo generar el PDF del personaje', 'error')
      }
    },
    addNpc() {
      this.npcList.push({ name: '', role: '', notes: '' })
    },
    removeNpc(i) {
      this.npcList.splice(i, 1)
    },
    async acceptPending(linkId) {
      try {
        await dmAPI.rosterAccept(this.cid, linkId)
        this.showToast('Personaje aceptado', 'success')
        await this.reload()
      } catch {
        this.showToast('No se pudo aceptar', 'error')
      }
    },
    async rejectPending(linkId) {
      try {
        await dmAPI.rosterReject(this.cid, linkId)
        this.showToast('Solicitud rechazada', 'success')
        await this.reload()
      } catch {
        this.showToast('No se pudo rechazar', 'error')
      }
    },
    async removeMember(linkId) {
      if (!confirm('¿Quitar este personaje de la campaña?')) return
      try {
        await dmAPI.removeRosterMember(this.cid, linkId)
        this.showToast('Quitado de la campaña', 'success')
        await this.reload()
      } catch {
        this.showToast('No se pudo quitar', 'error')
      }
    },
    async adjustMemberHp(row, delta) {
      try {
        const { data } = await dmAPI.adjustCharacterHp(this.cid, row.id, delta)
        row.hit_points_current = data.hit_points_current
        row.hit_points_max = data.hit_points_max
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo actualizar PV', 'error')
      }
    }
  }
}
</script>

<style scoped>
.dm-campaign {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 1rem;
  max-width: 100%;
}
.campaign-top {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.campaign-top-main { flex: 1; min-width: 0; }
.campaign-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1.2;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.campaign-meta { font-size: 0.8rem; margin-top: 0.25rem; }
.invite-code {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  color: var(--gold-light);
  background: var(--bg-surface);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.campaign-top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.dm-split {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}
.tab-panels {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  margin-bottom: 0.15rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.tab-btn {
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  text-transform: uppercase;
}
.tab-btn.active {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--bg-deep);
  border-color: var(--gold);
}
.tab-panel { display: flex; flex-direction: column; gap: 0.65rem; }
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
@media (max-width: 520px) {
  .grid-2 { grid-template-columns: 1fr; }
}
@media (min-width: 900px) {
  .grid-core-desk {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.world-desk-grid,
.world-desk-side {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.session-desk-top,
.session-desk-bottom {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.roster-desk-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: -0.35rem 0 0.65rem;
  line-height: 1.4;
}
.npc-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
  align-items: start;
}
.npc-row textarea { grid-column: 1 / -1; }
.inner-card { padding: 0.65rem; margin-bottom: 0.5rem; }
.btn-sm { font-size: 0.7rem; padding: 0.35rem 0.5rem; min-height: auto; }
.roster-list { display: flex; flex-direction: column; gap: 0.5rem; }
.roster-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.45rem;
}
.roster-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.roster-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}
.stat-pill {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-family: inherit;
  font-size: 0.66rem;
  letter-spacing: 0;
  color: var(--text-muted);
  background: var(--bg-surface);
}
.stat-pill-ca {
  color: var(--text-secondary);
}
.stat-pill-hp {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.hp-step {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  border-radius: 999px;
  width: 1.2rem;
  height: 1.2rem;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
}
.hp-step:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}
.roster-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.mt-2 { margin-top: 0.5rem; }
.mb-3 { margin-bottom: 0.65rem !important; }

@media (min-width: 720px) {
  .campaign-top {
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.85rem;
  }
  .campaign-title { font-size: 1.45rem; }
  .campaign-top-actions {
    flex-shrink: 0;
    flex-wrap: nowrap;
  }
  .campaign-meta { font-size: 0.85rem; }
}

@media (min-width: 880px) {
  .dm-split {
    display: grid;
    grid-template-columns: minmax(10.5rem, 13rem) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
  .tabs {
    flex-direction: column;
    flex-wrap: nowrap;
    overflow-x: visible;
    overflow-y: auto;
    max-height: calc(100dvh - 9rem);
    padding-bottom: 0;
    margin-bottom: 0;
    border-right: 1px solid var(--border);
    padding-right: 0.75rem;
    margin-right: 0;
  }
  .tab-btn {
    width: 100%;
    text-align: left;
    text-transform: none;
    font-size: 0.82rem;
    letter-spacing: 0.02em;
    padding: 0.55rem 0.75rem;
  }
}

@media (min-width: 960px) {
  .world-desk-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
    gap: 1rem;
    align-items: start;
  }
  .session-desk-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: stretch;
  }
  .session-desk-top .card.mb-3 { margin-bottom: 0 !important; }
  .session-desk-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.25rem;
  }
  .session-desk-bottom .card.mb-3 { margin-bottom: 0 !important; }
}

@media (min-width: 900px) {
  .roster-desk-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }
  .roster-desk-grid > .card.mb-3 { margin-bottom: 0 !important; }
}

@media (min-width: 640px) {
  .roster-row { flex-wrap: nowrap; }
  .roster-actions { flex-shrink: 0; }
}

@media (min-width: 780px) {
  .npc-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2.2fr) auto;
    align-items: start;
  }
  .npc-row textarea {
    grid-column: 3;
    grid-row: 1;
    min-height: 2.75rem;
  }
  .npc-row .btn-sm {
    grid-column: 4;
    grid-row: 1;
    align-self: start;
  }
}
</style>
