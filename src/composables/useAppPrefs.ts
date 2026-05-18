import { computed, ref, watch } from 'vue'
import type { ToolCategory } from '../types/tool'

type ThemeMode = 'system' | 'light' | 'dark'
type FilterCategory = 'all' | ToolCategory

interface AppPrefsShape {
  themeMode: ThemeMode
  homeKeyword: string
  homeCategory: FilterCategory
  recentTools: string[]
}

const STORAGE_KEY = 'sopronwitta:prefs:v1'

const defaultPrefs: AppPrefsShape = {
  themeMode: 'system',
  homeKeyword: '',
  homeCategory: 'all',
  recentTools: [],
}

const loadPrefs = (): AppPrefsShape => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<AppPrefsShape>
    return {
      themeMode: parsed.themeMode ?? defaultPrefs.themeMode,
      homeKeyword: parsed.homeKeyword ?? defaultPrefs.homeKeyword,
      homeCategory: parsed.homeCategory ?? defaultPrefs.homeCategory,
      recentTools: Array.isArray(parsed.recentTools) ? parsed.recentTools : [],
    }
  } catch {
    return defaultPrefs
  }
}

const prefs = ref<AppPrefsShape>(loadPrefs())

watch(
  prefs,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

const pushRecentTool = (toolId: string) => {
  const next = [toolId, ...prefs.value.recentTools.filter((id) => id !== toolId)].slice(0, 12)
  prefs.value.recentTools = next
}

export const useAppPrefs = () => {
  return {
    themeMode: computed({
      get: () => prefs.value.themeMode,
      set: (value: ThemeMode) => {
        prefs.value.themeMode = value
      },
    }),
    homeKeyword: computed({
      get: () => prefs.value.homeKeyword,
      set: (value: string) => {
        prefs.value.homeKeyword = value
      },
    }),
    homeCategory: computed({
      get: () => prefs.value.homeCategory,
      set: (value: FilterCategory) => {
        prefs.value.homeCategory = value
      },
    }),
    recentTools: computed(() => prefs.value.recentTools),
    pushRecentTool,
  }
}
