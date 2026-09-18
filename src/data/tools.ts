/**
 * @file tools 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import { toolRegistry } from '@/app/tool-registry'
import { parseOrThrow, toolListSchema } from './schemas'

const rawTools = toolRegistry.map(({ component: _component, routeName: _routeName, title: _title, ...tool }) => tool)

/**
 * tools 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const tools = parseOrThrow('tools', toolListSchema, rawTools)
