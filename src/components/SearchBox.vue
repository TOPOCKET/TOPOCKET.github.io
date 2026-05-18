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
    <span class="mb-2 block text-sm text-slate-400">搜索工具</span>
    <input
      :value="modelValue"
      type="text"
      placeholder="输入名称、描述或标签"
      class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </label>
</template>
