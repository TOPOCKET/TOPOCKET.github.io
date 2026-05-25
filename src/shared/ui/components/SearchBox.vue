<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="block">
    <span class="mb-2 block text-sm text-[var(--text-muted)]">搜索工具</span>
    <input
      :value="modelValue"
      type="text"
      placeholder="输入名称、描述或标签"
      data-home-search-input="true"
      class="ui-input w-full px-3 py-2 text-sm"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </label>
</template>
