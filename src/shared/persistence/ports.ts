import type { StorageKey } from './keys'

export interface StorageEnginePort {
  getRaw: (key: StorageKey | string) => string | null
  setRaw: (key: StorageKey | string, value: string) => void
  remove: (key: StorageKey | string) => void
}
