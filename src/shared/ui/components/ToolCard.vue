<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import type { ToolItem } from '@/types/tool'
import BlobLayer from './BlobLayer.vue'
import { createCardMotionPreset } from '@/shared/ui/composables/useBlobMotion'

const props = defineProps<{
  tool: ToolItem
}>()
const emit = defineEmits<{
  'open-tool': [toolId: string]
}>()

const motionPreset = computed(() => createCardMotionPreset(`${props.tool.id}:${props.tool.name}`))
</script>

<template>
  <article
    class="surface-card flex h-full flex-col p-4"
    :style="motionPreset.tint"
  >
    <BlobLayer :blobs="motionPreset.blobs" />

    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-[var(--text-primary)]">{{ tool.name }}</h3>
      <span
        class="ui-status"
        :class="tool.status === 'ready' ? 'ui-status--ok' : 'ui-status--warn'"
      >
        {{ tool.status === 'ready' ? '可用' : '开发中' }}
      </span>
    </div>

    <p class="mb-4 text-sm text-[var(--text-muted)]">{{ tool.description }}</p>

    <div class="mb-4 flex flex-wrap gap-1.5">
      <span
        v-for="tag in tool.tags"
        :key="tag"
        class="ui-chip"
      >
        {{ tag }}
      </span>
    </div>

    <div class="mt-auto text-xs text-[var(--text-muted)]">
      路径：{{ tool.path }}
    </div>

    <RouterLink
      v-if="tool.status === 'ready'"
      :to="tool.path"
      class="ui-btn ui-btn--primary mt-3"
      @click="emit('open-tool', tool.id)"
    >
      打开工具
    </RouterLink>

    <button
      v-else
      type="button"
      disabled
      class="ui-btn ui-btn--disabled mt-3"
    >
      即将上线
    </button>
  </article>
</template>
