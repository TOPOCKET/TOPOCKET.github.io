<script setup lang="ts">
defineProps<{
  blobs: Record<string, string>[]
}>()
</script>

<template>
  <div class="raycast-blob-layer" aria-hidden="true">
    <span
      v-for="(blobStyle, index) in blobs"
      :key="index"
      class="raycast-blob"
      :style="blobStyle"
    />
  </div>
</template>
