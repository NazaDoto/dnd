import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('dnd_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response && err.response.status === 401) {
            localStorage.removeItem('dnd_token')
            localStorage.removeItem('dnd_user')
            window.dispatchEvent(new Event('dnd-auth-changed'))
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
}

export const charactersAPI = {
    getAll: () => api.get('/characters'),
    getSummary: (id) => api.get(`/characters/${id}/summary`),
    getFull: (id) => api.get(`/characters/${id}`),
    create: (formData) => api.post('/characters', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, fd) => api.put(`/characters/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/characters/${id}`),
}

export const notesAPI = {
    getAll: (charId) => api.get(`/notes/${charId}`),
    create: (charId, data) => api.post(`/notes/${charId}`, data),
    update: (noteId, data) => api.put(`/notes/${noteId}`, data),
    delete: (noteId) => api.delete(`/notes/${noteId}`),
}

export const campaignsAPI = {
    previewByCode: (code) => api.get(`/campaigns/preview/${encodeURIComponent(code)}`),
    join: (payload) => api.post('/campaigns/join', payload),
    myRequests: () => api.get('/campaigns/my-requests'),
}

export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    getCampaigns: () => api.get('/admin/campaigns'),
    getAllCharacters: () => api.get('/admin/characters'),
    getCampaignCharacters: (campaignId) => {
        const q = campaignId ? `?campaign_id=${campaignId}` : ''
        return api.get(`/admin/campaign-characters${q}`)
    },
    assignCharacterToCampaign: (campaign_id, character_id) => api.post('/admin/campaign-characters', { campaign_id, character_id }),
    removeCampaignCharacter: (linkId) => api.delete(`/admin/campaign-characters/${linkId}`),
}

export const dmAPI = {
    getCampaigns: () => api.get('/dm/campaigns'),
    getCampaign: (id) => api.get(`/dm/campaigns/${id}`),
    createCampaign: (payload) => api.post('/dm/campaigns', payload),
    updateCampaign: (id, payload) => api.put(`/dm/campaigns/${id}`, payload),
    deleteCampaign: (id) => api.delete(`/dm/campaigns/${id}`),
    rotateInvite: (id) => api.post(`/dm/campaigns/${id}/invite-rotate`),
    getRoster: (id) => api.get(`/dm/campaigns/${id}/roster`),
    rosterAccept: (campaignId, linkId) => api.patch(`/dm/campaigns/${campaignId}/roster/${linkId}`, { action: 'accept' }),
    rosterReject: (campaignId, linkId) => api.patch(`/dm/campaigns/${campaignId}/roster/${linkId}`, { action: 'reject' }),
    removeRosterMember: (campaignId, linkId) => api.delete(`/dm/campaigns/${campaignId}/roster/${linkId}`),
    getCampaignCharacter: (campaignId, characterId) => api.get(`/dm/campaigns/${campaignId}/characters/${characterId}`),
    adjustCharacterHp: (campaignId, characterId, delta) => api.patch(`/dm/campaigns/${campaignId}/characters/${characterId}/hp`, { delta }),
}

export default api
