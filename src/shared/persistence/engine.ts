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

export const storageEngine = {
  getRaw,
  setRaw,
  remove,
}
