/**
 * @file tools 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import type { ToolItem } from '../types/tool'
import { parseOrThrow, toolListSchema } from './schemas'

const rawTools: ToolItem[] = [
  {
    id: 'game-calc',
    name: '诸神皇冠培养模拟器',
    description: '按转职路径逐级模拟成长并计算最终六维面板。',
    category: 'calculator',
    tags: ['RPG', '成长', '转职路径'],
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
    name: '代码模板库',
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

/**
 * tools 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const tools = parseOrThrow('tools', toolListSchema, rawTools)
