/**
 * @file schemas 文件说明。
 * @description 静态业务数据与轻量运行时校验定义。
 */
import type { QuickLinkItem } from '@/types/link'
import type { PromptTemplateItem } from '@/types/prompt'
import type { ToolCategory, ToolItem, ToolPermission, ToolStatus } from '@/types/tool'
import { createRuntimeSchema, type RuntimeSchema } from '@/shared/validation/schema'

type ToolCategoryOption = { key: 'all' | ToolCategory; label: string }
type ToolRegistryMeta = ToolItem & { routeName: string; title: string }

const toolCategories = ['prompt', 'link'] as const
const toolStatuses = ['ready', 'coming-soon'] as const
const toolPermissions = ['public', 'private'] as const

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data)

const assertRecord = (data: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(data)) throw new Error(`${label} must be an object`)
  return data
}

const nonEmptyString = (data: unknown, label: string): string => {
  if (typeof data !== 'string' || data.trim().length === 0) throw new Error(`${label} must be a non-empty string`)
  return data
}

const booleanValue = (data: unknown, label: string): boolean => {
  if (typeof data !== 'boolean') throw new Error(`${label} must be a boolean`)
  return data
}

const nonNegativeInteger = (data: unknown, label: string): number => {
  if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
    throw new Error(`${label} must be a non-negative integer`)
  }
  return data
}

const enumValue = <T extends readonly string[]>(data: unknown, values: T, label: string): T[number] => {
  if (typeof data !== 'string' || !values.includes(data)) throw new Error(`${label} is invalid`)
  return data
}

const stringList = (data: unknown, label: string): string[] => {
  if (!Array.isArray(data)) throw new Error(`${label} must be an array`)
  return data.map((item, index) => nonEmptyString(item, `${label}[${index}]`))
}

const arrayOf = <T>(schema: RuntimeSchema<T>, label: string): RuntimeSchema<T[]> =>
  createRuntimeSchema((data) => {
    if (!Array.isArray(data)) throw new Error(`${label} must be an array`)
    return data.map((item) => schema.parse(item))
  })

const urlString = (data: unknown, label: string): string => {
  const value = nonEmptyString(data, label)
  try {
    new URL(value)
    return value
  } catch {
    throw new Error(`${label} must be a URL`)
  }
}

/**
 * toolItemSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolItemSchema = createRuntimeSchema<ToolItem>((data) => {
  const record = assertRecord(data, 'tool')
  return {
    id: nonEmptyString(record.id, 'tool.id'),
    name: nonEmptyString(record.name, 'tool.name'),
    description: nonEmptyString(record.description, 'tool.description'),
    category: enumValue(record.category, toolCategories, 'tool.category') as ToolCategory,
    tags: stringList(record.tags, 'tool.tags'),
    path: nonEmptyString(record.path, 'tool.path'),
    status: enumValue(record.status, toolStatuses, 'tool.status') as ToolStatus,
    icon: nonEmptyString(record.icon, 'tool.icon'),
    permission: enumValue(record.permission, toolPermissions, 'tool.permission') as ToolPermission,
    order: nonNegativeInteger(record.order, 'tool.order'),
  }
})

/**
 * toolListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolListSchema = arrayOf(toolItemSchema, 'tools')

/**
 * toolCategoryOptionListSchema 导出定义。
 * @remarks 该常量为工具分类列表的运行时校验结构。
 */
export const toolCategoryOptionListSchema = arrayOf(
  createRuntimeSchema<ToolCategoryOption>((data) => {
    const record = assertRecord(data, 'toolCategory')
    const key =
      record.key === 'all'
        ? 'all'
        : (enumValue(record.key, toolCategories, 'toolCategory.key') as ToolCategory)
    return {
      key,
      label: nonEmptyString(record.label, 'toolCategory.label'),
    }
  }),
  'toolCategories',
)

/**
 * toolRegistryMetaListSchema 导出定义。
 * @remarks 该常量用于工具注册表元信息的运行时校验。
 */
export const toolRegistryMetaListSchema = arrayOf(
  createRuntimeSchema<ToolRegistryMeta>((data) => {
    const record = assertRecord(data, 'toolRegistry')
    return {
      ...toolItemSchema.parse(record),
      routeName: nonEmptyString(record.routeName, 'toolRegistry.routeName'),
      title: nonEmptyString(record.title, 'toolRegistry.title'),
    }
  }),
  'toolRegistry',
)

/**
 * quickLinkListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const quickLinkListSchema = arrayOf(
  createRuntimeSchema<QuickLinkItem>((data) => {
    const record = assertRecord(data, 'quickLink')
    return {
      id: nonEmptyString(record.id, 'quickLink.id'),
      name: nonEmptyString(record.name, 'quickLink.name'),
      url: urlString(record.url, 'quickLink.url'),
      category: nonEmptyString(record.category, 'quickLink.category'),
      favorite: booleanValue(record.favorite, 'quickLink.favorite'),
    }
  }),
  'quickLinks',
)

/**
 * promptListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const promptListSchema = arrayOf(
  createRuntimeSchema<PromptTemplateItem>((data) => {
    const record = assertRecord(data, 'prompt')
    return {
      id: nonEmptyString(record.id, 'prompt.id'),
      title: nonEmptyString(record.title, 'prompt.title'),
      purpose: nonEmptyString(record.purpose, 'prompt.purpose'),
      placeholders: stringList(record.placeholders, 'prompt.placeholders'),
      content: nonEmptyString(record.content, 'prompt.content'),
    }
  }),
  'prompts',
)

/**
 * parseOrThrow。
 * @param label 错误上下文标签，用于构建可读错误信息。
 * @param schema 运行时校验器，用于校验数据结构与类型。
 * @param data 待校验或待处理的数据对象。
 * @returns 返回通过校验的数据，失败时抛出异常。
 * @throws 当数据结构不满足 schema 时抛出异常。
 */
export const parseOrThrow = <T>(label: string, schema: RuntimeSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  throw new Error(`${label} schema validation failed: ${result.error.message}`)
}
