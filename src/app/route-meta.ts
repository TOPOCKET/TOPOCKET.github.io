/**
 * @file route-meta 文件说明。
 * @description 应用路由与页面元信息配置。
 */
import type { RouteRecordRaw } from 'vue-router'
import { HomePage } from '@domains/home'
import { LinksPage } from '@domains/links'
import { PromptsPage } from '@domains/prompts'
import { ZhushenSimulatorPage } from '@domains/zhushen'

/**
 * AppRouteMeta 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface AppRouteMeta {
  title: string
  icon: string
  permission: 'public' | 'private'
  order: number
}

/**
 * appRoutes 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
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
  {
    path: '/tools/game-calc',
    name: 'game-calc',
    component: ZhushenSimulatorPage,
    meta: {
      title: '诸神皇冠培养模拟器',
      icon: 'calculator',
      permission: 'public',
      order: 4,
    },
  },
]
