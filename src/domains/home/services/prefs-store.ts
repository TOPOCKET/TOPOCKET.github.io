import type { ToolCategory } from '@/types/tool'
import { loadRecord, saveRecord, storageEngine, storageKeys, type StoreContract } from '@/shared/persistence'
import { createRuntimeSchema } from '@/shared/validation/schema'

export type ThemeMode = 'system' | 'light' | 'dark'
export type FilterCategory = 'all' | ToolCategory

export interface AppPrefsShape {
  themeMode: ThemeMode
  homeKeyword: string
  homeCategory: FilterCategory
  recentTools: string[]
}

const prefsSchema = createRuntimeSchema<AppPrefsShape>((data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('prefs must be an object')
  const record = data as Record<string, unknown>
  const themeMode = record.themeMode === 'light' || record.themeMode === 'dark' ? record.themeMode : 'system'
  const homeKeyword = typeof record.homeKeyword === 'string' ? record.homeKeyword : ''
  const homeCategory =
    record.homeCategory === 'prompt' || record.homeCategory === 'link' || record.homeCategory === 'all'
      ? record.homeCategory
      : 'all'
  const recentTools = Array.isArray(record.recentTools)
    ? record.recentTools.filter((item): item is string => typeof item === 'string')
    : []
  return {
    themeMode,
    homeKeyword,
    homeCategory,
    recentTools,
  }
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
  if (raw) return loadRecord(storageKeys.prefsV1, prefsSchema, defaultPrefs)
  return migrate() ?? defaultPrefs
}

const save = (value: AppPrefsShape) => saveRecord(storageKeys.prefsV1, prefsSchema.parse(value))
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
} satisfies StoreContract<AppPrefsShape> & {
  migrate: () => AppPrefsShape | null
  defaults: AppPrefsShape
}
