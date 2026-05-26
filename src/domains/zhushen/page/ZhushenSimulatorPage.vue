<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BlobLayer } from '@/shared/ui'
import { createPanelMotionPreset } from '@/shared/ui/composables/useBlobMotion'
import {
  builtinZhushenEquips,
  builtinZhushenJobs,
  builtinZhushenSkills,
  builtinZhushenTraits,
} from '@/data/zhushen'
import {
  type AttrVector,
  type PromotionStep,
  type ScorePreset,
  type SearchProgress,
  type SimulationInput,
  formatVec,
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSimulationInputSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
} from '@/domains/zhushen/model/zhushen-model'
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'
import { trackAnalyticsEvent } from '@/shared/observability/client'
import { normalizeUnknownError } from '@/shared/observability/errors'
import { zhushenCustomStore } from '@/domains/zhushen/services/zhushen-custom-store'
import { ZHUSHEN_ATTR_LABEL, ZHUSHEN_EQUIP_SLOT_LABEL, ZHUSHEN_TRAIT_SLOT_LABEL } from '@/domains/zhushen/model/ui-meta'
import { runZhushenSimulation } from '@/domains/zhushen/engine/simulation'
import type { ZhushenSearchOrchestratorPort } from '@/domains/zhushen/ports'
import { zhushenSearchOrchestratorFactory } from '@/domains/zhushen/orchestrator/search-orchestrator'
import {
  initialZhushenSimulatorUiState,
  reduceZhushenSimulatorState,
  type ZhushenSimulatorEvent,
} from '@/domains/zhushen/model/simulator-events'
import {
  createZhushenDebugSnapshot,
  parseZhushenDebugSnapshot,
  replayZhushenDebugSnapshot,
} from '@/domains/zhushen/model/debug-snapshot'

const pageMotion = computed(() => createPanelMotionPreset('zhushen:simulator'))
const custom = ref(zhushenCustomStore.load())
const jobs = computed(() => [...builtinZhushenJobs, ...custom.value.jobs])
const equips = computed(() => [...builtinZhushenEquips, ...custom.value.equips])
const skills = computed(() => [...builtinZhushenSkills, ...custom.value.skills])
const traits = computed(() => [...builtinZhushenTraits, ...custom.value.traits])

const targetLevel = ref(150)
const initialJobId = ref('soldier')
const characterGrowth = ref<AttrVector>({ str: 6, tec: 4, agi: 7, con: 5, per: 3, wil: 2 })
const activeTraitIds = ref<string[]>([])
const activeEquipIds = ref<string[]>(['sword-king', 'armor-guard'])
const activeSkillIds = ref<string[]>(['nimble'])

const promotions = ref<PromotionStep[]>([
  { level: 1, toJobId: 'mercenary', equipIds: ['sword-king', 'ring-hawk', 'fashion-crown'], skillIds: ['focus'] },
  { level: 1, toJobId: 'royal-knight', equipIds: ['sword-king', 'armor-guard', 'ring-hawk', 'fashion-crown'], skillIds: ['nimble', 'fortitude'] },
])

const searchEnabled = ref(true)
const beamWidth = ref(SEARCH_RUNTIME_CONFIG.beamWidthDefault)
const maxTransfer = ref(SEARCH_RUNTIME_CONFIG.maxTransferDefault)
const maxTierDelta = ref(SEARCH_RUNTIME_CONFIG.maxTierDeltaDefault)
const maxSkillPerStep = ref(SEARCH_RUNTIME_CONFIG.maxSkillPerStepDefault)
const scorePreset = ref<ScorePreset>('sum')
const searchFinalEquipIds = ref<string[]>(['sword-king', 'armor-guard'])
const searchFinalSkillIds = ref<string[]>(['nimble'])
const searchTargetFinalJobId = ref('royal-knight')
const ignorePromotionRequirements = ref(false)

const output = ref<{ final: AttrVector; growthAcc: AttrVector; jobName: string; logs: string[] } | null>(null)
const searchSummary = ref<{ exploredStates: number; prunedByDominance: number } | null>(null)
const topPlans = ref<Array<{ rank: number; score: number; final: AttrVector; route: string; promotions: PromotionStep[] }>>([])
const errorText = ref('')
const selectionError = ref('')
const searchPending = ref(false)
const searchProgress = ref<SearchProgress | null>(null)
const uiState = ref(initialZhushenSimulatorUiState())
const uiEventLog = ref<ZhushenSimulatorEvent[]>([])
const dispatchUiEvent = (event: ZhushenSimulatorEvent) => {
  const eventNameMap: Record<
    ZhushenSimulatorEvent['type'],
    'calculation_started' | 'simulation_succeeded' | 'search_started' | 'search_progress_updated' | 'search_succeeded' | 'calculation_failed' | 'selection_error_set' | 'selection_error_clear'
  > = {
    selection_error_set: 'selection_error_set',
    selection_error_clear: 'selection_error_clear',
    calculation_started: 'calculation_started',
    simulation_succeeded: 'simulation_succeeded',
    search_started: 'search_started',
    search_progress_updated: 'search_progress_updated',
    search_succeeded: 'search_succeeded',
    calculation_failed: 'calculation_failed',
  }
  uiEventLog.value = [...uiEventLog.value, event]
  trackAnalyticsEvent({
    name: eventNameMap[event.type],
    domain: 'zhushen',
    at: Date.now(),
    payload: event.type === 'calculation_failed' ? { code: event.error.code, category: event.error.category, stage: event.error.stage } : undefined,
  })
  uiState.value = reduceZhushenSimulatorState(uiState.value, event)
  output.value = uiState.value.output
  searchSummary.value = uiState.value.searchSummary
  topPlans.value = uiState.value.topPlans
  errorText.value = uiState.value.errorText
  selectionError.value = uiState.value.selectionError
  searchPending.value = uiState.value.searchPending
  searchProgress.value = uiState.value.searchProgress
}
const searchOrchestrator: ZhushenSearchOrchestratorPort = zhushenSearchOrchestratorFactory.create({
  onProgress: (progress) => {
    dispatchUiEvent({ type: 'search_progress_updated', progress })
  },
})

const traitSlotLabel = ZHUSHEN_TRAIT_SLOT_LABEL
const equipSlotLabel = ZHUSHEN_EQUIP_SLOT_LABEL
const attrLabel = ZHUSHEN_ATTR_LABEL

const traitFilter = ref('all')
const equipFilter = ref('all')
const skillFilter = ref('all')
const promoEquipFilter = ref('all')
const promoSkillFilter = ref('all')

const filteredTraits = computed(() =>
  traitFilter.value === 'all' ? traits.value : traits.value.filter((t) => t.slot === traitFilter.value),
)
const filteredEquips = computed(() =>
  equipFilter.value === 'all' ? equips.value : equips.value.filter((e) => e.slot === equipFilter.value),
)
const filteredSkills = computed(() =>
  skillFilter.value === 'all' ? skills.value : skills.value.filter((s) => s.category === skillFilter.value),
)
const filteredPromoEquips = computed(() =>
  promoEquipFilter.value === 'all' ? equips.value : equips.value.filter((e) => e.slot === promoEquipFilter.value),
)
const filteredPromoSkills = computed(() =>
  promoSkillFilter.value === 'all' ? skills.value : skills.value.filter((s) => s.category === promoSkillFilter.value),
)
const jobNameById = computed(() => new Map(jobs.value.map((j) => [j.id, j.name])))

const newJobJson = ref(
  '{"id":"custom-job-1","name":"自定义职业","tier":1,"panel":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0},"growth":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0},"require":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}',
)
const newEquipJson = ref(
  '{"id":"custom-equip-1","name":"自定义装备","slot":"main_hand","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}',
)
const newSkillJson = ref('{"id":"custom-skill-1","name":"自定义技能","category":"str","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}')
const newTraitJson = ref('{"id":"custom-trait-1","name":"自定义特性","slot":"learning","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}')
const DEFAULT_PROMOTION_JOB_ID = 'soldier'

const toggle = (arr: string[], id: string): string[] => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
const enforceSkillMax3 = (nextIds: string[], context: string): string[] | null => {
  if (nextIds.length > 3) {
    dispatchUiEvent({ type: 'selection_error_set', message: `${context}最多选择3个技能` })
    return null
  }
  dispatchUiEvent({ type: 'selection_error_clear' })
  return nextIds
}
const enforceEquipSlots = (nextIds: string[], context: string): string[] | null => {
  const used = new Set<string>()
  const map = new Map(equips.value.map((e) => [e.id, e]))
  for (const id of nextIds) {
    const slot = map.get(id)?.slot
    if (!slot) continue
    if (used.has(slot)) {
      dispatchUiEvent({ type: 'selection_error_set', message: `${context}每种装备分类最多1个` })
      return null
    }
    used.add(slot)
  }
  dispatchUiEvent({ type: 'selection_error_clear' })
  return nextIds
}
const enforceTraitSlots = (nextIds: string[]): string[] | null => {
  const used = new Set<string>()
  const map = new Map(traits.value.map((t) => [t.id, t]))
  for (const id of nextIds) {
    const slot = map.get(id)?.slot
    if (!slot) continue
    if (slot !== 'learning' && used.has(slot)) {
      dispatchUiEvent({ type: 'selection_error_set', message: '除学习外，每个特性位置最多1个' })
      return null
    }
    if (slot !== 'learning') used.add(slot)
  }
  dispatchUiEvent({ type: 'selection_error_clear' })
  return nextIds
}

const buildInput = (): SimulationInput => {
  const traitIdSet = new Set(traits.value.map((t) => t.id))
  const equipIdSet = new Set(equips.value.map((e) => e.id))
  const skillIdSet = new Set(skills.value.map((s) => s.id))
  const safeActiveTraitIds = activeTraitIds.value.filter((id) => traitIdSet.has(id))
  const safeActiveEquipIds = activeEquipIds.value.filter((id) => equipIdSet.has(id))
  const safeActiveSkillIds = activeSkillIds.value.filter((id) => skillIdSet.has(id))

  const safePromotions = [...promotions.value]
    .sort((a, b) => a.level - b.level)
    .map((p) => ({
      ...p,
      equipIds: p.equipIds.filter((id) => equipIdSet.has(id)),
      skillIds: p.skillIds.filter((id) => skillIdSet.has(id)),
    }))

  const safeSearchFinalEquipIds = searchFinalEquipIds.value.filter((id) => equipIdSet.has(id))
  const safeSearchFinalSkillIds = searchFinalSkillIds.value.filter((id) => skillIdSet.has(id))

  return {
  targetLevel: targetLevel.value,
  initialJobId: initialJobId.value,
  character: {
    base: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
    trait: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
    growth: characterGrowth.value,
  },
  jobs: jobs.value,
  equips: equips.value,
  skills: skills.value,
  traits: traits.value,
  activeEquipIds: safeActiveEquipIds,
  activeSkillIds: safeActiveSkillIds,
  activeTraitIds: safeActiveTraitIds,
  promotions: safePromotions,
  ignorePromotionRequirements: ignorePromotionRequirements.value,
  search: {
    enabled: searchEnabled.value,
    beamWidth: beamWidth.value,
    maxTransfer: maxTransfer.value,
    maxTierDelta: maxTierDelta.value,
    maxSkillPerStep: maxSkillPerStep.value,
    scorePreset: scorePreset.value,
    finalActiveEquipIds: safeSearchFinalEquipIds,
    finalActiveSkillIds: safeSearchFinalSkillIds,
    targetFinalJobId: searchTargetFinalJobId.value,
  },
  }
}

const saveCustom = () => zhushenCustomStore.save(custom.value)
const addCustomJob = () => {
  const parsed = zhushenJobListSchema.parse([JSON.parse(newJobJson.value)])[0]
  custom.value.jobs = [...custom.value.jobs.filter((x) => x.id !== parsed.id), parsed]
  saveCustom()
}
const addCustomEquip = () => {
  const parsed = zhushenEquipListSchema.parse([JSON.parse(newEquipJson.value)])[0]
  custom.value.equips = [...custom.value.equips.filter((x) => x.id !== parsed.id), parsed]
  saveCustom()
}
const addCustomSkill = () => {
  const parsed = zhushenSkillListSchema.parse([JSON.parse(newSkillJson.value)])[0]
  custom.value.skills = [...custom.value.skills.filter((x) => x.id !== parsed.id), parsed]
  saveCustom()
}
const addCustomTrait = () => {
  const parsed = zhushenTraitListSchema.parse([JSON.parse(newTraitJson.value)])[0]
  custom.value.traits = [...custom.value.traits.filter((x) => x.id !== parsed.id), parsed]
  saveCustom()
}
const resetCustom = () => {
  custom.value = zhushenCustomStore.reset()
}

const resolvePromotionJobId = (candidate?: string) => {
  const validIds = new Set(jobs.value.map((j) => j.id))
  if (candidate && validIds.has(candidate)) return candidate
  if (validIds.has(DEFAULT_PROMOTION_JOB_ID)) return DEFAULT_PROMOTION_JOB_ID
  return jobs.value[0]?.id ?? ''
}

const addPromotion = () => promotions.value.push({ level: 1, toJobId: resolvePromotionJobId(), equipIds: [], skillIds: [] })
const removePromotion = (idx: number) => promotions.value.splice(idx, 1)

watch(
  jobs,
  () => {
    promotions.value = promotions.value.map((step) => ({
      ...step,
      toJobId: resolvePromotionJobId(step.toJobId),
    }))
  },
  { immediate: true },
)

const calculate = async () => {
  dispatchUiEvent({ type: 'calculation_started' })
  try {
    const parsed = zhushenSimulationInputSchema.parse(buildInput())
    const sim = runZhushenSimulation(parsed)
    dispatchUiEvent({
      type: 'simulation_succeeded',
      output: { final: sim.final, growthAcc: sim.growthAcc, jobName: sim.currentJob.name, logs: sim.logs },
    })
    if (parsed.search?.enabled) {
      dispatchUiEvent({ type: 'search_started' })
      const searchResult = await searchOrchestrator.run(parsed)
      const plans = searchResult.topPlans.slice(0, 10).map((x) => ({
        rank: x.rank,
        score: x.score,
        final: x.final,
        route:
          x.promotions
            .map((p) => `Lv${p.level}->${jobNameById.value.get(p.toJobId) ?? p.toJobId}`)
            .join(' / ') || '无转职',
        promotions: x.promotions.map((p) => ({ ...p, equipIds: [...p.equipIds], skillIds: [...p.skillIds] })),
      }))
      dispatchUiEvent({
        type: 'search_succeeded',
        summary: { exploredStates: searchResult.exploredStates, prunedByDominance: searchResult.prunedByDominance },
        plans,
      })
    }
  } catch (error) {
    searchOrchestrator.dispose()
    dispatchUiEvent({
      type: 'calculation_failed',
      error: normalizeUnknownError(error, 'zhushen.calculate', {
        targetLevel: targetLevel.value,
        promotionCount: promotions.value.length,
      }),
    })
  }
}

const exportDebugSnapshot = () => {
  const snapshot = createZhushenDebugSnapshot({
    domain: 'zhushen',
    input: buildInput(),
    events: uiEventLog.value,
    state: uiState.value,
    meta: { version: '0.0.0', buildAt: new Date().toISOString() },
  })
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `zhushen-debug-snapshot-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const importDebugSnapshot = async (event: Event) => {
  const inputEl = event.target as HTMLInputElement
  const file = inputEl.files?.[0]
  if (!file) return
  try {
    const content = await file.text()
    const parsed = parseZhushenDebugSnapshot(content)
    const replayed = replayZhushenDebugSnapshot(parsed)
    uiEventLog.value = [...parsed.events]
    uiState.value = replayed
    output.value = replayed.output
    searchSummary.value = replayed.searchSummary
    topPlans.value = replayed.topPlans
    errorText.value = replayed.errorText
    selectionError.value = replayed.selectionError
    searchPending.value = replayed.searchPending
    searchProgress.value = replayed.searchProgress
  } catch (error) {
    dispatchUiEvent({
      type: 'calculation_failed',
      error: normalizeUnknownError(error, 'zhushen.snapshot.import'),
    })
  } finally {
    inputEl.value = ''
  }
}

const applyPlanToManual = (plan: { promotions: PromotionStep[] }) => {
  promotions.value = plan.promotions.map((p) => ({
    level: p.level,
    toJobId: p.toJobId,
    equipIds: [...p.equipIds],
    skillIds: [...p.skillIds],
  }))
  activeEquipIds.value = [...searchFinalEquipIds.value]
  activeSkillIds.value = [...searchFinalSkillIds.value]
  dispatchUiEvent({ type: 'selection_error_clear' })
}

calculate()
trackAnalyticsEvent({ name: 'page_entered', domain: 'zhushen', at: Date.now() })
onBeforeUnmount(() => {
  searchOrchestrator.dispose()
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">诸神皇冠培养模拟器</h1>
        <p class="text-sm text-[var(--text-muted)] sm:text-base">仅输入角色成长六维，其余均为页面可配置项。</p>
      </div>
      <RouterLink to="/" class="ui-btn ui-btn--ghost">返回首页</RouterLink>
    </header>

    <section class="surface-card command-panel mb-4 p-4" :style="pageMotion.tint">
      <BlobLayer :blobs="pageMotion.blobs" />
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label class="text-sm">目标等级<input v-model.number="targetLevel" type="number" min="1" max="150" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-sm">初始职业<select v-model="initialJobId" class="ui-input mt-1 w-full px-2 py-1"><option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }} ({{ j.id }})</option></select></label>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
        <label v-for="k in ['str','tec','agi','con','per','wil']" :key="k" class="text-xs">成长{{ k.toUpperCase() }}<input v-model.number="characterGrowth[k as keyof AttrVector]" type="number" step="0.0001" class="ui-input mt-1 w-full px-2 py-1" /></label>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div class="text-sm">
          <p>特性（多选）</p>
          <select v-model="traitFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部位置</option>
            <option v-for="(name, key) in traitSlotLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1 text-xs">
            <label v-for="t in filteredTraits" :key="t.id" class="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" :checked="activeTraitIds.includes(t.id)" @change="() => { const next = enforceTraitSlots(toggle(activeTraitIds, t.id)); if (next) activeTraitIds = next }" />
              {{ t.name }} ({{ traitSlotLabel[t.slot] }})
            </label>
          </div>
        </div>
        <div class="text-sm">
          <p>最终装备（多选）</p>
          <select v-model="equipFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部分类</option>
            <option v-for="(name, key) in equipSlotLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1 text-xs">
            <label v-for="e in filteredEquips" :key="e.id" class="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" :checked="activeEquipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(activeEquipIds, e.id), '最终装备'); if (next) activeEquipIds = next }" />
              {{ e.name }} ({{ equipSlotLabel[e.slot] }})
            </label>
          </div>
        </div>
        <div class="text-sm">
          <p>最终技能（多选）</p>
          <select v-model="skillFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部属性</option>
            <option v-for="(name, key) in attrLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1 text-xs">
            <label v-for="s in filteredSkills" :key="s.id" class="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" :checked="activeSkillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(activeSkillIds, s.id), '最终技能'); if (next) activeSkillIds = next }" />
              {{ s.name }} ({{ attrLabel[s.category] }})
            </label>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-card mb-4 p-4">
      <div class="mb-2 flex items-center justify-between"><h2 class="text-base font-semibold">转职路径</h2><button class="ui-btn ui-btn--ghost" @click="addPromotion">新增</button></div>
      <div v-for="(step, idx) in promotions" :key="idx" class="mb-3 grid grid-cols-1 gap-2 border-b border-[var(--border)] pb-3 lg:grid-cols-4">
        <label class="text-xs">等级<input v-model.number="step.level" type="number" min="1" max="149" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-xs">目标职业<select v-model="step.toJobId" class="ui-input mt-1 w-full px-2 py-1"><option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }}</option></select></label>
        <div class="text-xs">
          <p>该步装备</p>
          <select v-model="promoEquipFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部分类</option>
            <option v-for="(name, key) in equipSlotLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1">
            <label v-for="e in filteredPromoEquips" :key="e.id" class="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" :checked="step.equipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(step.equipIds, e.id), '转职步骤装备'); if (next) promotions[idx].equipIds = next }" />
              {{ e.name }} ({{ equipSlotLabel[e.slot] }})
            </label>
          </div>
        </div>
        <div class="text-xs">
          <p>该步技能</p>
          <select v-model="promoSkillFilter" class="ui-input mt-1 w-full px-2 py-1 text-xs">
            <option value="all">全部属性</option>
            <option v-for="(name, key) in attrLabel" :key="key" :value="key">{{ name }}</option>
          </select>
          <div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1">
            <label v-for="s in filteredPromoSkills" :key="s.id" class="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" :checked="step.skillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(step.skillIds, s.id), '转职步骤技能'); if (next) promotions[idx].skillIds = next }" />
              {{ s.name }} ({{ attrLabel[s.category] }})
            </label>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost w-fit" @click="removePromotion(idx)">删除</button>
      </div>
    </section>

    <section class="surface-card mb-4 p-4">
      <h2 class="mb-2 text-base font-semibold">搜索配置</h2>
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <label class="text-xs">启用<select v-model="searchEnabled" class="ui-input mt-1 w-full px-2 py-1"><option :value="true">true</option><option :value="false">false</option></select></label>
        <label class="text-xs">忽略转职条件<select v-model="ignorePromotionRequirements" class="ui-input mt-1 w-full px-2 py-1"><option :value="true">true</option><option :value="false">false</option></select></label>
        <label class="text-xs">Beam<input v-model.number="beamWidth" type="number" min="10" max="5000" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-xs">最大转职<input v-model.number="maxTransfer" type="number" min="0" max="20" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-xs">跨阶<input v-model.number="maxTierDelta" type="number" min="0" max="3" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-xs">步内技能<input v-model.number="maxSkillPerStep" type="number" min="0" max="3" class="ui-input mt-1 w-full px-2 py-1" /></label>
        <label class="text-xs">评分<select v-model="scorePreset" class="ui-input mt-1 w-full px-2 py-1"><option value="sum">sum</option><option value="str_first">str_first</option><option value="agi_first">agi_first</option><option value="balanced">balanced</option></select></label>
        <label class="text-xs">目标终点职业<select v-model="searchTargetFinalJobId" class="ui-input mt-1 w-full px-2 py-1"><option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }}</option></select></label>
        <div class="text-xs"><p>搜索最终装备</p><div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1"><label v-for="e in equips" :key="e.id" class="mr-3 inline-flex items-center gap-1"><input type="checkbox" :checked="searchFinalEquipIds.includes(e.id)" @change="() => { const next = enforceEquipSlots(toggle(searchFinalEquipIds, e.id), '搜索最终装备'); if (next) searchFinalEquipIds = next }" />{{ e.name }} ({{ equipSlotLabel[e.slot] }})</label></div></div>
        <div class="text-xs"><p>搜索最终技能</p><div class="mt-1 max-h-24 overflow-auto ui-input px-2 py-1"><label v-for="s in skills" :key="s.id" class="mr-3 inline-flex items-center gap-1"><input type="checkbox" :checked="searchFinalSkillIds.includes(s.id)" @change="() => { const next = enforceSkillMax3(toggle(searchFinalSkillIds, s.id), '搜索最终技能'); if (next) searchFinalSkillIds = next }" />{{ s.name }} ({{ attrLabel[s.category] }})</label></div></div>
      </div>
    </section>

    <section class="surface-card mb-4 p-4">
      <div class="mb-2 flex items-center justify-between"><h2 class="text-base font-semibold">本地临时添加</h2><button class="ui-btn ui-btn--ghost" @click="resetCustom">重置</button></div>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div><p class="mb-1 text-sm">职业 JSON</p><textarea v-model="newJobJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-1" @click="addCustomJob">保存</button></div>
        <div><p class="mb-1 text-sm">装备 JSON</p><textarea v-model="newEquipJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-1" @click="addCustomEquip">保存</button></div>
        <div><p class="mb-1 text-sm">技能 JSON</p><textarea v-model="newSkillJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-1" @click="addCustomSkill">保存</button></div>
        <div><p class="mb-1 text-sm">特性 JSON</p><textarea v-model="newTraitJson" rows="7" class="ui-input w-full px-2 py-1 text-xs" /><button class="ui-btn ui-btn--primary mt-1" @click="addCustomTrait">保存</button></div>
      </div>
    </section>

    <div class="mb-4">
      <div class="flex flex-wrap items-center gap-2">
        <button class="ui-btn ui-btn--primary" :disabled="searchPending" @click="calculate">{{ searchPending ? '搜索中...' : '计算' }}</button>
        <button class="ui-btn ui-btn--ghost" @click="exportDebugSnapshot">导出快照</button>
        <label class="ui-btn ui-btn--ghost cursor-pointer">
          导入快照
          <input class="hidden" type="file" accept="application/json" @change="importDebugSnapshot" />
        </label>
      </div>
      <div v-if="searchPending && searchProgress" class="mt-2">
        <progress class="h-2 w-full" :max="searchProgress.totalSteps" :value="searchProgress.step" />
        <p class="text-sm text-[var(--text-muted)]">
          搜索进度: {{ searchProgress.step }}/{{ searchProgress.totalSteps }} | Beam: {{ searchProgress.beamSize }} | 候选: {{ searchProgress.candidateSize }}
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          已探索: {{ searchProgress.exploredStates }} | 已剪枝: {{ searchProgress.prunedByDominance }} | 状态池: {{ searchProgress.poolSize }} | 压缩次数: {{ searchProgress.compactionCount }}
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          峰值状态池: {{ searchProgress.poolPeak }} | 本轮耗时: {{ searchProgress.stepMs }}ms | route命中: {{ searchProgress.routePrunes }}/{{ searchProgress.routeChecks }} | group命中: {{ searchProgress.groupPrunes }}/{{ searchProgress.groupChecks }}
        </p>
      </div>
      <p v-if="selectionError" class="mt-2 text-sm text-[var(--warn-text)]">{{ selectionError }}</p>
      <p v-if="errorText" class="mt-2 text-sm text-[var(--warn-text)]">{{ errorText }}</p>
    </div>

    <section v-if="output" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article class="surface-card p-4"><h2 class="mb-2 text-base font-semibold">最终结果</h2><p class="mb-1 text-sm text-[var(--text-muted)]">当前职业：{{ output.jobName }}</p><p class="mb-2 text-sm">{{ formatVec(output.final) }}</p><p class="text-xs text-[var(--text-muted)]">成长累计：{{ formatVec(output.growthAcc) }}</p></article>
      <article class="surface-card p-4"><h2 class="mb-2 text-base font-semibold">转职日志</h2><p v-if="output.logs.length === 0" class="text-sm text-[var(--text-muted)]">无转职</p><ul v-else class="space-y-1 text-sm"><li v-for="item in output.logs" :key="item">{{ item }}</li></ul></article>
    </section>

    <section v-if="searchSummary" class="mt-4 surface-card p-4">
      <h2 class="mb-2 text-base font-semibold">Beam Search 结果</h2>
      <p class="text-sm text-[var(--text-muted)]">
        已探索状态数: {{ searchSummary.exploredStates }} | 支配剪枝数: {{ searchSummary.prunedByDominance }}
      </p>
      <ul class="mt-2 space-y-1 text-sm">
        <li v-for="plan in topPlans" :key="plan.rank" class="flex flex-col gap-1 border-b border-[var(--border)] pb-2">
          <span>#{{ plan.rank }} 评分={{ plan.score.toFixed(4) }} | {{ formatVec(plan.final) }} | 路线: {{ plan.route }}</span>
          <button class="ui-btn ui-btn--ghost w-fit" @click="applyPlanToManual(plan)">一键回填到手动路线</button>
        </li>
      </ul>
    </section>
  </main>
</template>
