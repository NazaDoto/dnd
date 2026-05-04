import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
})

// Adjuntar token automáticamente
api.interceptors.request.use(config => {
    const token = localStorage.getItem('dnd_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Manejo global de 401
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response && err.response.status === 401) {
            localStorage.removeItem('dnd_token')
            localStorage.removeItem('dnd_user')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
}

// ── Characters ───────────────────────────────────────────────
export const charactersAPI = {
    getAll: () => api.get('/characters'),
    getSummary: (id) => api.get(`/characters/${id}/summary`),
    getFull: (id) => api.get(`/characters/${id}`),
    create: (formData) => api.post('/characters', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, fd) => api.put(`/characters/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/characters/${id}`),
}

// ── Notes ────────────────────────────────────────────────────
export const notesAPI = {
    getAll: (charId) => api.get(`/notes/${charId}`),
    create: (charId, data) => api.post(`/notes/${charId}`, data),
    update: (noteId, data) => api.put(`/notes/${noteId}`, data),
    delete: (noteId) => api.delete(`/notes/${noteId}`),
}

export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    getLinks: () => api.get('/admin/dm-links'),
    createLink: (dm_user_id, player_user_id) => api.post('/admin/dm-links', { dm_user_id, player_user_id }),
    deleteLink: (id) => api.delete(`/admin/dm-links/${id}`),
}

export const dmAPI = {
    getCampaigns: () => api.get('/dm/campaigns'),
    createCampaign: (payload) => api.post('/dm/campaigns', payload),
    updateCampaign: (id, payload) => api.put(`/dm/campaigns/${id}`, payload),
    deleteCampaign: (id) => api.delete(`/dm/campaigns/${id}`),
    getPlayers: () => api.get('/dm/players'),
    getCharacters: () => api.get('/dm/characters'),
}

export default api