/**
 * @file zhushen-model 文件说明。
 * @description 诸神模拟器的模型类型、向量工具与输入校验结构定义。
 */
import { z } from 'zod'
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'

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

const SCALE = 10000
const round4 = (value: number): number => Math.round((value + Number.EPSILON) * SCALE) / SCALE

export const zeroVec = (): AttrVector => ({ str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 })

export const addVec = (a: AttrVector, b: AttrVector): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = round4(a[key] + b[key])
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
  activeEquipIds: z.array(z.string()),
  activeSkillIds: z.array(z.string()),
  activeTraitIds: z.array(z.string()),
  promotions: z.array(
    z.object({
      level: z.number().int().min(1).max(149),
      toJobId: z.string().min(1),
      equipIds: z.array(z.string()),
      skillIds: z.array(z.string()),
    }),
  ),
  search: z
    .object({
      enabled: z.boolean().default(true),
      beamWidth: z.number().int().min(10).max(5000).default(SEARCH_RUNTIME_CONFIG.beamWidthDefault),
      maxTransfer: z.number().int().min(0).max(20).default(SEARCH_RUNTIME_CONFIG.maxTransferDefault),
      maxTierDelta: z.number().int().min(0).max(3).default(SEARCH_RUNTIME_CONFIG.maxTierDeltaDefault),
      maxSkillPerStep: z.number().int().min(0).max(3).default(SEARCH_RUNTIME_CONFIG.maxSkillPerStepDefault),
      scorePreset: z.enum(['sum', 'str_first', 'agi_first', 'balanced']).default('sum'),
      scoreWeights: vecSchema.partial().optional(),
      finalActiveEquipIds: z.array(z.string()).default([]),
      finalActiveSkillIds: z.array(z.string()).default([]),
      targetFinalJobId: z.string().optional(),
      firstStepJobIds: z.array(z.string()).optional(),
    })
    .optional(),
  ignorePromotionRequirements: z.boolean().optional().default(false),
})
