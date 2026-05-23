/**
 * PromptTemplateItem 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface PromptTemplateItem {
  id: string
  title: string
  purpose: string
  placeholders: string[]
  content: string
}
