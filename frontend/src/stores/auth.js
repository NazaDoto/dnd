import { reactive, computed } from 'vue'

const TOKEN_KEY = 'dnd_token'
const USER_KEY = 'dnd_user'

function readUser() {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const state = reactive({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readUser(),
})

function persist() {
    if (state.token) {
        localStorage.setItem(TOKEN_KEY, state.token)
    } else {
        localStorage.removeItem(TOKEN_KEY)
    }
    if (state.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(state.user))
    } else {
        localStorage.removeItem(USER_KEY)
    }
    window.dispatchEvent(new Event('dnd-auth-changed'))
}

function setSession(token, user) {
    state.token = token || ''
    state.user = user || null
    persist()
}

function clearSession() {
    setSession('', null)
}

function syncFromStorage() {
    state.token = localStorage.getItem(TOKEN_KEY) || ''
    state.user = readUser()
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener('dnd-auth-changed', syncFromStorage)
}

export function homePathForRole(role) {
    if (role === 'administrador') return '/admin'
    if (role === 'dm') return '/dm'
    return '/home'
}

export function useAuth() {
    return {
        state,
        token: computed(() => state.token),
        user: computed(() => state.user),
        role: computed(() => state.user?.role || null),
        isAuthenticated: computed(() => !!state.token),
        homePath: computed(() => homePathForRole(state.user?.role)),
        setSession,
        clearSession,
        syncFromStorage,
    }
}
