/**
 * ToolCategory 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type ToolCategory = 'calculator' | 'game' | 'prompt' | 'link'

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
  status: 'ready' | 'coming-soon'
}
