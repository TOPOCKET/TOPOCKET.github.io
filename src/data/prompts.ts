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
  },
  {
    id: 'playwright',
    title: '网站测试',
    purpose: '辅助ai进行网站测试',
    placeholders: ['MCP'],
    content: '{\n' +
        '  "mcpServers": {\n' +
        '    "playwright": {\n' +
        '      "command": "npx.cmd",\n' +
        '      "args": [\n' +
        '        "-y",\n' +
        '        "@playwright/mcp@latest",\n' +
        '        "."\n' +
        '      ]\n' +
        '    }\n' +
        '  }\n' +
        '}',
  }
]

export const prompts = parseOrThrow('prompts', promptListSchema, rawPrompts)
