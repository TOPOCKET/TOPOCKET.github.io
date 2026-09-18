/**
 * @file route-meta 文件说明。
 * @description 应用路由与页面元信息配置。
 */
import type { RouteRecordRaw } from 'vue-router'
import { toolRegistry } from './tool-registry'

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
    component: () => import('@domains/home').then((module) => ({ default: module.HomePage })),
    meta: {
      title: '首页',
      icon: 'layout-grid',
      permission: 'public',
      order: 1,
    },
  },
  ...toolRegistry.map((tool) => ({
    path: tool.path,
    name: tool.routeName,
    component: tool.component,
    meta: {
      title: tool.title,
      icon: tool.icon,
      permission: tool.permission,
      order: tool.order,
    },
  })),
]
