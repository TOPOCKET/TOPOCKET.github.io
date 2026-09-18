/**
 * @file tool-registry
 * @description 工具注册表，统一派生首页工具卡片、路由元信息与分类筛选配置。
 */
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { ToolItem } from '@/types/tool'
import { toolCategoryOptions, type ToolCategoryOption } from '@/data/tool-categories'
import { parseOrThrow, toolCategoryOptionListSchema, toolListSchema, toolRegistryMetaListSchema } from '@/data/schemas'

type ToolPageLoader = () => Promise<{ default: Component }>

/**
 * ToolCategoryOption 接口定义。
 * @remarks 该接口用于首页筛选与偏好状态，变更时需同步持久化兼容策略。
 */
export type { ToolCategoryOption }

/**
 * ToolRegistryEntry 接口定义。
 * @remarks 该接口是工具配置的单一事实源，工具卡片与路由均从这里派生。
 */
export interface ToolRegistryEntry extends ToolItem {
  routeName: string
  title: string
  component: ToolPageLoader
}

/**
 * AppRouteMeta 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步工具注册表与路由派生逻辑。
 */
export interface AppRouteMeta {
  title: string
  icon: string
  permission: 'public' | 'private'
  order: number
}

const rawToolRegistry: ToolRegistryEntry[] = [
  {
    id: 'tactics-rogue',
    name: '无限战棋',
    title: '无限战棋',
    description: '本地存档的轻量战棋，支持无限推进、角色自定义和局外成长。',
    category: 'game',
    tags: ['战棋', '本地存档', '成长'],
    path: '/tools/tactics-rogue',
    routeName: 'tactics-rogue',
    icon: 'swords',
    permission: 'public',
    order: 2,
    status: 'ready',
    component: () => import('@domains/tactics').then((module) => ({ default: module.TacticsGamePage })),
  },
  {
    id: 'prompt-templates',
    name: '代码模板库',
    title: '提示词模板',
    description: '整理常用模板，支持复制与变量占位。',
    category: 'prompt',
    tags: ['写作', '代码', '翻译'],
    path: '/prompts',
    routeName: 'prompts',
    icon: 'sparkles',
    permission: 'public',
    order: 3,
    status: 'ready',
    component: () => import('@domains/prompts').then((module) => ({ default: module.PromptsPage })),
  },
  {
    id: 'quick-links',
    name: '常用站点导航',
    title: '常用链接',
    description: '分组管理高频网址，一键打开。',
    category: 'link',
    tags: ['效率', '书签'],
    path: '/links',
    routeName: 'links',
    icon: 'link',
    permission: 'public',
    order: 4,
    status: 'ready',
    component: () => import('@domains/links').then((module) => ({ default: module.LinksPage })),
  },
]

export const assertToolRegistry = (registry: readonly ToolRegistryEntry[]): void => {
  const unique = (label: string, values: readonly string[]) => {
    if (new Set(values).size !== values.length) throw new Error(`toolRegistry contains duplicate ${label}`)
  }

  unique('id', registry.map((tool) => tool.id))
  unique('path', registry.map((tool) => tool.path))
  unique('routeName', registry.map((tool) => tool.routeName))
  unique('order', registry.map((tool) => String(tool.order)))

  for (const tool of registry) {
    if (!tool.path.startsWith('/')) throw new Error(`toolRegistry path must start with /: ${tool.path}`)
    if (tool.status !== 'ready') throw new Error(`toolRegistry route must be ready: ${tool.id}`)
  }

  const categoryKeys = new Set(toolCategoryOptions.map((category) => category.key))
  for (const tool of registry) {
    if (!categoryKeys.has(tool.category)) throw new Error(`toolRegistry category is not selectable: ${tool.category}`)
  }
}

/**
 * toolCategories 导出定义。
 * @returns 工具分类筛选项。
 * @remarks 该常量为首页筛选和偏好状态的统一分类配置。
 */
export const toolCategories = parseOrThrow('toolCategories', toolCategoryOptionListSchema, toolCategoryOptions)

/**
 * toolRegistry 导出定义。
 * @returns 已校验元信息且包含页面加载器的工具注册表。
 * @remarks 新增工具优先修改这里，避免路由、首页卡片和数据文件分散维护。
 */
const validatedToolRegistry = rawToolRegistry.map((entry) => {
  const { component, ...meta } = entry
  return {
    ...parseOrThrow(`toolRegistry:${entry.id}`, toolRegistryMetaListSchema, [meta])[0],
    component,
  }
})

assertToolRegistry(validatedToolRegistry)

export const toolRegistry: ToolRegistryEntry[] = [...validatedToolRegistry].sort((left, right) => left.order - right.order)

/**
 * tools 导出定义。
 * @returns 首页工具卡片数据。
 * @remarks 该常量由工具注册表派生，避免维护独立工具列表。
 */
export const tools = parseOrThrow(
  'tools',
  toolListSchema,
  toolRegistry.map(({ component: _component, routeName: _routeName, title: _title, ...tool }) => tool),
)

/**
 * appRoutes 导出定义。
 * @returns 应用路由配置。
 * @remarks 路由由工具注册表派生，新增工具只需维护注册表。
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
    } satisfies AppRouteMeta,
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
  } satisfies AppRouteMeta,
  })),
]
