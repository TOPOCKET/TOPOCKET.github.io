import { describe, expect, it, beforeEach } from 'vitest'
import { loadRecord, saveRecord } from './record'
import { storageKeys, STORAGE_PREFIX } from './keys'
import { createRuntimeSchema } from '@/shared/validation/schema'

class LocalStorageMock {
  private readonly store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

const schema = createRuntimeSchema<{ count: number }>((data) => {
  if (!data || typeof data !== 'object') throw new Error('invalid record')
  const count = (data as { count?: unknown }).count
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) throw new Error('invalid count')
  return { count }
})

describe('shared/persistence/record', () => {
  const localStorageMock = new LocalStorageMock()

  beforeEach(() => {
    ;(globalThis as unknown as { localStorage?: LocalStorageMock }).localStorage = localStorageMock
    localStorageMock.clear()
  })

  it('returns fallback when key does not exist', () => {
    const fallback = { count: 7 }
    const value = loadRecord(storageKeys.linksV1, schema, fallback)
    expect(value).toEqual(fallback)
  })

  it('saves and loads valid data', () => {
    const payload = { count: 3 }
    saveRecord(storageKeys.linksV1, payload)
    const value = loadRecord(storageKeys.linksV1, schema, { count: 0 })
    expect(value).toEqual(payload)
  })

  it('returns fallback when stored JSON is invalid', () => {
    localStorageMock.setItem(`${STORAGE_PREFIX}${storageKeys.linksV1}`, '{bad json')
    const fallback = { count: 9 }
    const value = loadRecord(storageKeys.linksV1, schema, fallback)
    expect(value).toEqual(fallback)
  })

  it('returns fallback when stored value fails schema validation', () => {
    localStorageMock.setItem(`${STORAGE_PREFIX}${storageKeys.linksV1}`, JSON.stringify({ count: -1 }))
    const fallback = { count: 2 }
    const value = loadRecord(storageKeys.linksV1, schema, fallback)
    expect(value).toEqual(fallback)
  })
})
