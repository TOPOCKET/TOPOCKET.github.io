import { z } from 'zod'
import type { ToolCategory } from '../types/tool'
import { storageEngine } from '../storage/engine'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'

export type ThemeMode = 'system' | 'light' | 'dark'
export type FilterCategory = 'all' | ToolCategory

export interface AppPrefsShape {
  themeMode: ThemeMode
  homeKeyword: string
  homeCategory: FilterCategory
  recentTools: string[]
}

const prefsSchema = z.object({
  themeMode: z.enum(['system', 'light', 'dark']),
  homeKeyword: z.string(),
  homeCategory: z.enum(['all', 'calculator', 'game', 'prompt', 'link']),
  recentTools: z.array(z.string()),
})

const defaultPrefs: AppPrefsShape = {
  themeMode: 'system',
  homeKeyword: '',
  homeCategory: 'all',
  recentTools: [],
}

const migrate = (): AppPrefsShape | null => {
  const legacyRaw = storageEngine.getRaw('prefs')
  if (!legacyRaw) return null
  try {
    const legacy = JSON.parse(legacyRaw)
    const result = prefsSchema.safeParse(legacy)
    if (!result.success) return null
    saveRecord(storageKeys.prefsV1, result.data)
    storageEngine.remove('prefs')
    return result.data
  } catch {
    return null
  }
}

const load = (): AppPrefsShape => {
  const raw = storageEngine.getRaw(storageKeys.prefsV1)
  if (raw) {
    return loadRecord(storageKeys.prefsV1, prefsSchema, defaultPrefs)
  }
  return migrate() ?? defaultPrefs
}

const save = (value: AppPrefsShape) => {
  saveRecord(storageKeys.prefsV1, prefsSchema.parse(value))
}

const reset = (): AppPrefsShape => {
  save(defaultPrefs)
  return defaultPrefs
}

export const prefsStore = {
  load,
  save,
  reset,
  migrate,
  defaults: defaultPrefs,
}
