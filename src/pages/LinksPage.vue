<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BlobLayer from '../components/BlobLayer.vue'
import type { QuickLinkItem } from '../types/link'
import { createPanelMotionPreset } from '../composables/useBlobMotion'
import { linksStore } from '../stores/linksStore'

const categoryTitleMap: Record<string, string> = {
  ai: 'AI',
  dev: '开发',
  media: '媒体',
}

const links = linksStore.load()

const groupedLinks = computed(() => {
  const grouped = new Map<string, QuickLinkItem[]>()

  links.forEach((item) => {
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
    motion: createPanelMotionPreset(`links-group:${key}`),
  }))
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">常用链接</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">按分组管理，支持一键打开。</p>
      </div>
      <RouterLink
        to="/"
        class="ui-btn ui-btn--ghost"
      >
        返回首页
      </RouterLink>
    </header>

    <section class="space-y-6">
      <article
        v-for="group in groupedLinks"
        :key="group.key"
        class="raycast-card link-group p-4"
        :style="group.motion.tint"
      >
        <BlobLayer :blobs="group.motion.blobs" variant="panel" />
        <h2 class="mb-3 text-lg font-semibold text-[var(--text-primary)]">{{ group.title }}</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            v-for="item in group.items"
            :key="item.id"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-tile rounded-[12px] px-3 py-3 text-sm text-[var(--text-secondary)] transition focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="font-medium">{{ item.name }}</span>
              <span
                v-if="item.favorite"
                class="ui-badge ui-chip--fav px-2 py-0.5 text-xs"
              >
                常用
              </span>
            </div>
            <p class="truncate text-xs text-[var(--text-muted)]">{{ item.url }}</p>
          </a>
        </div>
      </article>
    </section>
  </main>
</template>
