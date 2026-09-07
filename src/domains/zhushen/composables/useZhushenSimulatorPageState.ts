/**
 * @file useZhushenSimulatorPageState
 * @description 诸神模拟器页面的表单、搜索、结果、自定义数据与快照交互状态。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  builtinZhushenEquips,
  builtinZhushenJobs,
  builtinZhushenSkills,
  builtinZhushenTraits,
} from '@/data/zhushen'
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'
import { runZhushenSimulation } from '@/domains/zhushen/engine/simulation'
import {
  createZhushenDebugSnapshot,
  parseZhushenDebugSnapshot,
  replayZhushenDebugSnapshot,
} from '@/domains/zhushen/model/debug-snapshot'
import {
  initialZhushenSimulatorUiState,
  reduceZhushenSimulatorState,
  type ZhushenSimulatorEvent,
} from '@/domains/zhushen/model/simulator-events'
import { ZHUSHEN_ATTR_LABEL, ZHUSHEN_EQUIP_SLOT_LABEL, ZHUSHEN_TRAIT_SLOT_LABEL } from '@/domains/zhushen/model/ui-meta'
import {
  type AttrVector,
  type PromotionStep,
  type ScorePreset,
  type SearchProgress,
  type SimulationInput,
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSimulationInputSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
} from '@/domains/zhushen/model/zhushen-model'
import { zhushenSearchOrchestratorFactory } from '@/domains/zhushen/orchestrator/search-orchestrator'
import type { ZhushenSearchOrchestratorPort } from '@/domains/zhushen/ports'
import { zhushenCustomStore } from '@/domains/zhushen/services/zhushen-custom-store'
import { trackAnalyticsEvent } from '@/shared/observability/client'
import { normalizeUnknownError } from '@/shared/observability/errors'

type SearchProfile = 'safe' | 'balanced' | 'aggressive'

const DEFAULT_PROMOTION_JOB_ID = 'soldier'

/**
 * 创建诸神模拟器页面状态与页面动作。
 * @returns 页面模板消费的状态、派生值与事件处理函数。
 */
export const useZhushenSimulatorPageState = () => {
  const custom = ref(zhushenCustomStore.load())
  const jobs = computed(() => [...builtinZhushenJobs, ...custom.value.jobs])
  const equips = computed(() => [...builtinZhushenEquips, ...custom.value.equips])
  const skills = computed(() => [...builtinZhushenSkills, ...custom.value.skills])
  const traits = computed(() => [...builtinZhushenTraits, ...custom.value.traits])

  const attrKeys: Array<keyof AttrVector> = ['str', 'tec', 'agi', 'con', 'per', 'wil']
  const targetLevel = ref(150)
  const initialJobId = ref('soldier')
  const characterBase = ref<AttrVector>({ str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 })
  const characterTrait = ref<AttrVector>({ str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 })
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
  const searchProfile = ref<SearchProfile>('balanced')
  const aggressiveConfirmed = ref(false)
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
    onProgress: (progress) => dispatchUiEvent({ type: 'search_progress_updated', progress }),
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
  const searchRiskWarning = computed(() => {
    if (!searchEnabled.value) return ''
    if (beamWidth.value > 1200 && maxTransfer.value >= 6) return '当前参数组合可能导致搜索规模激增（Beam>1200 且 最大转职>=6）。'
    if (maxTransfer.value >= 8) return '最大转职过高，建议控制在 4~6 以内。'
    if (maxSkillPerStep.value >= 3 && maxTransfer.value >= 5) return '步内技能与转职上限同时偏高，容易触发分支爆炸。'
    return ''
  })
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))
  const constrainedSearchParams = computed(() => {
    if (searchProfile.value === 'safe') {
      return {
        beamWidth: clamp(beamWidth.value, 10, 800),
        maxTransfer: clamp(maxTransfer.value, 0, 4),
        maxTierDelta: clamp(maxTierDelta.value, 0, 2),
        maxSkillPerStep: clamp(maxSkillPerStep.value, 0, 1),
      }
    }
    if (searchProfile.value === 'balanced') {
      return {
        beamWidth: clamp(beamWidth.value, 10, 1200),
        maxTransfer: clamp(maxTransfer.value, 0, 6),
        maxTierDelta: clamp(maxTierDelta.value, 0, 2),
        maxSkillPerStep: clamp(maxSkillPerStep.value, 0, 2),
      }
    }
    return {
      beamWidth: clamp(beamWidth.value, 10, 5000),
      maxTransfer: clamp(maxTransfer.value, 0, 20),
      maxTierDelta: clamp(maxTierDelta.value, 0, 3),
      maxSkillPerStep: clamp(maxSkillPerStep.value, 0, 3),
    }
  })
  const jobNameById = computed(() => new Map(jobs.value.map((j) => [j.id, j.name])))

  const newJobJson = ref(
    '{"id":"custom-job-1","name":"自定义职业","tier":1,"panel":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0},"growth":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0},"require":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}',
  )
  const newEquipJson = ref(
    '{"id":"custom-equip-1","name":"自定义装备","slot":"main_hand","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}',
  )
  const newSkillJson = ref('{"id":"custom-skill-1","name":"自定义技能","category":"str","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}')
  const newTraitJson = ref('{"id":"custom-trait-1","name":"自定义特性","slot":"learning","stat":{"str":0,"tec":0,"agi":0,"con":0,"per":0,"wil":0}}')

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
        base: characterBase.value,
        trait: characterTrait.value,
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
        beamWidth: constrainedSearchParams.value.beamWidth,
        maxTransfer: constrainedSearchParams.value.maxTransfer,
        maxTierDelta: constrainedSearchParams.value.maxTierDelta,
        maxSkillPerStep: constrainedSearchParams.value.maxSkillPerStep,
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
  watch(searchProfile, (next) => {
    if (next !== 'aggressive') aggressiveConfirmed.value = false
  })

  const calculate = async () => {
    if (searchEnabled.value && searchProfile.value === 'aggressive' && !aggressiveConfirmed.value) {
      dispatchUiEvent({ type: 'selection_error_set', message: '激进档需要先勾选确认后再执行计算' })
      return
    }
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

  void calculate()
  trackAnalyticsEvent({ name: 'page_entered', domain: 'zhushen', at: Date.now() })
  onBeforeUnmount(() => {
    searchOrchestrator.dispose()
  })

  return {
    activeEquipIds,
    activeSkillIds,
    activeTraitIds,
    addCustomEquip,
    addCustomJob,
    addCustomSkill,
    addCustomTrait,
    addPromotion,
    aggressiveConfirmed,
    applyPlanToManual,
    attrKeys,
    attrLabel,
    beamWidth,
    calculate,
    characterBase,
    characterGrowth,
    characterTrait,
    constrainedSearchParams,
    equipFilter,
    equipSlotLabel,
    equips,
    errorText,
    exportDebugSnapshot,
    filteredEquips,
    filteredPromoEquips,
    filteredPromoSkills,
    filteredSkills,
    filteredTraits,
    ignorePromotionRequirements,
    importDebugSnapshot,
    initialJobId,
    jobs,
    maxSkillPerStep,
    maxTierDelta,
    maxTransfer,
    newEquipJson,
    newJobJson,
    newSkillJson,
    newTraitJson,
    output,
    promoEquipFilter,
    promoSkillFilter,
    promotions,
    removePromotion,
    resetCustom,
    scorePreset,
    searchEnabled,
    searchFinalEquipIds,
    searchFinalSkillIds,
    searchPending,
    searchProfile,
    searchProgress,
    searchRiskWarning,
    searchSummary,
    searchTargetFinalJobId,
    selectionError,
    skillFilter,
    skills,
    targetLevel,
    toggle,
    topPlans,
    traitFilter,
    traitSlotLabel,
    traits,
    enforceEquipSlots,
    enforceSkillMax3,
    enforceTraitSlots,
  }
}
