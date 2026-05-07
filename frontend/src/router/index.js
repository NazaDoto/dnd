import { createRouter, createWebHistory } from 'vue-router'
import { useAuth, homePathForRole } from '../stores/auth.js'
import { matches } from '../composables/useMediaQuery.js'

const LoginView = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const HomeView = () => import('../views/HomeView.vue')
const CharacterCreateView = () => import('../views/CharacterCreateView.vue')
const CharacterDetailView = () => import('../views/CharacterDetailView.vue')
const CharacterFullView = () => import('../views/CharacterFullView.vue')
const CharacterEditView = () => import('../views/CharacterEditView.vue')
const NotesView = () => import('../views/NotesView.vue')
const AdminPanelView = () => import('../views/AdminPanelView.vue')
const DmPanelView = () => import('../views/DmPanelView.vue')
const DmCampaignDetailView = () => import('../views/DmCampaignDetailView.vue')

const DESKTOP_QUERY = '(min-width: 1024px)'

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
    {
        path: '/character/:id',
        component: CharacterDetailView,
        meta: { requiresAuth: true, roles: ['jugador'] },
        beforeEnter: (to) => {
            if (matches(DESKTOP_QUERY)) {
                return { path: `/character/${to.params.id}/full` }
            }
            return true
        }
    },
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

router.beforeEach((to, _from, next) => {
    const auth = useAuth()
    const role = auth.role.value
    const authed = auth.isAuthenticated.value

    if (to.meta.requiresAuth && !authed) return next('/login')

    if (to.meta.guest && authed) {
        return next(homePathForRole(role))
    }

    if (to.meta.roles && !to.meta.roles.includes(role)) {
        return next(homePathForRole(role))
    }

    next()
})

export default router
