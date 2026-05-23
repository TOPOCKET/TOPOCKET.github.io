/**
 * QuickLinkItem 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface QuickLinkItem {
  id: string
  name: string
  url: string
  category: string
  favorite: boolean
}
