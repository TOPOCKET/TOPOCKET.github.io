import { computed, ref, watch } from 'vue'
import { appPrefsStore } from './app-prefs-store'
import type { FilterCategory, ThemeMode } from './app-prefs-schema'

const prefs = ref(appPrefsStore.load())
let persistTimer: ReturnType<typeof setTimeout> | undefined

const applyTheme = (themeMode: ThemeMode) => {
  if (typeof document === 'undefined') return
  if (themeMode === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = themeMode
}

watch(
  prefs,
  (value) => {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => appPrefsStore.save(value), 180)
  },
  { deep: true },
)

watch(() => prefs.value.themeMode, applyTheme, { immediate: true })

const pushRecentTool = (toolId: string) => {
  prefs.value.recentTools = [toolId, ...prefs.value.recentTools.filter((id) => id !== toolId)].slice(0, 12)
}

export const useAppPrefs = () => ({
  themeMode: computed({
    get: () => prefs.value.themeMode,
    set: (value: ThemeMode) => { prefs.value.themeMode = value },
  }),
  homeKeyword: computed({
    get: () => prefs.value.homeKeyword,
    set: (value: string) => { prefs.value.homeKeyword = value },
  }),
  homeCategory: computed({
    get: () => prefs.value.homeCategory,
    set: (value: FilterCategory) => { prefs.value.homeCategory = value },
  }),
  recentTools: computed(() => prefs.value.recentTools),
  pushRecentTool,
})
