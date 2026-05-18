<script setup lang="ts">
defineProps<{
  blobs: Record<string, string>[]
  variant?: 'card' | 'panel'
}>()
</script>

<template>
  <div class="raycast-blob-layer" aria-hidden="true">
    <span
      v-for="(blobStyle, index) in blobs"
      :key="index"
      class="raycast-blob"
      :class="variant === 'panel' ? 'raycast-blob--panel' : ''"
      :style="blobStyle"
    />
  </div>
</template>
