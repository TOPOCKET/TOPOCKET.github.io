import { loadRecord, saveRecord, storageEngine, storageKeys, type StoreContract } from '@/shared/persistence'
import { appPrefsSchema, createDefaultAppPrefs, type AppPrefsShape } from './app-prefs-schema'

const migrate = (): AppPrefsShape | null => {
  const legacyRaw = storageEngine.getRaw('prefs')
  if (!legacyRaw) return null
  try {
    const result = appPrefsSchema.safeParse(JSON.parse(legacyRaw))
    if (!result.success) return null
    saveRecord(storageKeys.appPrefsV1, result.data)
    storageEngine.remove('prefs')
    return result.data
  } catch {
    return null
  }
}

const load = (): AppPrefsShape => {
  if (storageEngine.getRaw(storageKeys.appPrefsV1)) {
    return loadRecord(storageKeys.appPrefsV1, appPrefsSchema, createDefaultAppPrefs)
  }
  return migrate() ?? createDefaultAppPrefs()
}

const save = (value: AppPrefsShape) => saveRecord(storageKeys.appPrefsV1, appPrefsSchema.parse(value))
const reset = (): AppPrefsShape => {
  const defaults = createDefaultAppPrefs()
  save(defaults)
  return defaults
}

export const appPrefsStore = { load, save, reset, migrate } satisfies StoreContract<AppPrefsShape> & { migrate: () => AppPrefsShape | null }
