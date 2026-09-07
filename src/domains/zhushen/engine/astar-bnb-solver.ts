/**
 * @file astar-bnb-solver
 * @description A-star / BnB 在线快速近最优 MVP（单次搜索内收缩）。
 */
import type { AttrVector, ScorePreset, SearchProgress, SearchResult, SimulationInput } from '@/domains/zhushen/model/zhushen-model'
import type { SearchRuntimeOptions } from './search-runtime'
import { searchZhushenPlans } from './simulator-core'

type ProgressCallback = (progress: SearchProgress) => void
const ZERO_VEC: AttrVector = { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 }

const scoreVec = (v: AttrVector, preset: ScorePreset, custom?: Partial<AttrVector>): number => {
  if (preset === 'str_first') return v.str * 3 + v.con * 1.2 + v.agi + v.tec + v.per + v.wil
  if (preset === 'agi_first') return v.agi * 3 + v.tec * 1.2 + v.str + v.con + v.per + v.wil
  if (preset === 'balanced') return v.str + v.tec + v.agi + v.con + v.per + v.wil - Math.max(v.str, v.tec, v.agi, v.con, v.per, v.wil) * 0.05
  if (custom) {
    return (
      v.str * (custom.str ?? 1) +
      v.tec * (custom.tec ?? 1) +
      v.agi * (custom.agi ?? 1) +
      v.con * (custom.con ?? 1) +
      v.per * (custom.per ?? 1) +
      v.wil * (custom.wil ?? 1)
    )
  }
  return v.str + v.tec + v.agi + v.con + v.per + v.wil
}

const addVec = (a: AttrVector, b: AttrVector): AttrVector => ({
  str: a.str + b.str,
  tec: a.tec + b.tec,
  agi: a.agi + b.agi,
  con: a.con + b.con,
  per: a.per + b.per,
  wil: a.wil + b.wil,
})

const scaleVec = (a: AttrVector, m: number): AttrVector => ({
  str: a.str * m,
  tec: a.tec * m,
  agi: a.agi * m,
  con: a.con * m,
  per: a.per * m,
  wil: a.wil * m,
})

const sumStatsByIds = <T extends { id: string; stat: AttrVector }>(source: T[], ids: string[]): AttrVector => {
  const byId = new Map(source.map((item) => [item.id, item.stat]))
  return ids.reduce((acc, id) => addVec(acc, byId.get(id) ?? ZERO_VEC), ZERO_VEC)
}

const levelFactor = (level: number): number => (level >= 60 ? 0.35 : 1)

const estimateLowerBoundScore = (input: SimulationInput): number => {
  const search = input.search
  if (!search) return 0
  const initialJob = input.jobs.find((job) => job.id === input.initialJobId)
  if (!initialJob) return 0
  let growthAcc: AttrVector = ZERO_VEC
  const growthPerLevel = addVec(input.character.growth, initialJob.growth)
  for (let level = 1; level < input.targetLevel; level += 1) {
    growthAcc = addVec(growthAcc, scaleVec(growthPerLevel, levelFactor(level)))
  }
  const final = [
    input.character.base,
    input.character.trait,
    sumStatsByIds(input.traits, input.activeTraitIds),
    initialJob.panel,
    growthAcc,
    sumStatsByIds(input.equips, search.finalActiveEquipIds),
    sumStatsByIds(input.skills, search.finalActiveSkillIds),
  ].reduce(addVec)
  return scoreVec(final, search.scorePreset, search.scoreWeights)
}

const pickFirstStepJobIdsHeuristic = (input: SimulationInput): string[] => {
  const search = input.search
  if (!search) return []
  const init = input.jobs.find((j) => j.id === input.initialJobId)
  if (!init) return []
  // 小预算硬收缩：仅保留极少首步候选，避免第一阶段式冗余扩展。
  const cap = Math.max(2, Math.min(5, Math.floor(Math.sqrt(Math.max(1, search.beamWidth)) / 4)))
  const top: Array<{ id: string; score: number }> = []
  for (const j of input.jobs) {
    if (j.id === input.initialJobId || j.tier === 0) continue
    if (j.tier - init.tier > search.maxTierDelta || init.tier - j.tier > 1) continue
    const panelGrowth = addVec(j.panel, j.growth)
    const score = scoreVec(panelGrowth, search.scorePreset, search.scoreWeights)
    if (top.length < cap) {
      top.push({ id: j.id, score })
      continue
    }
    let minIdx = 0
    for (let i = 1; i < top.length; i += 1) {
      if (top[i].score < top[minIdx].score) minIdx = i
    }
    if (score > top[minIdx].score) top[minIdx] = { id: j.id, score }
  }
  return top.sort((a, b) => b.score - a.score).map((it) => it.id)
}

/**
 * A-star / BnB MVP（单次搜索）:
 * 1) 先估算可行下界；
 * 2) 在一次 Beam 搜索内传入 BnB 下界与缓存做在线剪枝；
 * 3) 仅保留少量首步职业集合，减少早期冗余扩展。
 */
export const searchZhushenPlansByAstarBnbMvp = async (
  input: SimulationInput,
  onProgress?: ProgressCallback,
  runtime?: SearchRuntimeOptions,
): Promise<SearchResult> => {
  const search = input.search
  if (!search) return searchZhushenPlans(input, onProgress, runtime)
  const hasTargetFinalJob = Boolean(search.targetFinalJobId)

  // A* 稳定模式：存在最终职业约束时不做收缩，仅保留固定策略开关，保证候选完整性。
  if (hasTargetFinalJob) {
    return searchZhushenPlans(input, onProgress, {
      ...runtime,
    })
  }

  const narrowedFirstSteps = pickFirstStepJobIdsHeuristic(input)
  const lowerBound = estimateLowerBoundScore(input)
  const narrowedBeam = Math.max(64, Math.min(search.beamWidth, Math.floor(search.beamWidth * 0.55)))
  const singlePassInput: SimulationInput = {
    ...input,
    search: {
      ...search,
      engine: 'astar_bnb_mvp',
      beamWidth: narrowedBeam,
      firstStepJobIds: narrowedFirstSteps.length > 0 ? narrowedFirstSteps : undefined,
    },
  }
  return searchZhushenPlans(singlePassInput, onProgress, {
    ...runtime,
    bnbLowerBoundScore: lowerBound,
    bnbUpperScoreCache: runtime?.bnbUpperScoreCache ?? new Map<string, number>(),
  })
}
