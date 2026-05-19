<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BlobLayer from '../components/BlobLayer.vue'
import { createPanelMotionPreset } from '../composables/useBlobMotion'

interface CardItem {
  uid: string
  pairId: string
  label: string
}

const seedPairs = [
  { id: 'vue', label: 'VUE' },
  { id: 'ts', label: 'TS' },
  { id: 'vite', label: 'VITE' },
  { id: 'router', label: 'ROUTER' },
  { id: 'tailwind', label: 'TAILWIND' },
  { id: 'zod', label: 'ZOD' },
]

const pageMotion = computed(() => createPanelMotionPreset('memory-match:page'))
const boardMotion = computed(() => createPanelMotionPreset('memory-match:board'))

const deck = ref<CardItem[]>([])
const flipped = ref<number[]>([])
const matched = ref<Set<number>>(new Set())
const moves = ref(0)
const elapsedSec = ref(0)
const locked = ref(false)
const timerId = ref<number | null>(null)

const matchedCount = computed(() => matched.value.size)
const totalCards = computed(() => deck.value.length)
const allMatched = computed(() => totalCards.value > 0 && matchedCount.value === totalCards.value)
const canPlay = computed(() => !locked.value && !allMatched.value)
const statusText = computed(() => (allMatched.value ? '已完成' : '进行中'))

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function buildDeck(): CardItem[] {
  const doubled = seedPairs.flatMap((item, index) => [
    { uid: `${item.id}-a-${index}`, pairId: item.id, label: item.label },
    { uid: `${item.id}-b-${index}`, pairId: item.id, label: item.label },
  ])
  return shuffle(doubled)
}

function stopTimer() {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

function startTimer() {
  stopTimer()
  timerId.value = window.setInterval(() => {
    elapsedSec.value += 1
  }, 1000)
}

function resetGame() {
  deck.value = buildDeck()
  flipped.value = []
  matched.value = new Set()
  moves.value = 0
  elapsedSec.value = 0
  locked.value = false
  startTimer()
}

function isVisible(index: number): boolean {
  return flipped.value.includes(index) || matched.value.has(index)
}

function reveal(index: number) {
  if (!canPlay.value) return
  if (flipped.value.includes(index) || matched.value.has(index)) return

  flipped.value = [...flipped.value, index]
  if (flipped.value.length < 2) return

  moves.value += 1
  const [a, b] = flipped.value
  const aCard = deck.value[a]
  const bCard = deck.value[b]
  if (aCard && bCard && aCard.pairId === bCard.pairId) {
    matched.value = new Set([...matched.value, a, b])
    flipped.value = []
    if (matched.value.size === deck.value.length) {
      stopTimer()
    }
    return
  }

  locked.value = true
  window.setTimeout(() => {
    flipped.value = []
    locked.value = false
  }, 650)
}

onMounted(() => {
  resetGame()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Memory Match</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">翻开两张相同卡片，直到全部匹配。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <section class="mb-6">
      <article class="glass-panel command-panel p-4" :style="pageMotion.tint">
        <BlobLayer :blobs="pageMotion.blobs" variant="panel" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-wrap items-center gap-3">
            <div class="ui-chip px-3 py-2">
              <p class="text-xs text-[var(--text-muted)]">步数</p>
              <p class="text-xl font-semibold text-[var(--text-primary)]">{{ moves }}</p>
            </div>
            <div class="ui-chip px-3 py-2">
              <p class="text-xs text-[var(--text-muted)]">用时</p>
              <p class="text-xl font-semibold text-[var(--text-primary)]">{{ elapsedSec }}s</p>
            </div>
            <div class="ui-chip px-3 py-2">
              <p class="text-xs text-[var(--text-muted)]">进度</p>
              <p class="text-xl font-semibold text-[var(--text-primary)]">{{ matchedCount }}/{{ totalCards }}</p>
            </div>
            <span class="ui-status" :class="allMatched ? 'ui-status--ok' : 'ui-status--warn'">{{ statusText }}</span>
          </div>
          <button type="button" class="ui-btn ui-btn--primary h-fit sm:self-center" @click="resetGame">
            重新开始
          </button>
        </div>
      </article>
    </section>

    <section class="glass-panel command-panel p-4" :style="boardMotion.tint">
      <BlobLayer :blobs="boardMotion.blobs" variant="panel" />
      <div class="memory-grid">
        <button
          v-for="(card, index) in deck"
          :key="card.uid"
          type="button"
          class="memory-card"
          :class="{ 'is-open': isVisible(index), 'is-done': matched.has(index) }"
          :disabled="matched.has(index)"
          @click="reveal(index)"
        >
          <span class="memory-card__label">{{ isVisible(index) ? card.label : '?' }}</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.memory-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.memory-card {
  display: grid;
  place-items: center;
  min-height: 84px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  backdrop-filter: blur(calc(var(--glass-blur) * 0.62)) saturate(114%);
  transition: border-color 180ms ease, color 180ms ease, background-color 180ms ease;
}

.memory-card:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.memory-card.is-open {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: rgb(255 255 255 / 10%);
}

.memory-card.is-done {
  border-color: var(--ok-border);
  color: var(--ok-text);
  background: var(--ok-soft);
}

.memory-card__label {
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
  font-weight: 700;
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .memory-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .memory-card {
    min-height: 74px;
  }
}
</style>
