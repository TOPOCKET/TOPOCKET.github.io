/**
 * ToolCategory 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type ToolCategory = 'prompt' | 'link'

/**
 * ToolPermission 类型定义。
 * @remarks 该类型用于统一工具注册、路由元信息与后续私有模式。
 */
export type ToolPermission = 'public' | 'private'

/**
 * ToolStatus 类型定义。
 * @remarks 该类型用于约束工具卡片状态与工具注册表。
 */
export type ToolStatus = 'ready' | 'coming-soon'

/**
 * ToolItem 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface ToolItem {
  id: string
  name: string
  description: string
  category: ToolCategory
  tags: string[]
  path: string
  status: ToolStatus
  icon: string
  permission: ToolPermission
  order: number
}
