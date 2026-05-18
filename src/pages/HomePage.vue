<script setup lang="ts">
import { computed, ref } from 'vue'
import CategoryFilter from '../components/CategoryFilter.vue'
import SearchBox from '../components/SearchBox.vue'
import ToolCard from '../components/ToolCard.vue'
import { tools } from '../data/tools'
import type { ToolCategory, ToolItem } from '../types/tool'

const keyword = ref('')
const activeCategory = ref<'all' | ToolCategory>('all')

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
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-8">
      <h1 class="mb-2 text-2xl font-semibold text-slate-100 sm:text-3xl">个人小工具集合</h1>
      <p class="text-sm text-slate-400 sm:text-base">
        集中管理游戏数值计算、小游戏、AI 提示词模板和常用链接。
      </p>
    </header>

    <section class="mb-6 grid gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2">
      <SearchBox v-model="keyword" />
      <div>
        <p class="mb-2 text-sm text-slate-400">分类筛选</p>
        <CategoryFilter v-model="activeCategory" :categories="categories" />
      </div>
    </section>

    <section class="mb-4 flex items-center justify-between text-sm text-slate-400">
      <span>共 {{ filteredTools.length }} 个匹配结果</span>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
    </section>
  </main>
</template>
