/**
 * @file router 文件说明。
 * @description 应用路由与页面元信息配置。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { appRoutes } from './route-meta'

const appName = 'Sopronwitta'

/**
 * router 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: appRoutes,
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = pageTitle ? `${pageTitle} | ${appName}` : appName
})
