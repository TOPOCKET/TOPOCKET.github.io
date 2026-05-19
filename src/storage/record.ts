import type { z } from 'zod'
import { storageEngine } from './engine'
import type { StorageKey } from './keys'

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

export const saveRecord = <T>(key: StorageKey, value: T) => {
  storageEngine.setRaw(key, JSON.stringify(value))
}
