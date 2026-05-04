import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import CharacterCreateView from '../views/CharacterCreateView.vue'
import CharacterDetailView from '../views/CharacterDetailView.vue'
import CharacterFullView from '../views/CharacterFullView.vue'
import CharacterEditView from '../views/CharacterEditView.vue'
import NotesView from '../views/NotesView.vue'
import AdminPanelView from '../views/AdminPanelView.vue'
import DmPanelView from '../views/DmPanelView.vue'
import DmCampaignDetailView from '../views/DmCampaignDetailView.vue'

function getStoredUser() {
    const raw = localStorage.getItem('dnd_user')
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const routes = [
    { path: '/', redirect: '/home' },
    { path: '/login', component: LoginView, meta: { guest: true } },
    { path: '/register', component: RegisterView, meta: { guest: true } },
    { path: '/home', component: HomeView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/admin', component: AdminPanelView, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/dm', component: DmPanelView, meta: { requiresAuth: true, roles: ['dm'] } },
    { path: '/dm/campaign/:id', component: DmCampaignDetailView, meta: { requiresAuth: true, roles: ['dm'] } },
    {
        path: '/dm/campaign/:campaignId/character/:id',
        name: 'DmCampaignCharacter',
        component: CharacterFullView,
        meta: { requiresAuth: true, roles: ['dm'] }
    },
    { path: '/character/new', component: CharacterCreateView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/character/:id', component: CharacterDetailView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/character/:id/full', component: CharacterFullView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/character/:id/edit', component: CharacterEditView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/character/:id/notes', component: NotesView, meta: { requiresAuth: true, roles: ['jugador'] } },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('dnd_token')
    const user = getStoredUser()
    if (to.meta.requiresAuth && !token) return next('/login')
    if (to.meta.guest && token) {
        if (user?.role === 'administrador') return next('/admin')
        if (user?.role === 'dm') return next('/dm')
        return next('/home')
    }
    if (to.meta.roles && !to.meta.roles.includes(user?.role)) {
        if (user?.role === 'administrador') return next('/admin')
        if (user?.role === 'dm') return next('/dm')
        return next('/home')
    }
    next()
})

export default router