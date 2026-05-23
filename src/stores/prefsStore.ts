/**
 * @file prefsStore 文件说明。
 * @description 按业务域封装本地持久化状态读写接口。
 */
import { z } from 'zod'
import type { ToolCategory } from '../types/tool'
import { storageEngine } from '../storage/engine'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'
import type { StoreContract } from './store-contract'

/**
 * ThemeMode 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type ThemeMode = 'system' | 'light' | 'dark'

/**
 * FilterCategory 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type FilterCategory = 'all' | ToolCategory

/**
 * AppPrefsShape 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
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

/**
 * prefsStore 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
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
