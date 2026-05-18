<script setup lang="ts">
import type { ToolItem } from '../types/tool'

defineProps<{
  tool: ToolItem
}>()
</script>

<template>
  <article class="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900/70 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-slate-100">{{ tool.name }}</h3>
      <span
        class="rounded-md px-2 py-1 text-xs"
        :class="tool.status === 'ready'
          ? 'bg-emerald-400/15 text-emerald-300'
          : 'bg-amber-400/15 text-amber-300'"
      >
        {{ tool.status === 'ready' ? '可用' : '开发中' }}
      </span>
    </div>

    <p class="mb-4 text-sm text-slate-400">{{ tool.description }}</p>

    <div class="mb-4 flex flex-wrap gap-1.5">
      <span
        v-for="tag in tool.tags"
        :key="tag"
        class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
      >
        {{ tag }}
      </span>
    </div>

    <div class="mt-auto text-xs text-slate-500">
      路径：{{ tool.path }}
    </div>
  </article>
</template>
