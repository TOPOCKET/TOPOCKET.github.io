<script setup lang="ts">
import { computed } from 'vue'
import BlobLayer from './BlobLayer.vue'
import { createPanelMotionPreset } from '@/shared/ui/composables/useBlobMotion'

const props = withDefaults(
  defineProps<{
    as?: string
    decorative?: boolean
    motionKey?: string
    bodyClass?: string
  }>(),
  {
    as: 'section',
    decorative: false,
    motionKey: 'surface-card',
    bodyClass: 'p-4 sm:p-5',
  },
)

const motionPreset = computed(() => (props.decorative ? createPanelMotionPreset(props.motionKey) : null))
</script>

<template>
  <component
    :is="as"
    class="surface-card ui-surface-card"
    :class="{ 'command-panel': decorative }"
    :style="motionPreset?.tint"
  >
    <BlobLayer
      v-if="motionPreset"
      :blobs="motionPreset.blobs"
    />
    <div :class="bodyClass">
      <slot />
    </div>
  </component>
</template>
