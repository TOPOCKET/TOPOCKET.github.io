<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BlobLayer from '../components/BlobLayer.vue'
import { prompts } from '../data/prompts'
import { createPanelMotionPreset } from '../composables/useBlobMotion'
import { useInputShortcut } from '../composables/useInputShortcut'

const keyword = ref('')
const copiedId = ref<string | null>(null)

const pageMotion = computed(() => createPanelMotionPreset('prompts:page'))

const filteredPrompts = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  const list = !text
    ? prompts
    : prompts.filter((item) =>
      [item.title, item.purpose, item.placeholders.join(' '), item.content]
        .join(' ')
        .toLowerCase()
        .includes(text),
    )

  return list.map((item) => ({
    ...item,
    motion: createPanelMotionPreset(`prompts:item:${item.id}`),
  }))
})

const copyPrompt = async (id: string, content: string) => {
  await navigator.clipboard.writeText(content)
  copiedId.value = id
  setTimeout(() => {
    if (copiedId.value === id) copiedId.value = null
  }, 1400)
}

useInputShortcut({
  selector: '[data-prompts-search-input="true"]',
  ctrlKey: true,
  key: '/',
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">提示词模板</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">搜索、预览并一键复制模板。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <section class="glass-panel command-panel mb-6 p-4" :style="pageMotion.tint">
      <BlobLayer :blobs="pageMotion.blobs" variant="panel" />
      <label class="block">
        <span class="mb-2 block text-sm text-[var(--text-muted)]">搜索模板</span>
        <input
          v-model="keyword"
          type="text"
          placeholder="输入标题、用途、变量或正文"
          data-prompts-search-input="true"
          class="ui-input w-full px-3 py-2 text-sm"
        >
      </label>
    </section>

    <section class="mb-4 text-sm text-[var(--text-muted)]">
      共 {{ filteredPrompts.length }} 个匹配模板
    </section>

    <section class="space-y-4">
      <article
        v-for="item in filteredPrompts"
        :key="item.id"
        class="glass-panel command-panel p-4"
        :style="item.motion.tint"
      >
        <BlobLayer :blobs="item.motion.blobs" variant="panel" />
        <div class="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">{{ item.title }}</h2>
            <p class="text-sm text-[var(--text-muted)]">{{ item.purpose }}</p>
          </div>
          <button class="ui-btn ui-btn--primary" type="button" @click="copyPrompt(item.id, item.content)">
            {{ copiedId === item.id ? '已复制' : '复制' }}
          </button>
        </div>

        <div class="mb-3 flex flex-wrap gap-1.5">
          <span v-for="ph in item.placeholders" :key="ph" class="ui-chip">
            {{ ph }}
          </span>
        </div>

        <pre class="ui-card overflow-x-auto whitespace-pre-wrap p-3 text-sm text-[var(--text-secondary)]">{{ item.content }}</pre>
      </article>
    </section>
  </main>
</template>
