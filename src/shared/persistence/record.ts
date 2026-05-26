import type { z } from 'zod'
import { storageEngine } from './engine'
import type { StorageKey } from './keys'
import type { StorageEnginePort } from './ports'

export interface RecordRepositoryPort {
  loadRecord: <T>(key: StorageKey, schema: z.ZodType<T>, fallback: T) => T
  saveRecord: <T>(key: StorageKey, value: T) => void
}

export const createRecordRepository = (engine: StorageEnginePort): RecordRepositoryPort => ({
  loadRecord: <T>(key: StorageKey, schema: z.ZodType<T>, fallback: T): T => {
    const raw = engine.getRaw(key)
    if (!raw) return fallback
    try {
      const parsed = JSON.parse(raw)
      const result = schema.safeParse(parsed)
      return result.success ? result.data : fallback
    } catch {
      return fallback
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
