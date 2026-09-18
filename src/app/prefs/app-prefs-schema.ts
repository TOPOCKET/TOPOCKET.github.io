import { toolCategoryKeys } from '@/data/tool-categories'
import { createRuntimeSchema } from '@/shared/validation/schema'

export type ThemeMode = 'system' | 'light' | 'dark'
export type FilterCategory = 'all' | (typeof toolCategoryKeys)[number]

export interface AppPrefsShape {
  themeMode: ThemeMode
  homeKeyword: string
  homeCategory: FilterCategory
  recentTools: string[]
}

const maxRecentTools = 12

export const createDefaultAppPrefs = (): AppPrefsShape => ({
  themeMode: 'system',
  homeKeyword: '',
  homeCategory: 'all',
  recentTools: [],
})

export const appPrefsSchema = createRuntimeSchema<AppPrefsShape>((data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('app prefs must be an object')
  const record = data as Record<string, unknown>
  const themeMode: ThemeMode = record.themeMode === 'light' || record.themeMode === 'dark' ? record.themeMode : 'system'
  const homeCategory: FilterCategory =
    record.homeCategory === 'all' ||
    (typeof record.homeCategory === 'string' && toolCategoryKeys.includes(record.homeCategory as (typeof toolCategoryKeys)[number]))
      ? record.homeCategory as FilterCategory
      : 'all'

  return {
    themeMode,
    homeKeyword: typeof record.homeKeyword === 'string' ? record.homeKeyword : '',
    homeCategory,
    recentTools: Array.isArray(record.recentTools)
      ? [...new Set(record.recentTools.filter((item): item is string => typeof item === 'string' && item.length > 0))].slice(0, maxRecentTools)
      : [],
  }
})
