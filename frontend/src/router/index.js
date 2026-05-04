import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import CharacterCreateView from '../views/CharacterCreateView.vue'
import CharacterDetailView from '../views/CharacterDetailView.vue'
import CharacterFullView from '../views/CharacterFullView.vue'
import CharacterEditView from '../views/CharacterEditView.vue'
import NotesView from '../views/NotesView.vue'

const routes = [
    { path: '/', redirect: '/home' },
    { path: '/login', component: LoginView, meta: { guest: true } },
    { path: '/register', component: RegisterView, meta: { guest: true } },
    { path: '/home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/character/new', component: CharacterCreateView, meta: { requiresAuth: true } },
    { path: '/character/:id', component: CharacterDetailView, meta: { requiresAuth: true } },
    { path: '/character/:id/full', component: CharacterFullView, meta: { requiresAuth: true } },
    { path: '/character/:id/edit', component: CharacterEditView, meta: { requiresAuth: true } },
    { path: '/character/:id/notes', component: NotesView, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('dnd_token')
    if (to.meta.requiresAuth && !token) return next('/login')
    if (to.meta.guest && token) return next('/home')
    next()
})

export default router