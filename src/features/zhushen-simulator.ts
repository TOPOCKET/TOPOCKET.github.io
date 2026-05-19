import { z } from 'zod'

export const ATTR_KEYS = ['str', 'tec', 'agi', 'con', 'per', 'wil'] as const
export type AttrKey = (typeof ATTR_KEYS)[number]
export type AttrVector = Record<AttrKey, number>

export interface JobDef {
  id: string
  name: string
  tier: number
  panel: AttrVector
  growth: AttrVector
  require: AttrVector
}

export interface EquipDef {
  id: string
  name: string
  slot: 'main_hand' | 'off_hand' | 'helmet' | 'armor' | 'shoes' | 'accessory' | 'head_fashion' | 'armor_fashion'
  stat: AttrVector
}

export interface SkillDef {
  id: string
  name: string
  category: AttrKey
  stat: AttrVector
}

export interface TraitDef {
  id: string
  name: string
  slot: 'face' | 'nose' | 'hair' | 'eyes' | 'eyebrow' | 'ears' | 'stigma' | 'quasi_stigma' | 'learning'
  stat: AttrVector
}

export interface CharacterDef {
  base: AttrVector
  trait: AttrVector
  growth: AttrVector
}

export interface PromotionStep {
  level: number
  toJobId: string
  equipIds: string[]
  skillIds: string[]
}

export type ScorePreset = 'sum' | 'str_first' | 'agi_first' | 'balanced'

export interface SearchConfig {
  enabled: boolean
  beamWidth: number
  maxTransfer: number
  maxTierDelta: number
  maxSkillPerStep: number
  scorePreset: ScorePreset
  scoreWeights?: Partial<AttrVector>
  finalActiveEquipIds: string[]
  finalActiveSkillIds: string[]
  targetFinalJobId?: string
}

export interface SimulationInput {
  targetLevel: number
  initialJobId: string
  character: CharacterDef
  jobs: JobDef[]
  equips: EquipDef[]
  skills: SkillDef[]
  traits: TraitDef[]
  activeEquipIds: string[]
  activeSkillIds: string[]
  activeTraitIds: string[]
  promotions: PromotionStep[]
  search?: SearchConfig
  ignorePromotionRequirements?: boolean
}

export interface SimulationResult {
  final: AttrVector
  growthAcc: AttrVector
  currentJob: JobDef
  logs: string[]
}

export interface SearchPlan {
  rank: number
  score: number
  final: AttrVector
  currentJob: JobDef
  promotions: PromotionStep[]
  logs: string[]
}

export interface SearchResult {
  topPlans: SearchPlan[]
  exploredStates: number
  prunedByDominance: number
}

const SCALE = 10000
const round4 = (value: number): number => Math.round((value + Number.EPSILON) * SCALE) / SCALE

export const zeroVec = (): AttrVector => ({ str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 })

export const addVec = (a: AttrVector, b: AttrVector): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = round4(a[key] + b[key])
  return out
}

const mulVec = (a: AttrVector, m: number): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = round4(a[key] * m)
  return out
}

const addMany = (vectors: AttrVector[]): AttrVector => vectors.reduce((acc, it) => addVec(acc, it), zeroVec())
const vecGE = (a: AttrVector, b: AttrVector): boolean => ATTR_KEYS.every((key) => a[key] >= b[key])
const toFixed4Vec = (v: AttrVector): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = Number(v[key].toFixed(4))
  return out
}

export const formatVec = (v: AttrVector): string =>
  `力量 ${v.str.toFixed(4)} | 技巧 ${v.tec.toFixed(4)} | 敏捷 ${v.agi.toFixed(4)} | 体质 ${v.con.toFixed(4)} | 感知 ${v.per.toFixed(4)} | 意志 ${v.wil.toFixed(4)}`

const vecSchema = z.object({
  str: z.number(),
  tec: z.number(),
  agi: z.number(),
  con: z.number(),
  per: z.number(),
  wil: z.number(),
})

const equipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: z.enum(['main_hand', 'off_hand', 'helmet', 'armor', 'shoes', 'accessory', 'head_fashion', 'armor_fashion']),
  stat: vecSchema,
})
const skillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(ATTR_KEYS),
  stat: vecSchema,
})
const traitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: z.enum(['face', 'nose', 'hair', 'eyes', 'eyebrow', 'ears', 'stigma', 'quasi_stigma', 'learning']),
  stat: vecSchema,
})
const jobSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.number().int().min(0).default(0),
  panel: vecSchema,
  growth: vecSchema,
  require: vecSchema,
})

export const zhushenJobListSchema = z.array(jobSchema)
export const zhushenEquipListSchema = z.array(equipSchema)
export const zhushenSkillListSchema = z.array(skillSchema)
export const zhushenTraitListSchema = z.array(traitSchema)

export const zhushenSimulationInputSchema: z.ZodType<SimulationInput> = z.object({
  targetLevel: z.number().int().min(1).max(150),
  initialJobId: z.string().min(1),
  character: z.object({
    base: vecSchema,
    trait: vecSchema,
    growth: vecSchema,
  }),
  jobs: zhushenJobListSchema,
  equips: zhushenEquipListSchema,
  skills: zhushenSkillListSchema,
  traits: zhushenTraitListSchema,
  activeEquipIds: z.array(z.string().min(1)),
  activeSkillIds: z.array(z.string().min(1)),
  activeTraitIds: z.array(z.string().min(1)),
  promotions: z.array(
    z.object({
      level: z.number().int().min(1).max(149),
      toJobId: z.string().min(1),
      equipIds: z.array(z.string().min(1)),
      skillIds: z.array(z.string().min(1)),
    }),
  ),
  search: z
    .object({
      enabled: z.boolean().default(false),
      beamWidth: z.number().int().min(10).max(5000).default(1000),
      maxTransfer: z.number().int().min(0).max(20).default(5),
      maxTierDelta: z.number().int().min(0).max(3).default(1),
      maxSkillPerStep: z.number().int().min(0).max(3).default(2),
      scorePreset: z.enum(['sum', 'str_first', 'agi_first', 'balanced']).default('sum'),
      scoreWeights: vecSchema.partial().optional(),
      finalActiveEquipIds: z.array(z.string().min(1)).default([]),
      finalActiveSkillIds: z.array(z.string().min(1)).default([]),
      targetFinalJobId: z.string().min(1).optional(),
    })
    .optional(),
  ignorePromotionRequirements: z.boolean().default(false),
})

const validateSingleEquipPerSlot = (allEquips: EquipDef[], equipIds: string[], context: string): void => {
  const map = new Map(allEquips.map((item) => [item.id, item]))
  const used = new Set<EquipDef['slot']>()
  for (const equipId of equipIds) {
    const equip = map.get(equipId)
    if (!equip) throw new Error(`equip not found in ${context}: ${equipId}`)
    if (used.has(equip.slot)) throw new Error(`equip slot conflict in ${context}: ${equip.slot}`)
    used.add(equip.slot)
  }
}

const validateTraitSlots = (allTraits: TraitDef[], traitIds: string[], context: string): void => {
  const map = new Map(allTraits.map((item) => [item.id, item]))
  const used = new Set<TraitDef['slot']>()
  for (const traitId of traitIds) {
    const trait = map.get(traitId)
    if (!trait) throw new Error(`trait not found in ${context}: ${traitId}`)
    if (trait.slot !== 'learning') {
      if (used.has(trait.slot)) throw new Error(`trait slot conflict in ${context}: ${trait.slot}`)
      used.add(trait.slot)
    }
  }
}

const validateSkillCount = (skillIds: string[], context: string): void => {
  if (skillIds.length > 3) throw new Error(`skill count overflow in ${context}: max 3`)
}

const sumStatsByIds = <T extends { id: string; stat: AttrVector }>(source: T[], ids: string[], label: string): AttrVector => {
  const map = new Map(source.map((item) => [item.id, item]))
  return addMany(
    ids.map((id) => {
      const item = map.get(id)
      if (!item) throw new Error(`${label} not found: ${id}`)
      return item.stat
    }),
  )
}

const levelFactor = (level: number): number => (level >= 60 ? 0.35 : 1)

export const simulateZhushen = (input: SimulationInput): SimulationResult => {
  const jobsById = new Map(input.jobs.map((job) => [job.id, job]))
  let currentJob = jobsById.get(input.initialJobId)
  if (!currentJob) throw new Error(`initial job not found: ${input.initialJobId}`)

  validateSingleEquipPerSlot(input.equips, input.activeEquipIds, 'activeEquipIds')
  validateTraitSlots(input.traits, input.activeTraitIds, 'activeTraitIds')
  validateSkillCount(input.activeSkillIds, 'activeSkillIds')
  for (const step of input.promotions) validateSingleEquipPerSlot(input.equips, step.equipIds, `promotion level ${step.level}`)
  for (const step of input.promotions) validateSkillCount(step.skillIds, `promotion level ${step.level}`)
  for (let i = 1; i < input.promotions.length; i += 1) {
    if (input.promotions[i].level < input.promotions[i - 1].level) throw new Error('promotions must be sorted by level asc')
  }

  const base = addVec(input.character.base, addMany([input.character.trait, sumStatsByIds(input.traits, input.activeTraitIds, 'active trait')]))
  let growthAcc = zeroVec()
  let promotionIndex = 0
  const logs: string[] = []

  for (let level = 1; level < input.targetLevel; level += 1) {
    while (promotionIndex < input.promotions.length && input.promotions[promotionIndex].level === level) {
      const step = input.promotions[promotionIndex]
      const toJob = jobsById.get(step.toJobId)
      if (!toJob) throw new Error(`promotion job not found at level ${level}: ${step.toJobId}`)
      const currentPanel = addMany([
        base,
        currentJob.panel,
        growthAcc,
        sumStatsByIds(input.equips, step.equipIds, 'promotion equip'),
        sumStatsByIds(input.skills, step.skillIds, 'promotion skill'),
      ])
      if (!vecGE(currentPanel, toJob.require) && !input.ignorePromotionRequirements) {
        throw new Error(`promotion failed at level ${level}: cannot promote to ${toJob.name}`)
      }
      if (!vecGE(currentPanel, toJob.require) && input.ignorePromotionRequirements) {
        logs.push(`Lv${level} -> ${toJob.name}（已忽略转职条件）`)
      }
      currentJob = toJob
      logs.push(`Lv${level} -> ${toJob.name}（装备:${step.equipIds.join(',')} 技能:${step.skillIds.join(',')}）`)
      promotionIndex += 1
    }
    growthAcc = addVec(growthAcc, mulVec(addVec(input.character.growth, currentJob.growth), levelFactor(level)))
  }

  const final = addMany([
    base,
    currentJob.panel,
    growthAcc,
    sumStatsByIds(input.equips, input.activeEquipIds, 'active equip'),
    sumStatsByIds(input.skills, input.activeSkillIds, 'active skill'),
  ])

  return { final: toFixed4Vec(final), growthAcc: toFixed4Vec(growthAcc), currentJob, logs }
}

interface SearchState {
  level: number
  jobId: string
  growthAcc: AttrVector
  transferCount: number
  promotions: PromotionStep[]
  logs: string[]
  visitedJobs: string[]
}

const keyOfState = (state: SearchState): string => `${state.level}|${state.jobId}|${state.transferCount}`

const scoreOf = (stats: AttrVector, preset: ScorePreset, custom?: Partial<AttrVector>): number => {
  const v = { ...stats }
  if (preset === 'str_first') return v.str * 3 + v.con * 1.2 + v.agi + v.tec + v.per + v.wil
  if (preset === 'agi_first') return v.agi * 3 + v.tec * 1.2 + v.str + v.con + v.per + v.wil
  if (preset === 'balanced') return v.str + v.tec + v.agi + v.con + v.per + v.wil - Math.max(...Object.values(v)) * 0.05
  if (custom) {
    return ATTR_KEYS.reduce((acc, k) => acc + v[k] * (custom[k] ?? 1), 0)
  }
  return v.str + v.tec + v.agi + v.con + v.per + v.wil
}

const combinations = <T,>(arr: T[], maxPick: number): T[][] => {
  const out: T[][] = [[]]
  for (const item of arr) {
    const size = out.length
    for (let i = 0; i < size; i += 1) {
      const next = [...out[i], item]
      if (next.length <= maxPick) out.push(next)
    }
  }
  return out
}

const buildEquipLoadouts = (equips: EquipDef[]): string[][] => {
  const bySlot = new Map<EquipDef['slot'], EquipDef[]>()
  for (const e of equips) {
    const bucket = bySlot.get(e.slot) ?? []
    bucket.push(e)
    bySlot.set(e.slot, bucket)
  }
  let out: string[][] = [[]]
  for (const slot of ['main_hand', 'off_hand', 'helmet', 'armor', 'shoes', 'accessory', 'head_fashion', 'armor_fashion'] as const) {
    const choices = bySlot.get(slot) ?? []
    const next: string[][] = []
    for (const current of out) {
      next.push(current)
      for (const choice of choices) next.push([...current, choice.id])
    }
    out = next
  }
  return out
}

export const searchZhushenPlans = (input: SimulationInput): SearchResult => {
  const search = input.search
  if (!search?.enabled) return { topPlans: [], exploredStates: 0, prunedByDominance: 0 }

  const jobsById = new Map(input.jobs.map((j) => [j.id, j]))
  const initialJob = jobsById.get(input.initialJobId)
  if (!initialJob) throw new Error(`initial job not found: ${input.initialJobId}`)

  validateSingleEquipPerSlot(input.equips, search.finalActiveEquipIds, 'search.finalActiveEquipIds')
  validateSkillCount(search.finalActiveSkillIds, 'search.finalActiveSkillIds')
  const equipLoadouts = buildEquipLoadouts(input.equips)
  const skillLoadouts = combinations(input.skills.map((s) => s.id), Math.min(search.maxSkillPerStep, 3))

  const base = addVec(input.character.base, addMany([input.character.trait, sumStatsByIds(input.traits, input.activeTraitIds, 'active trait')]))
  let beam: SearchState[] = [{ level: 1, jobId: input.initialJobId, growthAcc: zeroVec(), transferCount: 0, promotions: [], logs: [], visitedJobs: [input.initialJobId] }]
  let exploredStates = 0
  let prunedByDominance = 0

  for (let level = 1; level < input.targetLevel; level += 1) {
    const expanded: SearchState[] = []

    for (const state of beam) {
      const job = jobsById.get(state.jobId)
      if (!job) continue

      const nextGrowth = addVec(state.growthAcc, mulVec(addVec(input.character.growth, job.growth), levelFactor(level)))
      expanded.push({ ...state, level: level + 1, growthAcc: nextGrowth })
      exploredStates += 1

      if (state.transferCount >= search.maxTransfer) continue

      const currentPanelBase = addMany([base, job.panel, state.growthAcc])
      for (const target of input.jobs) {
        if (target.id === state.jobId) continue
        if (state.visitedJobs.includes(target.id)) continue
        if (target.tier === 0) continue
        if (target.tier - job.tier > search.maxTierDelta) continue
        if (job.tier - target.tier > 1) continue

        for (const equipIds of equipLoadouts) {
          const equipStat = sumStatsByIds(input.equips, equipIds, 'search equip')
          for (const skillIds of skillLoadouts) {
            const skillStat = sumStatsByIds(input.skills, skillIds, 'search skill')
            const panelForCheck = addMany([currentPanelBase, equipStat, skillStat])
            if (!vecGE(panelForCheck, target.require)) continue

            const afterTransferGrowth = addVec(state.growthAcc, mulVec(addVec(input.character.growth, target.growth), levelFactor(level)))
            expanded.push({
              level: level + 1,
              jobId: target.id,
              growthAcc: afterTransferGrowth,
              transferCount: state.transferCount + 1,
              promotions: [...state.promotions, { level, toJobId: target.id, equipIds, skillIds }],
              logs: [...state.logs, `Lv${level} -> ${target.name}（装备:${equipIds.join(',')} 技能:${skillIds.join(',')}）`],
              visitedJobs: [...state.visitedJobs, target.id],
            })
            exploredStates += 1
          }
        }
      }
    }

    const nonDominated: SearchState[] = []
    const groups = new Map<string, SearchState[]>()
    for (const state of expanded) {
      const k = keyOfState(state)
      const bucket = groups.get(k) ?? []
      groups.set(k, bucket)
      let dominated = false
      for (const kept of bucket) {
        if (vecGE(kept.growthAcc, state.growthAcc)) {
          dominated = true
          prunedByDominance += 1
          break
        }
      }
      if (dominated) continue
      for (let i = bucket.length - 1; i >= 0; i -= 1) {
        if (vecGE(state.growthAcc, bucket[i].growthAcc)) {
          bucket.splice(i, 1)
          prunedByDominance += 1
        }
      }
      bucket.push(state)
    }
    for (const bucket of groups.values()) nonDominated.push(...bucket)

    nonDominated.sort((a, b) => {
      const ja = jobsById.get(a.jobId)!
      const jb = jobsById.get(b.jobId)!
      const pa = addMany([base, ja.panel, a.growthAcc])
      const pb = addMany([base, jb.panel, b.growthAcc])
      return scoreOf(pb, search.scorePreset, search.scoreWeights) - scoreOf(pa, search.scorePreset, search.scoreWeights)
    })
    beam = nonDominated.slice(0, search.beamWidth)
  }

  const finalEquip = sumStatsByIds(input.equips, search.finalActiveEquipIds, 'search final equip')
  const finalSkill = sumStatsByIds(input.skills, search.finalActiveSkillIds, 'search final skill')
  const targetFinalJobId = search.targetFinalJobId
  const beamForOutput = targetFinalJobId ? beam.filter((state) => state.jobId === targetFinalJobId) : beam

  const topPlans = beamForOutput
    .map((state) => {
      const job = jobsById.get(state.jobId)!
      const final = addMany([base, job.panel, state.growthAcc, finalEquip, finalSkill])
      const score = scoreOf(final, search.scorePreset, search.scoreWeights)
      return {
        rank: 0,
        score: round4(score),
        final: toFixed4Vec(final),
        currentJob: job,
        promotions: state.promotions,
        logs: state.logs,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((plan, idx) => ({ ...plan, rank: idx + 1 }))

  return { topPlans, exploredStates, prunedByDominance }
}
