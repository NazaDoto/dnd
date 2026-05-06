<template>
  <div class="home-view">
    <!-- Header -->
    <div class="home-header">
      <div>
        <h1 class="home-title">Mis Personajes</h1>
        <p class="home-sub" v-if="user">¡Bienvenido, {{ user.username }}!</p>
      </div>
      <RouterLink to="/character/new" class="btn btn-primary">
        Nuevo
      </RouterLink>
    </div>

    <div v-if="!loading && characters.length" class="home-top-grid">
      <div v-if="characters.length" class="card join-block">
        <p class="section-title">Unir personaje a una campaña</p>
        <p class="join-hint">
          Pedí ingreso con el código que te pase el DM. Él acepta o rechaza desde su panel de campaña.
        </p>
        <div class="join-grid">
          <div class="form-group">
            <label class="form-label" for="invite-code">Código de invitación</label>
            <input id="invite-code" v-model.trim="inviteCode" placeholder="Ej. A1B2C3D4E" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="join-char">Personaje</label>
            <select id="join-char" v-model.number="joinCharacterId">
              <option :value="null">Elegir personaje</option>
              <option v-for="ch in characters" :key="'j-' + ch.id" :value="ch.id">{{ ch.name }}</option>
            </select>
          </div>
          <div class="join-actions">
            <button type="button" class="btn btn-secondary" :disabled="joinPreviewing" @click="previewInvite">
              {{ joinPreviewing ? '...' : 'Ver campaña' }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="joinSending" @click="sendJoinRequest">
              {{ joinSending ? 'Enviando...' : 'Solicitar ingreso' }}
            </button>
          </div>
        </div>
        <p v-if="previewInfo" class="preview-box text-muted">
          <strong class="text-gold">{{ previewInfo.name }}</strong>
          · DM: {{ previewInfo.dm_username }}
          <span v-if="previewInfo.setting_name"> · {{ previewInfo.setting_name }}</span>
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
      <span>Convocando personajes...</span>
    </div>

    <!-- Empty state (sin solicitudes pendientes) -->
    <div v-else-if="!characters.length && !myRequests.length" class="empty-state">
      <div class="empty-icon">🐉</div>
      <h3>Ningún aventurero aún</h3>
      <p>Creá tu primer personaje y comenzá la aventura</p>
      <RouterLink to="/character/new" class="btn btn-primary mt-4">
        Crear personaje
      </RouterLink>
    </div>

    <!-- Sin personajes pero con solicitudes a campañas -->
    <div v-else-if="!characters.length && myRequests.length" class="card no-chars-hint">
      <p class="text-muted">
        No tenés personajes creados. Creá uno para seguir jugando o para unirte a otra campaña.
      </p>
      <RouterLink to="/character/new" class="btn btn-primary mt-2">
        Crear personaje
      </RouterLink>
    </div>

    <!-- Lista -->
    <div v-else class="char-list-wrap">
      <div class="char-list-head">
        <p class="section-title">Tus personajes</p>
        <span class="char-count">{{ characters.length }}</span>
      </div>
      <div class="char-list">
      <CharacterCard
        v-for="char in characters"
        :key="char.id"
        :character="{ ...char, linked_campaign_name: campaignByCharacterId[char.id] || null }"
        @click="$router.push(`/character/${char.id}`)"
      />
      </div>
    </div>
  </div>
</template>

<script>
import CharacterCard from '../components/CharacterCard.vue'
import { charactersAPI, campaignsAPI } from '../services/api.js'

export default {
  name: 'HomeView',
  components: { CharacterCard },
  inject: ['showToast'],
  data() {
    return {
      characters: [],
      loading: true,
      user: null,
      inviteCode: '',
      joinCharacterId: null,
      joinPreviewing: false,
      joinSending: false,
      previewInfo: null,
      myRequests: []
    }
  },
  computed: {
    campaignByCharacterId() {
      const map = {}
      for (const req of this.myRequests || []) {
        if (req?.status !== 'active') continue
        const id = Number(req.character_id)
        if (!id) continue
        map[id] = req.campaign_name || null
      }
      return map
    }
  },
  async mounted() {
    const stored = localStorage.getItem('dnd_user')
    if (stored) this.user = JSON.parse(stored)
    if (this.user?.role === 'administrador') {
      this.$router.replace('/admin')
      return
    }
    if (this.user?.role === 'dm') {
      this.$router.replace('/dm')
      return
    }
    await this.loadCharacters()
    await this.loadMyRequests()
  },
  methods: {
    async loadMyRequests() {
      try {
        const { data } = await campaignsAPI.myRequests()
        this.myRequests = data || []
      } catch {
        this.myRequests = []
      }
    },
    async loadCharacters() {
      this.loading = true
      try {
        const { data } = await charactersAPI.getAll()
        this.characters = data
      } catch {
        this.showToast('Error al cargar personajes', 'error')
      } finally {
        this.loading = false
      }
    },
    async previewInvite() {
      if (!this.inviteCode) {
        this.showToast('Ingresá un código', 'error')
        return
      }
      this.joinPreviewing = true
      this.previewInfo = null
      try {
        const { data } = await campaignsAPI.previewByCode(this.inviteCode)
        this.previewInfo = data
      } catch {
        this.showToast('Código no válido o campaña inactiva', 'error')
      } finally {
        this.joinPreviewing = false
      }
    },
    async sendJoinRequest() {
      if (!this.inviteCode || !this.joinCharacterId) {
        this.showToast('Código y personaje son obligatorios', 'error')
        return
      }
      this.joinSending = true
      try {
        await campaignsAPI.join({ invite_code: this.inviteCode, character_id: this.joinCharacterId })
        this.showToast('Solicitud enviada al DM', 'success')
        await this.loadMyRequests()
      } catch (err) {
        this.showToast(err.response?.data?.message || 'No se pudo enviar la solicitud', 'error')
      } finally {
        this.joinSending = false
      }
    }
  }
}
</script>

<style scoped>
.home-view { padding-bottom: 1rem; }

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.home-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.home-sub { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem; }

.home-top-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}
.char-list { display: flex; flex-direction: column; gap: 0.65rem; }
.char-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.char-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.char-count {
  min-width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 0.72rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}
.empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
.empty-state h3 { font-family: var(--font-title); color: var(--text-secondary); margin-bottom: 0.5rem; }
.empty-state p  { font-size: 0.9rem; }

.join-block { margin-bottom: 1rem; }
.join-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: -0.35rem 0 0.65rem;
  line-height: 1.45;
}
.join-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.join-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.preview-box {
  margin-top: 0.65rem;
  font-size: 0.85rem;
  padding: 0.5rem 0.65rem;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
@media (min-width: 860px) {
  .home-header {
    flex-wrap: nowrap;
  }
  .home-top-grid {
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.35fr);
    align-items: start;
  }
  .join-block {
    margin-bottom: 0;
  }
  .join-grid {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.65rem;
    align-items: end;
  }
  .join-actions {
    flex-wrap: nowrap;
    justify-content: flex-end;
  }
}
</style>