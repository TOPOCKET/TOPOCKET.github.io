<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  addCustomHero,
  attackWithSelectedUnit,
  claimVictoryRewards,
  endPlayerTurn,
  moveSelectedUnit,
  selectTacticsUnit,
  startTacticsBattle,
  trainHeroStat,
} from '../engine/tactics-engine'
import type { TacticsHero, TacticsStats, TacticsUnit } from '../model/tactics-model'
import { tacticsStore } from '../services/tactics-store'

const save = ref(tacticsStore.load())
const message = ref('欢迎来到营地。')
const customName = ref('')
const customColor = ref('#a78bfa')

const battle = computed(() => save.value.battle)
const selectedUnit = computed(() =>
  battle.value?.units.find((unit) => unit.id === battle.value?.selectedUnitId && unit.hp > 0) ?? null,
)

const cells = computed(() => {
  const current = battle.value
  if (!current) return []
  return Array.from({ length: current.width * current.height }, (_, index) => ({
    x: index % current.width,
    y: Math.floor(index / current.width),
    unit: current.units.find((unit) => unit.hp > 0 && unit.x === index % current.width && unit.y === Math.floor(index / current.width)) ?? null,
  }))
})

const unitAt = (x: number, y: number): TacticsUnit | null =>
  battle.value?.units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y) ?? null

const hpPercent = (unit: TacticsUnit) => `${Math.max(0, Math.round((unit.hp / unit.stats.maxHp) * 100))}%`

const statText = (stats: TacticsStats) =>
  `HP ${stats.maxHp} / 攻 ${stats.atk} / 防 ${stats.def} / 移 ${stats.move} / 射 ${stats.range}`

const selectHeroUnit = (unit: TacticsUnit) => {
  save.value = selectTacticsUnit(save.value, unit.id)
}

const handleCell = (x: number, y: number) => {
  const current = battle.value
  if (!current || current.status !== 'fighting') return
  const unit = unitAt(x, y)
  if (unit?.side === 'player') {
    selectHeroUnit(unit)
    return
  }
  if (unit?.side === 'enemy') {
    const result = attackWithSelectedUnit(save.value, unit.id)
    save.value = result.save
    message.value = result.message
    return
  }
  const result = moveSelectedUnit(save.value, { x, y })
  save.value = result.save
  message.value = result.message
}

const startBattle = () => {
  save.value = startTacticsBattle(save.value)
  message.value = '战斗开始。'
}

const finishTurn = () => {
  save.value = endPlayerTurn(save.value)
  message.value = '回合推进。'
}

const claimRewards = () => {
  save.value = claimVictoryRewards(save.value)
  message.value = '奖励已领取，新的远征层数已开启。'
}

const resetRun = () => {
  save.value = tacticsStore.reset()
  message.value = '存档已重置。'
}

const train = (hero: TacticsHero, stat: keyof Pick<TacticsStats, 'maxHp' | 'atk' | 'def'>) => {
  save.value = trainHeroStat(save.value, hero.id, stat)
  message.value = `${hero.name} 完成训练。`
}

const addHero = () => {
  const before = save.value.heroes.length
  save.value = addCustomHero(save.value, customName.value, customColor.value)
  if (save.value.heroes.length > before) {
    message.value = '新角色已加入队伍。'
    customName.value = ''
  } else {
    message.value = '请输入角色名。'
  }
}

watch(
  save,
  (value) => {
    tacticsStore.save(value)
  },
  { deep: true },
)
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">无限战棋</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">本地存档、无限推进、角色自定义与局外成长。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <section class="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <article class="surface-card p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-[var(--text-muted)]">远征层数</p>
            <p class="text-2xl font-semibold text-[var(--text-primary)]">第 {{ save.stage }} 层</p>
          </div>
          <div class="text-sm text-[var(--text-muted)]">补给 {{ save.supplies }}</div>
          <div class="flex flex-wrap gap-2">
            <button v-if="!battle" class="ui-btn ui-btn--primary" type="button" @click="startBattle">开始远征</button>
            <button v-else-if="battle.status === 'victory'" class="ui-btn ui-btn--primary" type="button" @click="claimRewards">领取奖励</button>
            <button v-else-if="battle.status === 'defeat'" class="ui-btn ui-btn--primary" type="button" @click="startBattle">重开本层</button>
            <button class="ui-btn ui-btn--ghost" type="button" @click="resetRun">重置存档</button>
          </div>
        </div>

        <div v-if="battle" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
            <span>状态：{{ battle.status }} / 回合：{{ battle.round }} / {{ battle.turn === 'player' ? '我方' : '敌方' }}</span>
            <button
              class="ui-btn ui-btn--ghost"
              type="button"
              :disabled="battle.status !== 'fighting'"
              @click="finishTurn"
            >
              结束回合
            </button>
          </div>

          <div class="grid max-w-[520px] grid-cols-8 gap-1">
            <button
              v-for="cell in cells"
              :key="`${cell.x}-${cell.y}`"
              type="button"
              class="aspect-square rounded-[8px] border border-[var(--border)] bg-transparent p-1 text-left transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
              :class="{ 'ring-2 ring-[var(--accent-soft)]': selectedUnit?.x === cell.x && selectedUnit?.y === cell.y }"
              @click="handleCell(cell.x, cell.y)"
            >
              <template v-if="cell.unit">
                <div class="flex h-full flex-col justify-between rounded-[6px] p-1 text-[10px]" :style="{ backgroundColor: cell.unit.color + '33' }">
                  <span class="truncate font-semibold text-[var(--text-primary)]">{{ cell.unit.name }}</span>
                  <span class="h-1 rounded-full bg-[var(--border)]">
                    <span class="block h-full rounded-full bg-[var(--ok-text)]" :style="{ width: hpPercent(cell.unit) }" />
                  </span>
                </div>
              </template>
            </button>
          </div>
        </div>

        <p v-else class="text-sm text-[var(--text-muted)]">在营地训练角色，准备后开始下一层远征。</p>
      </article>

      <aside class="space-y-4">
        <section class="surface-card p-4">
          <h2 class="mb-3 text-lg font-semibold text-[var(--text-primary)]">队伍</h2>
          <div class="space-y-3">
            <article v-for="hero in save.heroes" :key="hero.id" class="rounded-[12px] border border-[var(--border)] p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: hero.color }" />
                  <span class="font-semibold text-[var(--text-primary)]">{{ hero.name }}</span>
                </div>
                <span class="text-xs text-[var(--text-muted)]">Lv.{{ hero.level }} / 训练 {{ hero.training }}</span>
              </div>
              <p class="mb-2 text-xs text-[var(--text-muted)]">{{ statText(hero.stats) }} / XP {{ hero.xp }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button class="ui-btn ui-btn--ghost px-2 py-1 text-xs" type="button" :disabled="hero.training <= 0" @click="train(hero, 'maxHp')">HP</button>
                <button class="ui-btn ui-btn--ghost px-2 py-1 text-xs" type="button" :disabled="hero.training <= 0" @click="train(hero, 'atk')">攻击</button>
                <button class="ui-btn ui-btn--ghost px-2 py-1 text-xs" type="button" :disabled="hero.training <= 0" @click="train(hero, 'def')">防御</button>
              </div>
            </article>
          </div>
        </section>

        <section class="surface-card p-4">
          <h2 class="mb-3 text-lg font-semibold text-[var(--text-primary)]">自定义角色</h2>
          <div class="grid gap-2">
            <input v-model="customName" class="ui-input px-3 py-2 text-sm" maxlength="8" placeholder="角色名">
            <div class="flex gap-2">
              <input v-model="customColor" class="h-10 w-14 rounded-[10px] border border-[var(--border)] bg-transparent" type="color">
              <button class="ui-btn ui-btn--primary flex-1" type="button" @click="addHero">加入队伍</button>
            </div>
          </div>
        </section>

        <section class="surface-card p-4">
          <h2 class="mb-2 text-lg font-semibold text-[var(--text-primary)]">记录</h2>
          <p class="mb-2 text-sm text-[var(--text-secondary)]">{{ message }}</p>
          <ol class="space-y-1 text-xs text-[var(--text-muted)]">
            <li v-for="entry in battle?.log ?? []" :key="entry">{{ entry }}</li>
          </ol>
        </section>
      </aside>
    </section>
  </main>
</template>
