import type { RouteRecordRaw } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LinksPage from '../pages/LinksPage.vue'
import PromptsPage from '../pages/PromptsPage.vue'

export interface AppRouteMeta {
  title: string
  icon: string
  permission: 'public' | 'private'
  order: number
}

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: {
      title: '首页',
      icon: 'layout-grid',
      permission: 'public',
      order: 1,
    },
  },
  {
    path: '/prompts',
    name: 'prompts',
    component: PromptsPage,
    meta: {
      title: '提示词模板',
      icon: 'sparkles',
      permission: 'public',
      order: 2,
    },
  },
  {
    path: '/links',
    name: 'links',
    component: LinksPage,
    meta: {
      title: '常用链接',
      icon: 'link',
      permission: 'public',
      order: 3,
    },
  },
]
