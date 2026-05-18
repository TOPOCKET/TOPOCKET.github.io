import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LinksPage from '../pages/LinksPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/links',
      name: 'links',
      component: LinksPage,
    },
  ],
})
