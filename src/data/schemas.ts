/**
 * @file schemas 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import { z } from 'zod'

/**
 * toolCategorySchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolCategorySchema = z.enum(['calculator', 'game', 'prompt', 'link'])

/**
 * toolStatusSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolStatusSchema = z.enum(['ready', 'coming-soon'])

/**
 * toolPermissionSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolPermissionSchema = z.enum(['public', 'private'])

/**
 * toolItemSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: toolCategorySchema,
  tags: z.array(z.string().min(1)),
  path: z.string().min(1),
  status: toolStatusSchema,
  icon: z.string().min(1),
  permission: toolPermissionSchema,
  order: z.number().int().nonnegative(),
})

/**
 * toolListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolListSchema = z.array(toolItemSchema)

/**
 * toolCategoryOptionSchema 导出定义。
 * @remarks 该常量用于统一首页筛选、工具注册和偏好状态的分类来源。
 */
export const toolCategoryOptionSchema = z.object({
  key: z.union([z.literal('all'), toolCategorySchema]),
  label: z.string().min(1),
})

/**
 * toolCategoryOptionListSchema 导出定义。
 * @remarks 该常量为工具分类列表的运行时校验结构。
 */
export const toolCategoryOptionListSchema = z.array(toolCategoryOptionSchema)

/**
 * toolRegistryMetaSchema 导出定义。
 * @remarks 该常量用于校验工具注册表中可序列化的元信息。
 */
export const toolRegistryMetaSchema = toolItemSchema.extend({
  routeName: z.string().min(1),
  title: z.string().min(1),
})

/**
 * toolRegistryMetaListSchema 导出定义。
 * @remarks 该常量用于工具注册表元信息的运行时校验。
 */
export const toolRegistryMetaListSchema = z.array(toolRegistryMetaSchema)

/**
 * quickLinkItemSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const quickLinkItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  category: z.string().min(1),
  favorite: z.boolean(),
})

/**
 * quickLinkListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const quickLinkListSchema = z.array(quickLinkItemSchema)

/**
 * promptTemplateItemSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const promptTemplateItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  placeholders: z.array(z.string().min(1)),
  content: z.string().min(1),
})

/**
 * promptListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const promptListSchema = z.array(promptTemplateItemSchema)

/**
 * parseOrThrow。
 * @param label 错误上下文标签，用于构建可读错误信息。
 * @param schema zod 校验器，用于校验数据结构与类型。
 * @param data 待校验或待处理的数据对象。
 * @return 返回通过校验的数据，失败时抛出异常。
 * @throws 当业务前置条件不满足或内部处理失败时抛出异常。
 * @exception 当业务前置条件不满足或内部处理失败时抛出异常。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
export const parseOrThrow = <T>(label: string, schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }
  throw new Error(`${label} schema validation failed: ${result.error.message}`)
}
