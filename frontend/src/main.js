import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { attachRouter } from './services/api.js'
import './assets/global.css'

attachRouter(router)

createApp(App).use(router).mount('#app')
