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
  firstStepJobIds?: string[]
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

export interface SearchProgress {
  phase: 'running' | 'completed'
  step: number
  totalSteps: number
  beamSize: number
  candidateSize: number
  exploredStates: number
  prunedByDominance: number
  poolSize: number
  compactionCount: number
  poolPeak: number
  stepMs: number
  routeChecks: number
  routePrunes: number
  groupChecks: number
  groupPrunes: number
}

interface SearchRuntimeOptions {
  yieldEvery?: number
  wasmCore?: {
    scoreBatch: (
      stats: Float32Array,
      stateCount: number,
      mode: number,
      weights?: [number, number, number, number, number, number],
    ) => Float32Array
    pruneFlags: (batchStats: Float32Array, candidate: Float32Array) => { domByBatch: Uint8Array; domByCandidate: Uint8Array }
    routePruneFlags: (
      batchCodes: Uint16Array,
      batchStats: Float32Array,
      codeWidth: number,
      transferCount: number,
      candidateCode: Uint16Array,
      candidate: Float32Array,
    ) => { domByBatch: Uint8Array; domByCandidate: Uint8Array }
    comboPassFlags: (
      panel: Float32Array,
      equipStats: Float32Array,
      equipCount: number,
      skillStats: Float32Array,
      skillCount: number,
      require: Float32Array,
    ) => Uint8Array
  } | null
}

const MIN_LEVEL = 1
const MAX_LEVEL = 150
const MAX_TRANSFER_COUNT = 20
const ROUTE_WASM_THRESHOLD = 256
const GROUP_WASM_THRESHOLD = 128

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
  targetLevel: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
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
      level: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
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
      firstStepJobIds: z.array(z.string().min(1)).optional(),
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

  for (let level = MIN_LEVEL; level < input.targetLevel; level += 1) {
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

  // 支持在目标等级触发转职：影响最终面板，不再产生额外成长。
  while (promotionIndex < input.promotions.length && input.promotions[promotionIndex].level === input.targetLevel) {
    const step = input.promotions[promotionIndex]
    const toJob = jobsById.get(step.toJobId)
    if (!toJob) throw new Error(`promotion job not found at level ${input.targetLevel}: ${step.toJobId}`)
    const currentPanel = addMany([
      base,
      currentJob.panel,
      growthAcc,
      sumStatsByIds(input.equips, step.equipIds, 'promotion equip'),
      sumStatsByIds(input.skills, step.skillIds, 'promotion skill'),
    ])
    if (!vecGE(currentPanel, toJob.require) && !input.ignorePromotionRequirements) {
      throw new Error(`promotion failed at level ${input.targetLevel}: cannot promote to ${toJob.name}`)
    }
    if (!vecGE(currentPanel, toJob.require) && input.ignorePromotionRequirements) {
      logs.push(`Lv${input.targetLevel} -> ${toJob.name}（已忽略转职条件）`)
    }
    currentJob = toJob
    logs.push(`Lv${input.targetLevel} -> ${toJob.name}（装备:${step.equipIds.join(',')} 技能:${step.skillIds.join(',')}）`)
    promotionIndex += 1
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

type Vec6 = Float32Array
const vec6 = (): Vec6 => new Float32Array(6)
const vec6FromAttr = (v: AttrVector): Vec6 => new Float32Array([v.str, v.tec, v.agi, v.con, v.per, v.wil])
const attrFromVec6 = (v: Vec6): AttrVector => ({ str: round4(v[0]), tec: round4(v[1]), agi: round4(v[2]), con: round4(v[3]), per: round4(v[4]), wil: round4(v[5]) })
const addVec6Into = (out: Vec6, a: Vec6): void => {
  for (let i = 0; i < 6; i += 1) out[i] += a[i]
}
const addMulVec6Into = (out: Vec6, a: Vec6, m: number): void => {
  for (let i = 0; i < 6; i += 1) out[i] += a[i] * m
}
const geVec6 = (a: Vec6, b: Vec6): boolean => {
  for (let i = 0; i < 6; i += 1) if (a[i] < b[i]) return false
  return true
}
const scoreVec6 = (v: Vec6, preset: ScorePreset, custom?: Partial<AttrVector>): number => {
  if (preset === 'str_first') return v[0] * 3 + v[3] * 1.2 + v[2] + v[1] + v[4] + v[5]
  if (preset === 'agi_first') return v[2] * 3 + v[1] * 1.2 + v[0] + v[3] + v[4] + v[5]
  if (preset === 'balanced') return v[0] + v[1] + v[2] + v[3] + v[4] + v[5] - Math.max(...v) * 0.05
  if (custom) {
    return (
      v[0] * (custom.str ?? 1) +
      v[1] * (custom.tec ?? 1) +
      v[2] * (custom.agi ?? 1) +
      v[3] * (custom.con ?? 1) +
      v[4] * (custom.per ?? 1) +
      v[5] * (custom.wil ?? 1)
    )
  }
  return v[0] + v[1] + v[2] + v[3] + v[4] + v[5]
}
const keyOfStateNum = (level: number, jobIndex: number, transferCount: number): number => level * 1_000_000 + jobIndex * 1_000 + transferCount
const factorPrefix = (targetLevel: number): Float32Array => {
  const prefix = new Float32Array(targetLevel + 1)
  for (let level = 1; level < targetLevel; level += 1) prefix[level + 1] = prefix[level] + levelFactor(level)
  return prefix
}
const factorRange = (prefix: Float32Array, fromLevel: number, toLevel: number): number => {
  if (toLevel <= fromLevel) return 0
  return prefix[toLevel] - prefix[fromLevel]
}

class SoAStatePool {
  size = 0
  capacity: number
  levels: Uint16Array
  jobIndexes: Uint16Array
  transferCounts: Uint8Array
  visitedMasks: BigUint64Array
  parentIndexes: Int32Array
  promoLevels: Uint16Array
  promoJobIndexes: Int16Array
  promoEquipIndexes: Int16Array
  promoSkillIndexes: Int16Array
  routeHashes: Uint32Array
  lastPromoLevels: Uint16Array
  promoLevelCodes: Uint16Array
  growth: Float32Array

  constructor(initialCapacity = 4096) {
    this.capacity = initialCapacity
    this.levels = new Uint16Array(initialCapacity)
    this.jobIndexes = new Uint16Array(initialCapacity)
    this.transferCounts = new Uint8Array(initialCapacity)
    this.visitedMasks = new BigUint64Array(initialCapacity)
    this.parentIndexes = new Int32Array(initialCapacity)
    this.promoLevels = new Uint16Array(initialCapacity)
    this.promoJobIndexes = new Int16Array(initialCapacity)
    this.promoEquipIndexes = new Int16Array(initialCapacity)
    this.promoSkillIndexes = new Int16Array(initialCapacity)
    this.routeHashes = new Uint32Array(initialCapacity)
    this.lastPromoLevels = new Uint16Array(initialCapacity)
    this.promoLevelCodes = new Uint16Array(initialCapacity * MAX_TRANSFER_COUNT)
    this.growth = new Float32Array(initialCapacity * 6)
  }

  private ensureCapacity(): void {
    if (this.size < this.capacity) return
    const nextCap = this.capacity * 2
    const grow = <T extends ArrayBufferView>(ctor: { new (size: number): T }, oldBuf: T, length: number): T => {
      const next = new ctor(length)
      ;(next as unknown as { set(data: T, offset?: number): void }).set(oldBuf, 0)
      return next
    }
    this.levels = grow(Uint16Array, this.levels, nextCap)
    this.jobIndexes = grow(Uint16Array, this.jobIndexes, nextCap)
    this.transferCounts = grow(Uint8Array, this.transferCounts, nextCap)
    this.visitedMasks = grow(BigUint64Array, this.visitedMasks, nextCap)
    this.parentIndexes = grow(Int32Array, this.parentIndexes, nextCap)
    this.promoLevels = grow(Uint16Array, this.promoLevels, nextCap)
    this.promoJobIndexes = grow(Int16Array, this.promoJobIndexes, nextCap)
    this.promoEquipIndexes = grow(Int16Array, this.promoEquipIndexes, nextCap)
    this.promoSkillIndexes = grow(Int16Array, this.promoSkillIndexes, nextCap)
    this.routeHashes = grow(Uint32Array, this.routeHashes, nextCap)
    this.lastPromoLevels = grow(Uint16Array, this.lastPromoLevels, nextCap)
    this.promoLevelCodes = grow(Uint16Array, this.promoLevelCodes, nextCap * MAX_TRANSFER_COUNT)
    this.growth = grow(Float32Array, this.growth, nextCap * 6)
    this.capacity = nextCap
  }

  push(
    level: number,
    jobIndex: number,
    transferCount: number,
    visitedMask: bigint,
    parentIndex: number,
    promoLevel: number,
    promoJobIndex: number,
    promoEquipIndex: number,
    promoSkillIndex: number,
    routeHash: number,
    growthVec: Vec6,
  ): number {
    this.ensureCapacity()
    const i = this.size++
    this.levels[i] = level
    this.jobIndexes[i] = jobIndex
    this.transferCounts[i] = transferCount
    this.visitedMasks[i] = visitedMask
    this.parentIndexes[i] = parentIndex
    this.promoLevels[i] = promoLevel
    this.promoJobIndexes[i] = promoJobIndex
    this.promoEquipIndexes[i] = promoEquipIndex
    this.promoSkillIndexes[i] = promoSkillIndex
    this.routeHashes[i] = routeHash >>> 0
    this.lastPromoLevels[i] = promoLevel > 0 ? promoLevel : parentIndex >= 0 ? this.lastPromoLevels[parentIndex] : 0
    const codeBase = i * MAX_TRANSFER_COUNT
    if (parentIndex >= 0) {
      const pBase = parentIndex * MAX_TRANSFER_COUNT
      for (let t = 0; t < MAX_TRANSFER_COUNT; t += 1) this.promoLevelCodes[codeBase + t] = this.promoLevelCodes[pBase + t]
    } else {
      for (let t = 0; t < MAX_TRANSFER_COUNT; t += 1) this.promoLevelCodes[codeBase + t] = 0
    }
    if (promoLevel > 0 && transferCount > 0 && transferCount <= MAX_TRANSFER_COUNT) this.promoLevelCodes[codeBase + transferCount - 1] = promoLevel
    const base = i * 6
    for (let k = 0; k < 6; k += 1) this.growth[base + k] = growthVec[k]
    return i
  }

  fillGrowth(index: number, out: Vec6): void {
    const base = index * 6
    for (let k = 0; k < 6; k += 1) out[k] = this.growth[base + k]
  }

  geGrowth(aIndex: number, bIndex: number): boolean {
    const aBase = aIndex * 6
    const bBase = bIndex * 6
    for (let k = 0; k < 6; k += 1) if (this.growth[aBase + k] < this.growth[bBase + k]) return false
    return true
  }

  appendGrowthTo(index: number, out: Vec6): void {
    const base = index * 6
    for (let k = 0; k < 6; k += 1) out[k] += this.growth[base + k]
  }

  discardLastIf(index: number): void {
    if (index === this.size - 1) this.size -= 1
  }

  release(index: number): void {
    // 暂不复用索引，避免前沿结构中残留引用被重写导致错误剪枝。
    void index
  }
}

const compactStatePool = (pool: SoAStatePool, beam: number[]): { pool: SoAStatePool; beam: number[] } => {
  if (beam.length === 0 || pool.size === 0) return { pool, beam }
  const keep = new Uint8Array(pool.size)
  const stack = [...beam]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (cur < 0 || cur >= pool.size) continue
    if (keep[cur] === 1) continue
    keep[cur] = 1
    const p = pool.parentIndexes[cur]
    if (p >= 0) stack.push(p)
  }
  let keepCount = 0
  for (let i = 0; i < keep.length; i += 1) keepCount += keep[i]
  if (keepCount === pool.size) return { pool, beam }

  const newPool = new SoAStatePool(Math.max(keepCount + 64, 256))
  const map = new Int32Array(pool.size)
  map.fill(-1)
  const tmpGrowth = vec6()
  for (let old = 0; old < pool.size; old += 1) {
    if (keep[old] === 0) continue
    pool.fillGrowth(old, tmpGrowth)
    const oldParent = pool.parentIndexes[old]
    const newParent = oldParent >= 0 ? map[oldParent] : -1
    const created = newPool.push(
      pool.levels[old],
      pool.jobIndexes[old],
      pool.transferCounts[old],
      pool.visitedMasks[old],
      newParent,
      pool.promoLevels[old],
      pool.promoJobIndexes[old],
      pool.promoEquipIndexes[old],
      pool.promoSkillIndexes[old],
      pool.routeHashes[old],
      tmpGrowth,
    )
    map[old] = created
  }
  const newBeam = beam.map((idx) => map[idx]).filter((idx) => idx >= 0)
  return { pool: newPool, beam: newBeam }
}

class MinHeapTopK {
  private readonly data: Array<{ index: number; score: number }> = []
  private readonly k: number
  constructor(k: number) {
    this.k = k
  }

  push(index: number, score: number): void {
    if (this.k <= 0) return
    if (this.data.length < this.k) {
      this.data.push({ index, score })
      this.siftUp(this.data.length - 1)
      return
    }
    if (score <= this.data[0].score) return
    this.data[0] = { index, score }
    this.siftDown(0)
  }

  valuesDesc(): number[] {
    return [...this.data].sort((a, b) => b.score - a.score).map((x) => x.index)
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (this.data[index].score >= this.data[parent].score) break
      ;[this.data[index], this.data[parent]] = [this.data[parent], this.data[index]]
      index = parent
    }
  }

  private siftDown(index: number): void {
    const n = this.data.length
    while (true) {
      const left = index * 2 + 1
      const right = left + 1
      let smallest = index
      if (left < n && this.data[left].score < this.data[smallest].score) smallest = left
      if (right < n && this.data[right].score < this.data[smallest].score) smallest = right
      if (smallest === index) break
      ;[this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]]
      index = smallest
    }
  }
}

const quantSig = (v: Vec6): string => {
  const q = 0.25
  return `${Math.floor(v[0] / q)}|${Math.floor(v[1] / q)}|${Math.floor(v[2] / q)}|${Math.floor(v[3] / q)}|${Math.floor(v[4] / q)}|${Math.floor(v[5] / q)}`
}
const majorBucket = (v: Vec6): string => {
  const q = 2
  return `${Math.floor(v[0] / q)}|${Math.floor(v[2] / q)}|${Math.floor(v[3] / q)}`
}

const routeHashNext = (parentHash: number, promoJobIndex: number): number => ((parentHash * 1315423911) ^ (promoJobIndex + 1)) >>> 0

const yieldNow = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

const vecDominatesOrEqual = (a: AttrVector, b: AttrVector): boolean =>
  a.str >= b.str && a.tec >= b.tec && a.agi >= b.agi && a.con >= b.con && a.per >= b.per && a.wil >= b.wil

const routeKey = (promotions: PromotionStep[]): string => promotions.map((p) => p.toJobId).join('>')

const levelsNoLater = (a: PromotionStep[], b: PromotionStep[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i].level > b[i].level) return false
  return true
}

const filterDominatedByTiming = (plans: SearchPlan[]): SearchPlan[] => {
  const byRoute = new Map<string, SearchPlan[]>()
  for (const plan of plans) {
    const key = routeKey(plan.promotions)
    const bucket = byRoute.get(key) ?? []
    bucket.push(plan)
    byRoute.set(key, bucket)
  }
  const kept: SearchPlan[] = []
  for (const bucket of byRoute.values()) {
    for (let i = 0; i < bucket.length; i += 1) {
      const cur = bucket[i]
      let dominated = false
      for (let j = 0; j < bucket.length; j += 1) {
        if (i === j) continue
        const other = bucket[j]
        if (!levelsNoLater(other.promotions, cur.promotions)) continue
        if (!vecDominatesOrEqual(other.final, cur.final)) continue
        if (other.score >= cur.score) {
          dominated = true
          break
        }
      }
      if (!dominated) kept.push(cur)
    }
  }
  return kept
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

export const searchZhushenPlans = async (
  input: SimulationInput,
  onProgress?: (progress: SearchProgress) => void,
  runtime?: SearchRuntimeOptions,
): Promise<SearchResult> => {
  const search = input.search
  if (!search?.enabled) return { topPlans: [], exploredStates: 0, prunedByDominance: 0 }
  if (input.jobs.length > 64) throw new Error('current optimized search supports up to 64 jobs for visited mask')

  const jobsById = new Map(input.jobs.map((j) => [j.id, j]))
  const jobIndexById = new Map(input.jobs.map((j, i) => [j.id, i]))
  const initialJob = jobsById.get(input.initialJobId)
  if (!initialJob) throw new Error(`initial job not found: ${input.initialJobId}`)
  const initialJobIndex = jobIndexById.get(input.initialJobId)
  if (initialJobIndex === undefined) throw new Error(`initial job index not found: ${input.initialJobId}`)

  validateSingleEquipPerSlot(input.equips, search.finalActiveEquipIds, 'search.finalActiveEquipIds')
  validateSkillCount(search.finalActiveSkillIds, 'search.finalActiveSkillIds')
  const equipLoadouts = buildEquipLoadouts(input.equips)
  const skillLoadouts = combinations(input.skills.map((s) => s.id), Math.min(search.maxSkillPerStep, 3))
  const equipVecByLoadout = equipLoadouts.map((ids) => vec6FromAttr(sumStatsByIds(input.equips, ids, 'search equip')))
  const skillVecByLoadout = skillLoadouts.map((ids) => vec6FromAttr(sumStatsByIds(input.skills, ids, 'search skill')))
  const equipFlat = new Float32Array(equipVecByLoadout.length * 6)
  for (let i = 0; i < equipVecByLoadout.length; i += 1) {
    const b = i * 6
    for (let k = 0; k < 6; k += 1) equipFlat[b + k] = equipVecByLoadout[i][k]
  }
  const skillFlat = new Float32Array(skillVecByLoadout.length * 6)
  for (let i = 0; i < skillVecByLoadout.length; i += 1) {
    const b = i * 6
    for (let k = 0; k < 6; k += 1) skillFlat[b + k] = skillVecByLoadout[i][k]
  }
  const finalEquipVec = vec6FromAttr(sumStatsByIds(input.equips, search.finalActiveEquipIds, 'search final equip'))
  const finalSkillVec = vec6FromAttr(sumStatsByIds(input.skills, search.finalActiveSkillIds, 'search final skill'))
  const jobPanelVec = input.jobs.map((j) => vec6FromAttr(j.panel))
  const jobGrowthVec = input.jobs.map((j) => vec6FromAttr(j.growth))
  const jobRequireVec = input.jobs.map((j) => vec6FromAttr(j.require))
  const charGrowthVec = vec6FromAttr(input.character.growth)
  const factorPrefixArr = factorPrefix(input.targetLevel)

  const base = addVec(input.character.base, addMany([input.character.trait, sumStatsByIds(input.traits, input.activeTraitIds, 'active trait')]))
  const baseVec = vec6FromAttr(base)
  let pool = new SoAStatePool()
  const rootGrowth = vec6()
  const rootIndex = pool.push(1, initialJobIndex, 0, BigInt(1) << BigInt(initialJobIndex), -1, 0, -1, -1, -1, 0, rootGrowth)
  let beam: number[] = [rootIndex]
  let exploredStates = 0
  let prunedByDominance = 0
  let compactionCount = 0
  let poolPeak = pool.size
  const tempStateGrowth = vec6()
  const tempTerminal = vec6()
  const tempBeforeGrowth = vec6()
  const tempPanelBase = vec6()
  const tempCheck = vec6()
  const tempNextGrowth = vec6()
  const tempScore = vec6()
  const candidateCode = new Uint16Array(MAX_TRANSFER_COUNT)
  const yieldEvery = runtime?.yieldEvery ?? 0
  let opCounter = 0
  const firstStepAllowed = search.firstStepJobIds?.length ? new Set(search.firstStepJobIds) : null

  for (let transferStep = 0; transferStep <= search.maxTransfer; transferStep += 1) {
    const stepStart = Date.now()
    let routeChecks = 0
    let routePrunes = 0
    let groupChecks = 0
    let groupPrunes = 0
    type SkylineLayer = { states: number[]; majorMap: Map<string, number[]>; stateMajor: Map<number, string> }
    type SkylineBucket = { byLastLevel: Array<SkylineLayer | undefined> }
    const routeFrontier = new Map<number, Map<number, Map<number, SkylineBucket>>>()
    type Bucket = { states: number[]; sigMap: Map<string, number[]>; stateSig: Map<number, string> }
    const groups = new Map<number, Bucket>()

    const considerCandidate = (
      level: number,
      jobIndex: number,
      transferCount: number,
      visitedMask: bigint,
      parentIndex: number,
      promoLevel: number,
      promoJobIndex: number,
      promoEquipIdx: number,
      promoSkillIdx: number,
      routeHash: number,
      growth: Vec6,
    ): void => {
      const transferKey = transferCount
      const jobKey = jobIndex
      const hashKey = routeHash
      let byJob = routeFrontier.get(transferKey)
      if (!byJob) {
        byJob = new Map<number, Map<number, SkylineBucket>>()
        routeFrontier.set(transferKey, byJob)
      }
      let byHash = byJob.get(jobKey)
      if (!byHash) {
        byHash = new Map<number, SkylineBucket>()
        byJob.set(jobKey, byHash)
      }
      const frontier = byHash.get(hashKey) ?? { byLastLevel: new Array<SkylineLayer | undefined>(MAX_LEVEL + 1) }
      const currentLastLevel = promoLevel > 0 ? promoLevel : parentIndex >= 0 ? pool.lastPromoLevels[parentIndex] : 0
      candidateCode.fill(0)
      if (parentIndex >= 0) {
        const pBase = parentIndex * MAX_TRANSFER_COUNT
        for (let i = 0; i < MAX_TRANSFER_COUNT; i += 1) candidateCode[i] = pool.promoLevelCodes[pBase + i]
      }
      if (promoLevel > 0 && transferCount > 0 && transferCount <= MAX_TRANSFER_COUNT) candidateCode[transferCount - 1] = promoLevel
      const candMajor = majorBucket(growth)
      let dominatedByRoute = false
      for (let lvl = 0; lvl <= currentLastLevel; lvl += 1) {
        const layer = frontier.byLastLevel[lvl]
        if (!layer) continue
        const shortlist = layer.majorMap.get(candMajor) ?? []
        const rest = shortlist.length < layer.states.length ? layer.states : []
        if (runtime?.wasmCore && shortlist.length >= ROUTE_WASM_THRESHOLD) {
          const batchCodes = new Uint16Array(shortlist.length * MAX_TRANSFER_COUNT)
          const batchStats = new Float32Array(shortlist.length * 6)
          for (let i = 0; i < shortlist.length; i += 1) {
            const kept = shortlist[i]
            const cBase = kept * MAX_TRANSFER_COUNT
            const cOut = i * MAX_TRANSFER_COUNT
            for (let j = 0; j < MAX_TRANSFER_COUNT; j += 1) batchCodes[cOut + j] = pool.promoLevelCodes[cBase + j]
            const gBase = kept * 6
            const gOut = i * 6
            for (let j = 0; j < 6; j += 1) batchStats[gOut + j] = pool.growth[gBase + j]
          }
          const compared = runtime.wasmCore.routePruneFlags(batchCodes, batchStats, MAX_TRANSFER_COUNT, transferCount, candidateCode, growth)
          for (let i = 0; i < shortlist.length; i += 1) {
            routeChecks += 1
            if (compared.domByBatch[i] === 1) {
              dominatedByRoute = true
              prunedByDominance += 1
              routePrunes += 1
              break
            }
          }
        } else {
          for (const kept of shortlist) {
            if (pool.transferCounts[kept] !== transferCount) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let i = 0; i < transferCount; i += 1) {
              if (pool.promoLevelCodes[keptBase + i] > candidateCode[i]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            routeChecks += 1
            pool.fillGrowth(kept, tempScore)
            if (!geVec6(tempScore, growth)) continue
            dominatedByRoute = true
            prunedByDominance += 1
            routePrunes += 1
            break
          }
        }
        if (!dominatedByRoute) {
          for (const kept of rest) {
            if (shortlist.includes(kept)) continue
            if (pool.transferCounts[kept] !== transferCount) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let i = 0; i < transferCount; i += 1) {
              if (pool.promoLevelCodes[keptBase + i] > candidateCode[i]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            routeChecks += 1
            pool.fillGrowth(kept, tempScore)
            if (!geVec6(tempScore, growth)) continue
            dominatedByRoute = true
            prunedByDominance += 1
            routePrunes += 1
            break
          }
        }
        if (dominatedByRoute) break
      }
      if (dominatedByRoute) return
      for (let lvl = currentLastLevel; lvl <= MAX_LEVEL; lvl += 1) {
        const layer = frontier.byLastLevel[lvl]
        if (!layer) continue
        const shortlist = layer.majorMap.get(candMajor) ?? []
        const checkList = shortlist.length > 0 ? shortlist : layer.states
        if (runtime?.wasmCore && checkList.length >= ROUTE_WASM_THRESHOLD) {
          const batchCodes = new Uint16Array(checkList.length * MAX_TRANSFER_COUNT)
          const batchStats = new Float32Array(checkList.length * 6)
          for (let i = 0; i < checkList.length; i += 1) {
            const kept = checkList[i]
            const cBase = kept * MAX_TRANSFER_COUNT
            const cOut = i * MAX_TRANSFER_COUNT
            for (let j = 0; j < MAX_TRANSFER_COUNT; j += 1) batchCodes[cOut + j] = pool.promoLevelCodes[cBase + j]
            const gBase = kept * 6
            const gOut = i * 6
            for (let j = 0; j < 6; j += 1) batchStats[gOut + j] = pool.growth[gBase + j]
          }
          const compared = runtime.wasmCore.routePruneFlags(batchCodes, batchStats, MAX_TRANSFER_COUNT, transferCount, candidateCode, growth)
          const toDrop = new Set<number>()
          for (let i = 0; i < checkList.length; i += 1) {
            routeChecks += 1
            if (compared.domByCandidate[i] === 1) toDrop.add(checkList[i])
          }
          if (toDrop.size > 0) {
            for (let i = layer.states.length - 1; i >= 0; i -= 1) {
              const kept = layer.states[i]
              if (!toDrop.has(kept)) continue
              layer.states.splice(i, 1)
              const keptMajor = layer.stateMajor.get(kept)
              if (keptMajor) {
                const arr = layer.majorMap.get(keptMajor)
                if (arr) {
                  const pos = arr.indexOf(kept)
                  if (pos >= 0) arr.splice(pos, 1)
                  if (arr.length === 0) layer.majorMap.delete(keptMajor)
                }
                layer.stateMajor.delete(kept)
              }
              pool.release(kept)
              prunedByDominance += 1
              routePrunes += 1
            }
          }
        } else {
          for (let i = layer.states.length - 1; i >= 0; i -= 1) {
            const kept = layer.states[i]
            if (shortlist.length > 0 && !shortlist.includes(kept)) continue
            if (pool.transferCounts[kept] !== transferCount) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let j = 0; j < transferCount; j += 1) {
              if (candidateCode[j] > pool.promoLevelCodes[keptBase + j]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            routeChecks += 1
            pool.fillGrowth(kept, tempScore)
            if (!geVec6(growth, tempScore)) continue
            layer.states.splice(i, 1)
            const keptMajor = layer.stateMajor.get(kept)
            if (keptMajor) {
              const arr = layer.majorMap.get(keptMajor)
              if (arr) {
                const pos = arr.indexOf(kept)
                if (pos >= 0) arr.splice(pos, 1)
                if (arr.length === 0) layer.majorMap.delete(keptMajor)
              }
              layer.stateMajor.delete(kept)
            }
            pool.release(kept)
            prunedByDominance += 1
            routePrunes += 1
          }
        }
        frontier.byLastLevel[lvl] = layer.states.length > 0 ? layer : undefined
      }
      const k = keyOfStateNum(level, jobIndex, transferCount)
      const bucket = groups.get(k) ?? { states: [], sigMap: new Map<string, number[]>(), stateSig: new Map<number, string>() }
      groups.set(k, bucket)
      const sig = quantSig(growth)
      let dominated = false
      const shortList = bucket.sigMap.get(sig) ?? bucket.states
      if (runtime?.wasmCore && shortList.length >= GROUP_WASM_THRESHOLD) {
        const batch = new Float32Array(shortList.length * 6)
        for (let i = 0; i < shortList.length; i += 1) {
          const keptIndex = shortList[i]
          const b = keptIndex * 6
          const o = i * 6
          for (let k = 0; k < 6; k += 1) batch[o + k] = pool.growth[b + k]
        }
        const compared = runtime.wasmCore.pruneFlags(batch, growth)
        for (let i = 0; i < shortList.length; i += 1) {
          groupChecks += 1
          if (compared.domByBatch[i] === 1) {
            dominated = true
            prunedByDominance += 1
            groupPrunes += 1
            break
          }
        }
      } else {
        for (const keptIndex of shortList) {
          groupChecks += 1
          pool.fillGrowth(keptIndex, tempScore)
          if (geVec6(tempScore, growth)) {
            dominated = true
            prunedByDominance += 1
            groupPrunes += 1
            break
          }
        }
      }
      if (dominated) return
      if (runtime?.wasmCore && bucket.states.length >= GROUP_WASM_THRESHOLD) {
        const batch = new Float32Array(bucket.states.length * 6)
        for (let i = 0; i < bucket.states.length; i += 1) {
          const kept = bucket.states[i]
          const b = kept * 6
          const o = i * 6
          for (let k = 0; k < 6; k += 1) batch[o + k] = pool.growth[b + k]
        }
        const compared = runtime.wasmCore.pruneFlags(batch, growth)
        for (let i = bucket.states.length - 1; i >= 0; i -= 1) {
          if (compared.domByCandidate[i] !== 1) continue
          const kept = bucket.states[i]
          bucket.states.splice(i, 1)
          pool.release(kept)
          const keptSig = bucket.stateSig.get(kept)
          if (keptSig) {
            const sigBucket = bucket.sigMap.get(keptSig)
            if (sigBucket) {
              const pos = sigBucket.indexOf(kept)
              if (pos >= 0) sigBucket.splice(pos, 1)
              if (sigBucket.length === 0) bucket.sigMap.delete(keptSig)
            }
            bucket.stateSig.delete(kept)
          }
          prunedByDominance += 1
          groupPrunes += 1
        }
      } else {
        for (let i = bucket.states.length - 1; i >= 0; i -= 1) {
          const kept = bucket.states[i]
          pool.fillGrowth(kept, tempScore)
          if (geVec6(growth, tempScore)) {
            bucket.states.splice(i, 1)
            pool.release(kept)
            const keptSig = bucket.stateSig.get(kept)
            if (keptSig) {
              const sigBucket = bucket.sigMap.get(keptSig)
              if (sigBucket) {
                const pos = sigBucket.indexOf(kept)
                if (pos >= 0) sigBucket.splice(pos, 1)
                if (sigBucket.length === 0) bucket.sigMap.delete(keptSig)
              }
              bucket.stateSig.delete(kept)
            }
            prunedByDominance += 1
            groupPrunes += 1
          }
        }
      }
      const stateIndex = pool.push(
        level,
        jobIndex,
        transferCount,
        visitedMask,
        parentIndex,
        promoLevel,
        promoJobIndex,
        promoEquipIdx,
        promoSkillIdx,
        routeHash,
        growth,
      )
      const routeLayer = frontier.byLastLevel[currentLastLevel] ?? { states: [], majorMap: new Map<string, number[]>(), stateMajor: new Map<number, string>() }
      routeLayer.states.push(stateIndex)
      const arr = routeLayer.majorMap.get(candMajor) ?? []
      arr.push(stateIndex)
      routeLayer.majorMap.set(candMajor, arr)
      routeLayer.stateMajor.set(stateIndex, candMajor)
      frontier.byLastLevel[currentLastLevel] = routeLayer
      byHash.set(hashKey, frontier)
      bucket.states.push(stateIndex)
      const sigArr = bucket.sigMap.get(sig) ?? []
      sigArr.push(stateIndex)
      bucket.sigMap.set(sig, sigArr)
      bucket.stateSig.set(stateIndex, sig)
    }

    for (const stateIndex of beam) {
      const stateLevel = pool.levels[stateIndex]
      const stateJobIndex = pool.jobIndexes[stateIndex]
      const stateTransfer = pool.transferCounts[stateIndex]
      const stateMask = pool.visitedMasks[stateIndex]
      const job = input.jobs[stateJobIndex]
      pool.fillGrowth(stateIndex, tempStateGrowth)

      tempTerminal.fill(0)
      addVec6Into(tempTerminal, tempStateGrowth)
      addMulVec6Into(tempTerminal, charGrowthVec, factorRange(factorPrefixArr, stateLevel, input.targetLevel))
      addMulVec6Into(tempTerminal, jobGrowthVec[stateJobIndex], factorRange(factorPrefixArr, stateLevel, input.targetLevel))
      considerCandidate(
        input.targetLevel,
        stateJobIndex,
        stateTransfer,
        stateMask,
        stateIndex,
        0,
        -1,
        -1,
        -1,
        pool.routeHashes[stateIndex],
        tempTerminal,
      )
      exploredStates += 1

      if (stateTransfer >= search.maxTransfer) continue
      tempBeforeGrowth.fill(0)
      addVec6Into(tempBeforeGrowth, tempStateGrowth)
      for (let promoLevel = stateLevel; promoLevel < input.targetLevel; promoLevel += 1) {
        tempPanelBase.fill(0)
        addVec6Into(tempPanelBase, baseVec)
        addVec6Into(tempPanelBase, jobPanelVec[stateJobIndex])
        addVec6Into(tempPanelBase, tempBeforeGrowth)

        for (let targetJobIndex = 0; targetJobIndex < input.jobs.length; targetJobIndex += 1) {
          const target = input.jobs[targetJobIndex]
          if (targetJobIndex === stateJobIndex) continue
          if ((stateMask & (BigInt(1) << BigInt(targetJobIndex))) !== BigInt(0)) continue
          if (target.tier === 0) continue
          if (target.tier - job.tier > search.maxTierDelta) continue
          if (job.tier - target.tier > 1) continue

          if (stateTransfer === 0 && firstStepAllowed && !firstStepAllowed.has(target.id)) continue
          let passFlags: Uint8Array | null = null
          if (runtime?.wasmCore && equipVecByLoadout.length * skillVecByLoadout.length >= 256) {
            const panel = new Float32Array(6)
            for (let k = 0; k < 6; k += 1) panel[k] = tempPanelBase[k]
            const req = new Float32Array(6)
            for (let k = 0; k < 6; k += 1) req[k] = jobRequireVec[targetJobIndex][k]
            passFlags = runtime.wasmCore.comboPassFlags(panel, equipFlat, equipVecByLoadout.length, skillFlat, skillVecByLoadout.length, req)
          }
          for (let equipIdx = 0; equipIdx < equipLoadouts.length; equipIdx += 1) {
            for (let skillIdx = 0; skillIdx < skillLoadouts.length; skillIdx += 1) {
              const flatIdx = equipIdx * skillLoadouts.length + skillIdx
              if (passFlags) {
                if (passFlags[flatIdx] !== 1) continue
              } else {
                tempCheck.fill(0)
                addVec6Into(tempCheck, tempPanelBase)
                addVec6Into(tempCheck, equipVecByLoadout[equipIdx])
                addVec6Into(tempCheck, skillVecByLoadout[skillIdx])
                if (!geVec6(tempCheck, jobRequireVec[targetJobIndex])) continue
              }

              tempNextGrowth.fill(0)
              addVec6Into(tempNextGrowth, tempBeforeGrowth)
              addMulVec6Into(tempNextGrowth, charGrowthVec, levelFactor(promoLevel))
              addMulVec6Into(tempNextGrowth, jobGrowthVec[targetJobIndex], levelFactor(promoLevel))
              considerCandidate(
                promoLevel + 1,
                targetJobIndex,
                stateTransfer + 1,
                stateMask | (BigInt(1) << BigInt(targetJobIndex)),
                stateIndex,
                promoLevel,
                targetJobIndex,
                equipIdx,
                skillIdx,
                routeHashNext(pool.routeHashes[stateIndex], targetJobIndex),
                tempNextGrowth,
              )
              exploredStates += 1
              opCounter += 1
              if (opCounter % 200000 === 0) {
                if (pool.size > poolPeak) poolPeak = pool.size
                onProgress?.({
                  phase: 'running',
                  step: transferStep + 1,
                  totalSteps: search.maxTransfer + 1,
                  beamSize: beam.length,
                  candidateSize: 0,
                  exploredStates,
                  prunedByDominance,
                  poolSize: pool.size,
                  compactionCount,
                  poolPeak,
                  stepMs: Date.now() - stepStart,
                  routeChecks,
                  routePrunes,
                  groupChecks,
                  groupPrunes,
                })
              }
              if (yieldEvery > 0 && opCounter % yieldEvery === 0) await yieldNow()
            }
          }
        }
        // 增量推进到下一候选转职等级（promoLevel+1）的前置成长
        addMulVec6Into(tempBeforeGrowth, charGrowthVec, levelFactor(promoLevel))
        addMulVec6Into(tempBeforeGrowth, jobGrowthVec[stateJobIndex], levelFactor(promoLevel))
      }
    }

    const candidates: number[] = []
    for (const bucket of groups.values()) candidates.push(...bucket.states)
    const scoreCache = new Map<number, number>()
    const scoreMode =
      search.scorePreset === 'str_first' ? 1 : search.scorePreset === 'agi_first' ? 2 : search.scorePreset === 'balanced' ? 3 : search.scoreWeights ? 4 : 0
    if (runtime?.wasmCore && candidates.length > 0) {
      const stats = new Float32Array(candidates.length * 6)
      for (let i = 0; i < candidates.length; i += 1) {
        const index = candidates[i]
        tempScore.fill(0)
        addVec6Into(tempScore, baseVec)
        addVec6Into(tempScore, jobPanelVec[pool.jobIndexes[index]])
        pool.appendGrowthTo(index, tempScore)
        const b = i * 6
        for (let k = 0; k < 6; k += 1) stats[b + k] = tempScore[k]
      }
      const w: [number, number, number, number, number, number] = [
        search.scoreWeights?.str ?? 1,
        search.scoreWeights?.tec ?? 1,
        search.scoreWeights?.agi ?? 1,
        search.scoreWeights?.con ?? 1,
        search.scoreWeights?.per ?? 1,
        search.scoreWeights?.wil ?? 1,
      ]
      const scores = runtime.wasmCore.scoreBatch(stats, candidates.length, scoreMode, w)
      for (let i = 0; i < candidates.length; i += 1) scoreCache.set(candidates[i], scores[i])
    }
    const scoreOfCandidate = (index: number): number => {
      const hit = scoreCache.get(index)
      if (hit !== undefined) return hit
      tempScore.fill(0)
      addVec6Into(tempScore, baseVec)
      addVec6Into(tempScore, jobPanelVec[pool.jobIndexes[index]])
      pool.appendGrowthTo(index, tempScore)
      const value = scoreVec6(tempScore, search.scorePreset, search.scoreWeights)
      scoreCache.set(index, value)
      return value
    }
    const topk = new MinHeapTopK(search.beamWidth)
    for (const candidate of candidates) topk.push(candidate, scoreOfCandidate(candidate))
    beam = topk.valuesDesc()
    if (pool.size > search.beamWidth * 40) {
      const compacted = compactStatePool(pool, beam)
      pool = compacted.pool
      beam = compacted.beam
      compactionCount += 1
    }
    if (pool.size > poolPeak) poolPeak = pool.size
    onProgress?.({
      phase: 'running',
      step: transferStep + 1,
      totalSteps: search.maxTransfer + 1,
      beamSize: beam.length,
      candidateSize: candidates.length,
      exploredStates,
      prunedByDominance,
      poolSize: pool.size,
      compactionCount,
      poolPeak,
      stepMs: Date.now() - stepStart,
      routeChecks,
      routePrunes,
      groupChecks,
      groupPrunes,
    })
  }

  const targetFinalJobId = search.targetFinalJobId
  const targetFinalIndex = targetFinalJobId ? jobIndexById.get(targetFinalJobId) : undefined
  const beamForOutput = targetFinalIndex === undefined ? beam : beam.filter((index) => pool.jobIndexes[index] === targetFinalIndex)

  const rawPlans = beamForOutput
    .map((stateIndex) => {
      const finalVec = vec6()
      addVec6Into(finalVec, baseVec)
      addVec6Into(finalVec, jobPanelVec[pool.jobIndexes[stateIndex]])
      pool.appendGrowthTo(stateIndex, finalVec)
      addVec6Into(finalVec, finalEquipVec)
      addVec6Into(finalVec, finalSkillVec)
      const score = scoreVec6(finalVec, search.scorePreset, search.scoreWeights)
      const promotions: PromotionStep[] = []
      const logs: string[] = []
      let curIndex = stateIndex
      const seen = new Set<number>()
      let hops = 0
      while (pool.parentIndexes[curIndex] >= 0) {
        if (seen.has(curIndex)) {
          logs.push('检测到回溯环，已中断该链路')
          break
        }
        seen.add(curIndex)
        hops += 1
        if (hops > pool.size + 4) {
          logs.push('回溯步数异常，已中断该链路')
          break
        }
        const promoLevel = pool.promoLevels[curIndex]
        const promoJobIndex = pool.promoJobIndexes[curIndex]
        const promoEquipIdx = pool.promoEquipIndexes[curIndex]
        const promoSkillIdx = pool.promoSkillIndexes[curIndex]
        if (promoLevel > 0 && promoJobIndex >= 0 && promoEquipIdx >= 0 && promoSkillIdx >= 0) {
          const toJob = input.jobs[promoJobIndex]
          const equipIds = equipLoadouts[promoEquipIdx]
          const skillIds = skillLoadouts[promoSkillIdx]
          promotions.push({ level: promoLevel, toJobId: toJob.id, equipIds: [...equipIds], skillIds: [...skillIds] })
          logs.push(`Lv${promoLevel} -> ${toJob.name}（装备:${equipIds.join(',')} 技能:${skillIds.join(',')}）`)
        }
        curIndex = pool.parentIndexes[curIndex]
      }
      promotions.reverse()
      logs.reverse()
      return {
        rank: 0,
        score: round4(score),
        final: toFixed4Vec(attrFromVec6(finalVec)),
        currentJob: input.jobs[pool.jobIndexes[stateIndex]],
        promotions,
        logs,
      }
    })
  const topPlans = filterDominatedByTiming(rawPlans)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((plan, idx) => ({ ...plan, rank: idx + 1 }))

  onProgress?.({
    phase: 'completed',
    step: search.maxTransfer + 1,
    totalSteps: search.maxTransfer + 1,
    beamSize: beam.length,
    candidateSize: beam.length,
    exploredStates,
    prunedByDominance,
    poolSize: pool.size,
    compactionCount,
    poolPeak,
    stepMs: 0,
    routeChecks: 0,
    routePrunes: 0,
    groupChecks: 0,
    groupPrunes: 0,
  })

  return { topPlans, exploredStates, prunedByDominance }
}
