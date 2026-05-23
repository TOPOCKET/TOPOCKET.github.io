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
})

/**
 * toolListSchema 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const toolListSchema = z.array(toolItemSchema)

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
