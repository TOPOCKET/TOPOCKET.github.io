/**
 * @file prompts 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import type { PromptTemplateItem } from '../types/prompt'
import { parseOrThrow, promptListSchema } from './schemas'

const rawPrompts: PromptTemplateItem[] = [
  {
    id: 'microsoft_activated',
    title: '微软激活脚本',
    purpose: '微软系列软件激活脚本, 官网链接: https://github.com/massgravel/Microsoft-Activation-Scripts',
    placeholders: ['微软', 'office', 'Microsoft'],
    content: 'irm https://get.activated.win | iex',
  },
  {
    id: 'filesystem',
    title: '长文件读写',
    purpose: '辅助ai进行长文件读写',
    placeholders: ['MCP'],
    content: '{\n' +
        '  "mcpServers": {\n' +
        '    "filesystem": {\n' +
        '      "command": "npx.cmd",\n' +
        '      "args": [\n' +
        '        "-y",\n' +
        '        "@modelcontextprotocol/server-filesystem",\n' +
        '        "."\n' +
        '      ]\n' +
        '    }\n' +
        '  }\n' +
        '}',
  }
]

/**
 * prompts 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const prompts = parseOrThrow('prompts', promptListSchema, rawPrompts)
