export type ToolCategory = 'calculator' | 'game' | 'prompt' | 'link'

export interface ToolItem {
  id: string
  name: string
  description: string
  category: ToolCategory
  tags: string[]
  path: string
  status: 'ready' | 'coming-soon'
}
