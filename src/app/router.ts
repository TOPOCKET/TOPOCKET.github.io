import { createRouter, createWebHashHistory } from 'vue-router'
import { appRoutes } from './route-meta'

const appName = 'Sopronwitta'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: appRoutes,
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = pageTitle ? `${pageTitle} | ${appName}` : appName
})
