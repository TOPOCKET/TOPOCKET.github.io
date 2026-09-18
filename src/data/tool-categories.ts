/** 工具分类的单一事实源。 */
export const toolCategoryCatalog = {
  game: '小游戏',
  prompt: '提示词',
  link: '常用链接',
} as const

export type ToolCategory = keyof typeof toolCategoryCatalog

export type ToolCategoryOption = {
  key: 'all' | ToolCategory
  label: string
}

export const toolCategoryOptions: readonly ToolCategoryOption[] = [
  { key: 'all', label: '全部' },
  ...Object.entries(toolCategoryCatalog).map(([key, label]) => ({
    key: key as ToolCategory,
    label,
  })),
]

export const toolCategoryKeys = Object.keys(toolCategoryCatalog) as ToolCategory[]
