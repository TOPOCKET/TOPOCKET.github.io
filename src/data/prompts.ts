import type { PromptTemplateItem } from '../types/prompt'
import { parseOrThrow, promptListSchema } from './schemas'

const rawPrompts: PromptTemplateItem[] = [
  {
    id: 'feature-spec',
    title: '功能规格拆解',
    purpose: '把需求拆成可执行任务',
    placeholders: ['feature_name', 'constraints'],
    content: '将{{feature_name}}拆解为可执行任务，约束条件：{{constraints}}',
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
