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
      class="ui-filter-btn"
      :class="{ 'is-active': modelValue === item.key }"
      @click="emit('update:modelValue', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
