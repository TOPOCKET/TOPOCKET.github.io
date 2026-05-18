<script setup lang="ts">
import type { ToolCategory } from '../types/tool'

defineProps<{
  categories: { key: 'all' | ToolCategory; label: string }[]
  modelValue: 'all' | ToolCategory
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'all' | ToolCategory]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="item in categories"
      :key="item.key"
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm transition"
      :class="modelValue === item.key
        ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'"
      @click="emit('update:modelValue', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
