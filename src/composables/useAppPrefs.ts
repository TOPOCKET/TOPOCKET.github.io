/**
 * @file useAppPrefs 文件说明。
 * @description 组合式复用逻辑与页面共享状态访问能力。
 */
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

/**
 * useAppPrefs：提供可复用组合式能力。
 * @return 返回页面可消费的组合式 API。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
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
