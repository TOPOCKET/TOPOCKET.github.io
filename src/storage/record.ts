/**
 * @file record 文件说明。
 * @description 本地存储键、序列化读写与记录适配能力。
 */
import type { z } from 'zod'
import { storageEngine } from './engine'
import type { StorageKey } from './keys'

/**
 * loadRecord：读取并返回持久化数据。
 * @param key 存储键名，包含业务域与版本信息。
 * @param schema zod 校验器，用于校验数据结构与类型。
 * @param fallback 读取失败或校验失败时的回退默认值。
 * @return 返回读取到的业务数据。
 * @throws 当数据解析或结构校验失败时可能抛出异常。
 * @exception 当数据解析或结构校验失败时可能抛出异常。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
export const loadRecord = <T>(
  key: StorageKey,
  schema: z.ZodType<T>,
  fallback: T,
): T => {
  const raw = storageEngine.getRaw(key)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    return result.success ? result.data : fallback
  } catch {
    return fallback
  }
}

/**
 * saveRecord：写入并持久化业务数据。
 * @param key 存储键名，包含业务域与版本信息。
 * @param value 待写入或待更新的业务数据。
 * @return 返回状态更新或持久化执行结果。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
export const saveRecord = <T>(key: StorageKey, value: T) => {
  storageEngine.setRaw(key, JSON.stringify(value))
}
