import type { ToolItem } from '../types/tool'
import { parseOrThrow, toolListSchema } from './schemas'

const rawTools: ToolItem[] = [
  {
    id: 'game-calc',
    name: '游戏数值计算器',
    description: '用于伤害、成本、收益和时间投入的快速估算。',
    category: 'calculator',
    tags: ['RPG', '成长', '资源规划'],
    path: '/tools/game-calc',
    status: 'ready',
  },
  {
    id: 'mini-game-2048',
    name: '2048 Mini',
    description: '轻量小游戏模块，支持键盘操作和重开。',
    category: 'game',
    tags: ['益智', '键盘'],
    path: '/tools/mini-game-2048',
    status: 'ready',
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: '记忆翻牌小游戏，支持计时、步数和重开。',
    category: 'game',
    tags: ['翻牌', '记忆', '益智'],
    path: '/tools/memory-match',
    status: 'ready',
  },
  {
    id: 'prompt-templates',
    name: 'AI 提示词模板库',
    description: '整理常用模板，支持复制与变量占位。',
    category: 'prompt',
    tags: ['写作', '代码', '翻译'],
    path: '/prompts',
    status: 'ready',
  },
  {
    id: 'quick-links',
    name: '常用站点导航',
    description: '分组管理高频网址，一键打开。',
    category: 'link',
    tags: ['效率', '书签'],
    path: '/links',
    status: 'ready',
  },
]

export const tools = parseOrThrow('tools', toolListSchema, rawTools)
