import { z } from 'zod'

export const toolCategorySchema = z.enum(['calculator', 'game', 'prompt', 'link'])
export const toolStatusSchema = z.enum(['ready', 'coming-soon'])

export const toolItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: toolCategorySchema,
  tags: z.array(z.string().min(1)),
  path: z.string().min(1),
  status: toolStatusSchema,
})

export const toolListSchema = z.array(toolItemSchema)

export const quickLinkItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  category: z.string().min(1),
  favorite: z.boolean(),
})

export const quickLinkListSchema = z.array(quickLinkItemSchema)

export const promptTemplateItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  placeholders: z.array(z.string().min(1)),
  content: z.string().min(1),
})

export const promptListSchema = z.array(promptTemplateItemSchema)

export const parseOrThrow = <T>(label: string, schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }
  throw new Error(`${label} schema validation failed: ${result.error.message}`)
}
