<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BlobLayer, CategoryFilter, SearchBox, ToolCard } from '@/shared/ui'
import { tools } from '@/data/tools'
import type { ToolCategory, ToolItem } from '@/types/tool'
import { createPanelMotionPreset } from '@/shared/ui/composables/useBlobMotion'
import { useAppPrefs } from '@/domains/home/composables/useAppPrefs'
import { useInputShortcut } from '@/shared/ui/composables/useInputShortcut'

const { homeKeyword, homeCategory, pushRecentTool } = useAppPrefs()
const keyword = ref(homeKeyword.value)
const activeCategory = ref<'all' | ToolCategory>(homeCategory.value)

const categories: { key: 'all' | ToolCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'calculator', label: '计算器' },
  { key: 'game', label: '小游戏' },
  { key: 'prompt', label: '提示词' },
  { key: 'link', label: '常用链接' },
]

const filteredTools = computed<ToolItem[]>(() => {
  const text = keyword.value.trim().toLowerCase()

  return tools.filter((tool) => {
    const byCategory =
      activeCategory.value === 'all' || tool.category === activeCategory.value

    if (!text) {
      return byCategory
    }

    const byText = [tool.name, tool.description, tool.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(text)

    return byCategory && byText
  })
})

const commandPanelMotion = computed(() => createPanelMotionPreset('command-panel:home'))

const onOpenTool = (toolId: string) => {
  pushRecentTool(toolId)
}

watch(keyword, (value) => {
  homeKeyword.value = value
})

watch(activeCategory, (value) => {
  homeCategory.value = value
})

useInputShortcut({
  selector: '[data-home-search-input="true"]',
  ctrlKey: true,
  key: '/',
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Sopronwitta</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">你的个人命令中心</p>
      </div>
      <div class="hidden items-center gap-2 sm:flex">
        <span class="text-xs text-[var(--text-muted)]">快速搜索</span>
        <span class="kbd">Ctrl</span>
        <span class="kbd">/</span>
      </div>
    </header>

    <section class="surface-card command-panel mb-6 grid gap-4 p-4 sm:grid-cols-2" :style="commandPanelMotion.tint">
      <BlobLayer :blobs="commandPanelMotion.blobs" />
      <div>
        <SearchBox v-model="keyword" />
      </div>
      <div>
        <p class="mb-2 text-sm text-[var(--text-muted)]">分类筛选</p>
        <CategoryFilter v-model="activeCategory" :categories="categories" />
      </div>
    </section>

    <section class="mb-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
      <span>共 {{ filteredTools.length }} 个匹配结果</span>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" @open-tool="onOpenTool" />
    </section>
  </main>
</template>
