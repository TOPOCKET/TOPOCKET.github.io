/**
 * @file engine 文件说明。
 * @description 本地存储键、序列化读写与记录适配能力。
 */
import { STORAGE_PREFIX, type StorageKey } from './keys'

const resolveKey = (key: StorageKey | string) => `${STORAGE_PREFIX}${key}`

const getRaw = (key: StorageKey | string): string | null => {
  try {
    return localStorage.getItem(resolveKey(key))
  } catch {
    return null
  }
}

const setRaw = (key: StorageKey | string, value: string) => {
  try {
    localStorage.setItem(resolveKey(key), value)
  } catch {
    // ignore write failures in private mode/quota exceeded
  }
}

const remove = (key: StorageKey | string) => {
  try {
    localStorage.removeItem(resolveKey(key))
  } catch {
    // ignore
  }
}

/**
 * storageEngine 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const storageEngine = {
  getRaw,
  setRaw,
  remove,
}
