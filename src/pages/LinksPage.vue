<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { quickLinks } from '../data/links'
import type { QuickLinkItem } from '../types/link'

const categoryTitleMap: Record<string, string> = {
  ai: 'AI',
  dev: '开发',
  media: '媒体',
}

const groupedLinks = computed(() => {
  const grouped = new Map<string, QuickLinkItem[]>()

  quickLinks.forEach((item) => {
    const bucket = grouped.get(item.category)
    if (bucket) {
      bucket.push(item)
      return
    }
    grouped.set(item.category, [item])
  })

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    title: categoryTitleMap[key] ?? key,
    items,
  }))
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-2 text-2xl font-semibold text-slate-100 sm:text-3xl">常用链接</h1>
        <p class="text-sm text-slate-400 sm:text-base">按分组管理，支持一键打开。</p>
      </div>
      <RouterLink
        to="/"
        class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
      >
        返回首页
      </RouterLink>
    </header>

    <section class="space-y-6">
      <article
        v-for="group in groupedLinks"
        :key="group.key"
        class="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
      >
        <h2 class="mb-3 text-lg font-semibold text-slate-100">{{ group.title }}</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            v-for="item in group.items"
            :key="item.id"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="font-medium">{{ item.name }}</span>
              <span
                v-if="item.favorite"
                class="rounded-md bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-300"
              >
                常用
              </span>
            </div>
            <p class="truncate text-xs text-slate-400">{{ item.url }}</p>
          </a>
        </div>
      </article>
    </section>
  </main>
</template>
