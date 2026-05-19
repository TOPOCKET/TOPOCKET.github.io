<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BlobLayer from '../components/BlobLayer.vue'
import { createPanelMotionPreset } from '../composables/useBlobMotion'
import { game2048Store } from '../stores/game2048Store'
import { useRoute } from 'vue-router'
import { useCheatCode } from '../cheats/useCheatCode'
import { createGame2048CheatAdapter } from '../cheats/game2048Cheats'

const GRID_SIZE = 4
type Board = number[][]
type Direction = 'left' | 'right' | 'up' | 'down'

const persisted = game2048Store.load()
const board = ref<Board>(persisted.board)
const score = ref(persisted.score)
const best = ref(persisted.best)
const won = ref(persisted.won)
const gameOver = ref(persisted.gameOver)
const throttleSave = game2048Store.createThrottleSave(300)
const route = useRoute()
const cheatAdapter = createGame2048CheatAdapter()
const cheatToast = ref('')
const restartTick = ref(0)

const pageMotion = computed(() => createPanelMotionPreset('game-2048:page'))
const boardMotion = computed(() => createPanelMotionPreset('game-2048:board'))

const flattenedBoard = computed(() => board.value.flat())

function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0))
}

function cloneBoard(source: Board): Board {
  return source.map((row) => [...row])
}

function persistNow() {
  game2048Store.save({
    board: board.value,
    score: score.value,
    best: best.value,
    won: won.value,
    gameOver: gameOver.value,
  })
}

function persistThrottled() {
  throttleSave({
    board: board.value,
    score: score.value,
    best: best.value,
    won: won.value,
    gameOver: gameOver.value,
  })
}

function addRandomTile(target: Board): boolean {
  const emptyCells: Array<{ row: number; col: number }> = []
  target.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value === 0) {
        emptyCells.push({ row: rowIndex, col: colIndex })
      }
    })
  })

  if (emptyCells.length === 0) return false
  const picked = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  target[picked.row][picked.col] = Math.random() < 0.9 ? 2 : 4
  return true
}

function compressLine(line: number[]): { line: number[]; gained: number } {
  const compact = line.filter((value) => value !== 0)
  const next: number[] = []
  let gained = 0

  for (let i = 0; i < compact.length; i += 1) {
    const current = compact[i]
    const nextValue = compact[i + 1]
    if (nextValue !== undefined && cheatAdapter.canMergePair(current, nextValue)) {
      const merged = cheatAdapter.mergedValue(current, nextValue)
      next.push(merged)
      gained += merged
      i += 1
      continue
    }
    next.push(current)
  }

  while (next.length < GRID_SIZE) next.push(0)
  return { line: next, gained }
}

function slide(direction: Direction): boolean {
  if (gameOver.value) return false

  const working = cloneBoard(board.value)
  let moved = false
  let gainedTotal = 0

  const readLine = (index: number): number[] => {
    if (direction === 'left' || direction === 'right') {
      const row = [...working[index]]
      return direction === 'left' ? row : row.reverse()
    }
    const column = working.map((row) => row[index])
    return direction === 'up' ? column : column.reverse()
  }

  const writeLine = (index: number, values: number[]) => {
    const applied = direction === 'left' || direction === 'up' ? values : [...values].reverse()
    if (direction === 'left' || direction === 'right') {
      working[index] = applied
      return
    }
    for (let row = 0; row < GRID_SIZE; row += 1) {
      working[row][index] = applied[row]
    }
  }

  for (let i = 0; i < GRID_SIZE; i += 1) {
    const original = readLine(i)
    const { line: compressed, gained } = compressLine(original)
    if (original.some((value, idx) => value !== compressed[idx])) moved = true
    gainedTotal += gained
    writeLine(i, compressed)
  }

  if (!moved) return false

  board.value = working
  score.value += cheatAdapter.scoreGain(gainedTotal)
  if (score.value > best.value) best.value = score.value
  addRandomTile(board.value)
  updateFlags()
  cheatAdapter.onTurnResolve()
  persistThrottled()
  return true
}

function updateFlags() {
  const values = board.value.flat()
  won.value = values.some((value) => value >= 2048)

  if (values.includes(0)) {
    gameOver.value = false
    return
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const current = board.value[row][col]
      if (row + 1 < GRID_SIZE && board.value[row + 1][col] === current) {
        gameOver.value = false
        return
      }
      if (col + 1 < GRID_SIZE && board.value[row][col + 1] === current) {
        gameOver.value = false
        return
      }
    }
  }
  const blocked = true
  gameOver.value = cheatAdapter.resolveGameOver(blocked)
  if (gameOver.value) {
    cheatAdapter.onGameOver()
  }
}

function restart() {
  cheatAdapter.onRestart()
  score.value = 0
  won.value = false
  gameOver.value = false
  const fresh = createEmptyBoard()
  addRandomTile(fresh)
  addRandomTile(fresh)
  board.value = fresh
  restartTick.value += 1
  persistNow()
}

function onKeyDown(event: KeyboardEvent) {
  const keyMap: Record<string, Direction> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
  }

  const direction = keyMap[event.key]
  if (!direction) return
  event.preventDefault()
  slide(direction)
}

onMounted(() => {
  if (board.value.flat().every((value) => value === 0)) {
    cheatAdapter.onGameStart()
    restart()
  } else {
    updateFlags()
  }
  window.addEventListener('keydown', onKeyDown, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  persistNow()
})

const gameStatus = computed(() => {
  if (gameOver.value) return 'game-over'
  if (won.value) return 'won'
  return 'playing'
})

useCheatCode({
  code: 'sopronwitta',
  scope: () => route.name === 'mini-game-2048',
  resetOn: restartTick,
  onMatch: () => {
    cheatAdapter.activatePrimaryCheat()
    cheatToast.value = '作弊已启用：差一倍可合成'
    setTimeout(() => {
      cheatToast.value = ''
    }, 1400)
  },
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">2048 Mini</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">方向键或 WASD 合并数字，目标 2048。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <section class="mb-6">
      <article class="glass-panel command-panel p-4" :style="pageMotion.tint">
        <BlobLayer :blobs="pageMotion.blobs" variant="panel" />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-wrap items-center gap-3">
            <div class="ui-chip px-3 py-2">
              <p class="text-xs text-[var(--text-muted)]">当前分数</p>
              <p class="text-xl font-semibold text-[var(--text-primary)]">{{ score }}</p>
            </div>
            <div class="ui-chip px-3 py-2">
              <p class="text-xs text-[var(--text-muted)]">历史最高</p>
              <p class="text-xl font-semibold text-[var(--text-primary)]">{{ best }}</p>
            </div>
            <span v-if="gameStatus === 'playing'" class="ui-status ui-status--ok">进行中</span>
            <span v-else-if="gameStatus === 'won'" class="ui-status ui-status--ok">已达 2048</span>
            <span v-else class="ui-status ui-status--warn">游戏结束</span>
            <span v-if="cheatAdapter.statusText()" class="ui-status ui-status--warn">{{ cheatAdapter.statusText() }}</span>
          </div>
          <button type="button" class="ui-btn ui-btn--primary h-fit sm:self-center" @click="restart">
            重新开始
          </button>
        </div>
      </article>
    </section>

    <section class="glass-panel command-panel p-4" :style="boardMotion.tint">
      <BlobLayer :blobs="boardMotion.blobs" variant="panel" />
      <div class="game-grid">
        <div
          v-for="(value, index) in flattenedBoard"
          :key="index"
          class="game-cell"
          :class="value ? `tile-${value}` : 'tile-empty'"
        >
          {{ value || '' }}
        </div>
      </div>
      <p class="mt-4 text-xs text-[var(--text-muted)]">提示：同值方块碰撞会合并，无法移动时结束。</p>
      <p v-if="cheatToast" class="mt-2 text-xs text-[var(--warn-text)]">{{ cheatToast }}</p>
    </section>
  </main>
</template>

<style scoped>
.game-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.game-cell {
  display: grid;
  place-items: center;
  min-height: 72px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  font-size: clamp(1rem, 2.4vw, 1.5rem);
  font-weight: 700;
  color: var(--text-primary);
  backdrop-filter: blur(calc(var(--glass-blur) * 0.62)) saturate(114%);
}

.tile-empty {
  color: transparent;
}

.tile-2 { background: rgb(99 102 241 / 16%); }
.tile-4 { background: rgb(59 130 246 / 18%); }
.tile-8 { background: rgb(14 165 233 / 20%); }
.tile-16 { background: rgb(16 185 129 / 20%); }
.tile-32 { background: rgb(234 179 8 / 22%); }
.tile-64 { background: rgb(249 115 22 / 24%); }
.tile-128 { background: rgb(244 63 94 / 24%); }
.tile-256 { background: rgb(168 85 247 / 24%); }
.tile-512 { background: rgb(236 72 153 / 26%); }
.tile-1024 { background: rgb(6 182 212 / 28%); }
.tile-2048 { background: rgb(34 197 94 / 30%); }

@media (max-width: 640px) {
  .game-cell {
    min-height: 60px;
  }
}
</style>
