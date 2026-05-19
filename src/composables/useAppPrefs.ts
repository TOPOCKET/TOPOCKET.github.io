import { computed, ref, watch } from 'vue'
import { prefsStore, type FilterCategory, type ThemeMode } from '../stores/prefsStore'

const prefs = ref(prefsStore.load())

watch(
  prefs,
  (value) => {
    prefsStore.save(value)
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
