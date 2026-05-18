import type { PromptTemplateItem } from '../types/prompt'
import { parseOrThrow, promptListSchema } from './schemas'

const rawPrompts: PromptTemplateItem[] = [
  {
    id: 'code-review',
    title: '代码审查',
    purpose: '审查代码风险与可维护性',
    placeholders: ['language', 'context'],
    content: '请作为资深{{language}}工程师，对下面代码做风险优先级审查：{{context}}',
  },
  {
    id: 'feature-spec',
    title: '功能规格拆解',
    purpose: '把需求拆成可执行任务',
    placeholders: ['feature_name', 'constraints'],
    content: '将{{feature_name}}拆解为可执行任务，约束条件：{{constraints}}',
  },
]

export const prompts = parseOrThrow('prompts', promptListSchema, rawPrompts)
