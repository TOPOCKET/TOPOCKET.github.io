import { storageEngine } from './engine'
import type { StorageKey } from './keys'
import type { StorageEnginePort } from './ports'
import type { RuntimeSchema } from '@/shared/validation/schema'

export interface RecordRepositoryPort {
  loadRecord: <T>(key: StorageKey, schema: RuntimeSchema<T>, fallback: T | (() => T)) => T
  saveRecord: <T>(key: StorageKey, value: T) => void
}

export const createRecordRepository = (engine: StorageEnginePort): RecordRepositoryPort => ({
  loadRecord: <T>(key: StorageKey, schema: RuntimeSchema<T>, fallback: T | (() => T)): T => {
    const createFallback = () => typeof fallback === 'function' ? (fallback as () => T)() : fallback
    const raw = engine.getRaw(key)
    if (!raw) return createFallback()
    try {
      const parsed = JSON.parse(raw)
      const result = schema.safeParse(parsed)
      return result.success ? result.data : createFallback()
    } catch {
      return createFallback()
    }
  },
  saveRecord: <T>(key: StorageKey, value: T) => {
    engine.setRaw(key, JSON.stringify(value))
  },
})

const recordRepository = createRecordRepository(storageEngine)

export const loadRecord: RecordRepositoryPort['loadRecord'] = (key, schema, fallback) =>
  recordRepository.loadRecord(key, schema, fallback)

export const saveRecord: RecordRepositoryPort['saveRecord'] = (key, value) =>
  recordRepository.saveRecord(key, value)

export const getRecordRepository = (): RecordRepositoryPort => recordRepository

export const createRecordRepositoryPort = (engine: StorageEnginePort): RecordRepositoryPort =>
  createRecordRepository(engine)
