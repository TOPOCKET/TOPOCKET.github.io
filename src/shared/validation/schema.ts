/**
 * @file schema
 * @description 轻量运行时数据校验接口，用于替代重型通用 schema 依赖。
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

/**
 * RuntimeSchema 接口定义。
 * @remarks 该接口保留 parse/safeParse 语义，便于持久化层复用校验能力。
 */
export interface RuntimeSchema<T> {
  parse: (data: unknown) => T
  safeParse: (data: unknown) => SafeParseResult<T>
}

/**
 * createRuntimeSchema。
 * @param validator 校验并返回强类型数据的函数。
 * @returns 可复用的运行时 schema。
 * @throws 当 validator 校验失败时透传错误。
 */
export const createRuntimeSchema = <T>(validator: (data: unknown) => T): RuntimeSchema<T> => ({
  parse: (data) => validator(data),
  safeParse: (data) => {
    try {
      return { success: true, data: validator(data) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('schema validation failed'),
      }
    }
  },
})
