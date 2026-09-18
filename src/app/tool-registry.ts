/**
 * @file tool-registry
 * @description 工具注册表，统一派生首页工具卡片、路由元信息与分类筛选配置。
 */
import type { Component } from 'vue'
import type { ToolCategory, ToolItem } from '@/types/tool'
import { parseOrThrow, toolCategoryOptionListSchema, toolRegistryMetaListSchema } from '@/data/schemas'

type ToolPageLoader = () => Promise<{ default: Component }>

/**
 * ToolCategoryOption 接口定义。
 * @remarks 该接口用于首页筛选与偏好状态，变更时需同步持久化兼容策略。
 */
export interface ToolCategoryOption {
  key: 'all' | ToolCategory
  label: string
}

/**
 * ToolRegistryEntry 接口定义。
 * @remarks 该接口是工具配置的单一事实源，工具卡片与路由均从这里派生。
 */
export interface ToolRegistryEntry extends ToolItem {
  routeName: string
  title: string
  component: ToolPageLoader
}

const rawToolCategories: ToolCategoryOption[] = [
  { key: 'all', label: '全部' },
  { key: 'calculator', label: '计算器' },
  { key: 'game', label: '小游戏' },
  { key: 'prompt', label: '提示词' },
  { key: 'link', label: '常用链接' },
]

const rawToolRegistry: ToolRegistryEntry[] = [
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
    order: 2,
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
    order: 3,
    status: 'ready',
    component: () => import('@domains/links').then((module) => ({ default: module.LinksPage })),
  },
  {
    id: 'game-calc',
    name: '诸神皇冠培养模拟器',
    title: '诸神皇冠培养模拟器',
    description: '按转职路径逐级模拟成长并计算最终六维面板。',
    category: 'calculator',
    tags: ['RPG', '成长', '转职路径'],
    path: '/tools/game-calc',
    routeName: 'game-calc',
    icon: 'calculator',
    permission: 'public',
    order: 4,
    status: 'ready',
    component: () => import('@domains/zhushen').then((module) => ({ default: module.ZhushenSimulatorPage })),
  },
]

const registryMeta = parseOrThrow(
  'toolRegistry',
  toolRegistryMetaListSchema,
  rawToolRegistry.map(({ component: _component, ...entry }) => entry),
)

/**
 * toolCategories 导出定义。
 * @returns 工具分类筛选项。
 * @remarks 该常量为首页筛选和偏好状态的统一分类配置。
 */
export const toolCategories = parseOrThrow('toolCategories', toolCategoryOptionListSchema, rawToolCategories)

/**
 * toolRegistry 导出定义。
 * @returns 已校验元信息且包含页面加载器的工具注册表。
 * @remarks 新增工具优先修改这里，避免路由、首页卡片和数据文件分散维护。
 */
export const toolRegistry: ToolRegistryEntry[] = registryMeta
  .map((entry, index) => ({
    ...entry,
    component: rawToolRegistry[index].component,
  }))
  .sort((left, right) => left.order - right.order)
