/**
 * @file zhushen-simulator 文件说明。
 * @description 核心业务算法、搜索计算与性能优化逻辑。
 */
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'
import {
  ATTR_KEYS,
  addVec,
  formatVec,
  zeroVec,
  type PromotionStep,
  type SearchProgress,
  type SearchResult,
  type SimulationInput,
} from '@/domains/zhushen/model/zhushen-model'
import { compactStatePool, MAX_TRANSFER_COUNT, SoAStatePool, type Vec6 } from '@/domains/zhushen/state-pool/soa-state-pool'
import { filterDominatedByTiming, majorBucket, quantSig, routeHashNext } from '@/domains/zhushen/pruning/search-pruning'
import type { SearchRuntimeOptions } from './search-runtime'
import {
  addMany,
  levelFactor,
  MAX_LEVEL,
  round4,
  sumStatsByIds,
  toFixed4Vec,
  validateSingleEquipPerSlot,
  validateSkillCount,
} from './simulation-helpers'
import { buildEquipLoadouts, buildPromoLevelCandidates, combinations } from './search-combinations'
import {
  addMulVec6Into,
  addVec6From,
  addVec6Into,
  attrFromVec6,
  factorPrefix,
  factorRange,
  geVec6,
  scoreVec6,
  vec6,
  vec6FromAttr,
} from './search-vectors'

export { ATTR_KEYS, addVec, formatVec, zeroVec }
export { simulateZhushen } from './simulation-runner'
export type {
  AttrKey,
  AttrVector,
  CharacterDef,
  EquipDef,
  JobDef,
  PromotionStep,
  ScorePreset,
  SearchConfig,
  SearchPlan,
  SearchProgress,
  SearchResult,
  SimulationInput,
  SimulationResult,
  SkillDef,
  TraitDef,
} from '@/domains/zhushen/model/zhushen-model'
export type { SearchRuntimeOptions } from './search-runtime'

const ROUTE_WASM_THRESHOLD = SEARCH_RUNTIME_CONFIG.routeWasmThreshold
const GROUP_WASM_THRESHOLD = SEARCH_RUNTIME_CONFIG.groupWasmThreshold
const GROUP_COMPARE_CAP = 128

const keyOfStateNum = (level: number, jobIndex: number, transferCount: number): number => level * 1_000_000 + jobIndex * 1_000 + transferCount


const yieldNow = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })


const keyPromoBand = (level: number): number => Math.floor(level / 10)
const routeBucketKey = (transferCount: number, lastPromoLevel: number, growthMajor: string): string =>
  `${transferCount}:${keyPromoBand(lastPromoLevel)}:${growthMajor}`

const growthMinorBucket = (v: Vec6): string => {
  const major = majorBucket(v)
  const sumBand = Math.floor((v[0] + v[1] + v[2] + v[3] + v[4] + v[5]) / 0.5)
  return `${major}:${sumBand}`
}

const geGrowthAt = (pool: SoAStatePool, stateIndex: number, target: Vec6): boolean => {
  const b = stateIndex * 6
  for (let k = 0; k < 6; k += 1) if (pool.growth[b + k] < target[k]) return false
  return true
}

const geVecToGrowthAt = (value: Vec6, pool: SoAStatePool, stateIndex: number): boolean => {
  const b = stateIndex * 6
  for (let k = 0; k < 6; k += 1) if (value[k] < pool.growth[b + k]) return false
  return true
}

/**
 * searchZhushenPlans。
 * @param input 业务输入对象，包含执行所需上下文数据。
 * @param onProgress 进度回调，用于上报阶段性执行指标。
 * @param runtime 运行时参数，包含性能策略和可选依赖注入。
 * @return 返回计算结果，包含核心指标与产物。
 * @throws 当业务前置条件不满足或内部处理失败时抛出异常。
 * @exception 当业务前置条件不满足或内部处理失败时抛出异常。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
export const searchZhushenPlans = async (
  input: SimulationInput,
  onProgress?: (progress: SearchProgress) => void,
  runtime?: SearchRuntimeOptions,
): Promise<SearchResult> => {
  const search = input.search
  if (!search?.enabled) return { topPlans: [], exploredStates: 0, prunedByDominance: 0 }
  if (input.jobs.length > 64) throw new Error('search supports <=64 jobs')

  const jobsById = new Map(input.jobs.map((j) => [j.id, j]))
  const jobIndexById = new Map(input.jobs.map((j, i) => [j.id, i]))
  const initialJob = jobsById.get(input.initialJobId)
  if (!initialJob) throw new Error(`initial job not found: ${input.initialJobId}`)
  const initialJobIndex = jobIndexById.get(input.initialJobId)
  if (initialJobIndex === undefined) throw new Error(`initial job index missing: ${input.initialJobId}`)

  validateSingleEquipPerSlot(input.equips, search.finalActiveEquipIds, 'search.finalActiveEquipIds')
  validateSkillCount(search.finalActiveSkillIds, 'search.finalActiveSkillIds')
  const equipLoadouts = buildEquipLoadouts(input.equips)
  const skillLoadouts = combinations(input.skills.map((s) => s.id), Math.min(search.maxSkillPerStep, 3))
  const skillLoadoutCount = skillLoadouts.length
  const comboCount = equipLoadouts.length * skillLoadoutCount
  const defaultComboOrder = Array.from({ length: comboCount }, (_, i) => i)
  const equipVecByLoadout = equipLoadouts.map((ids) => vec6FromAttr(sumStatsByIds(input.equips, ids, 'search equip')))
  const skillVecByLoadout = skillLoadouts.map((ids) => vec6FromAttr(sumStatsByIds(input.skills, ids, 'search skill')))
  const comboOrderByJob = new Map<number, number[]>()
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
  const maxJobPanelVec = vec6()
  const maxJobGrowthVec = vec6()
  for (let k = 0; k < 6; k += 1) {
    let p = 0
    let g = 0
    for (let i = 0; i < input.jobs.length; i += 1) {
      if (jobPanelVec[i][k] > p) p = jobPanelVec[i][k]
      if (jobGrowthVec[i][k] > g) g = jobGrowthVec[i][k]
    }
    maxJobPanelVec[k] = p
    maxJobGrowthVec[k] = g
  }
  const maxStepEquipSkillVec = vec6()
  for (let k = 0; k < 6; k += 1) {
    let maxEquip = 0
    let maxSkill = 0
    for (let i = 0; i < equipVecByLoadout.length; i += 1) if (equipVecByLoadout[i][k] > maxEquip) maxEquip = equipVecByLoadout[i][k]
    for (let i = 0; i < skillVecByLoadout.length; i += 1) if (skillVecByLoadout[i][k] > maxSkill) maxSkill = skillVecByLoadout[i][k]
    maxStepEquipSkillVec[k] = maxEquip + maxSkill
  }
  const charGrowthVec = vec6FromAttr(input.character.growth)
  const factorPrefixArr = factorPrefix(input.targetLevel)
  const targetFinalIndex = search.targetFinalJobId ? jobIndexById.get(search.targetFinalJobId) : undefined
  const targetFinalRequireVec = targetFinalIndex === undefined ? null : jobRequireVec[targetFinalIndex]
  const buildComboOrderForJob = (targetJobIndex: number): number[] => {
    const cached = comboOrderByJob.get(targetJobIndex)
    if (cached) return cached
    const req = jobRequireVec[targetJobIndex]
    const arr = new Array<number>(comboCount)
    const scoreArr = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 1) {
      arr[i] = i
      const equipIdx = Math.floor(i / skillLoadoutCount)
      const skillIdx = i % skillLoadoutCount
      let score = 0
      for (let k = 0; k < 6; k += 1) {
        const bonus = equipVecByLoadout[equipIdx][k] + skillVecByLoadout[skillIdx][k]
        score += bonus * (1 + req[k] * 0.1)
      }
      scoreArr[i] = score
    }
    arr.sort((a, b) => scoreArr[b] - scoreArr[a])
    comboOrderByJob.set(targetJobIndex, arr)
    return arr
  }

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
  const tempAfterPromoGrowth = vec6()
  const tempFinalReachUpper = vec6()
  const tempScore = vec6()
  const candidateCode = new Uint16Array(MAX_TRANSFER_COUNT)
  let reusableRouteCodes = new Uint16Array(0)
  let reusableRouteStats = new Float32Array(0)
  let reusableGroupStats = new Float32Array(0)
  let reusableScoreStats = new Float32Array(0)
  const reusableComboPanel = new Float32Array(6)
  const reusableComboReq = new Float32Array(6)
  const ensureRouteBuffers = (stateCount: number) => {
    const codeSize = stateCount * MAX_TRANSFER_COUNT
    const statSize = stateCount * 6
    if (reusableRouteCodes.length < codeSize) reusableRouteCodes = new Uint16Array(codeSize)
    if (reusableRouteStats.length < statSize) reusableRouteStats = new Float32Array(statSize)
  }
  const ensureGroupBuffer = (stateCount: number) => {
    const statSize = stateCount * 6
    if (reusableGroupStats.length < statSize) reusableGroupStats = new Float32Array(statSize)
  }
  const ensureScoreBuffer = (stateCount: number) => {
    const statSize = stateCount * 6
    if (reusableScoreStats.length < statSize) reusableScoreStats = new Float32Array(statSize)
  }
  const yieldEvery = runtime?.yieldEvery ?? 0
  let opCounter = 0
  const firstStepAllowed = search.firstStepJobIds?.length ? new Set(search.firstStepJobIds) : null
  const enableGroupMinorBucket = search.enableGroupMinorBucket !== false
  const enableComboPriorityOrder = search.enableComboPriorityOrder !== false
  const enableDynamicBeamShrink = search.enableDynamicBeamShrink === true
  const enableMarginScreen = search.enableMarginScreen === true
  let totalPromoEnumMs = 0
  let totalComboCheckMs = 0
  let totalRoutePruneMs = 0
  let totalGroupPruneMs = 0
  let totalScoreRankMs = 0
  let totalComboTried = 0
  let totalComboPassed = 0
  let totalRouteChecks = 0
  let totalGroupChecks = 0

  for (let transferStep = 0; transferStep <= search.maxTransfer; transferStep += 1) {
    const stepStart = Date.now()
    let routeChecks = 0
    let routePrunes = 0
    let groupChecks = 0
    let groupPrunes = 0
    const buildStepDetail = () => undefined
    type SkylineLayer = {
      states: number[]
      majorMap: Map<string, number[]>
      stateMajor: Map<number, string>
      routeBucketMap: Map<string, number[]>
      stateRouteBucket: Map<number, string>
    }
    type SkylineBucket = { byLastLevel: Array<SkylineLayer | undefined> }
    const routeFrontier = new Map<number, Map<number, SkylineBucket>>()
type Bucket = {
  states: number[]
  sigMap: Map<string, number[]>
  stateSig: Map<number, string>
  minorMap: Map<string, number[]>
  stateMinor: Map<number, string>
  archiveByMajor: Map<string, number[]>
  stateArchiveMajor: Map<number, string>
  maxGrowth: Vec6
  maxGrowthSum: number
}
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
      const jobKey = jobIndex
      const hashKey = routeHash
      // P2: 目标终态可达上界剪枝
      if (targetFinalRequireVec) {
        const remainFactor = factorRange(factorPrefixArr, level, input.targetLevel)
        tempCheck.fill(0)
        addVec6Into(tempCheck, baseVec)
        addVec6Into(tempCheck, maxJobPanelVec)
        addVec6Into(tempCheck, growth)
        addMulVec6Into(tempCheck, charGrowthVec, remainFactor)
        addMulVec6Into(tempCheck, maxJobGrowthVec, remainFactor)
        addVec6Into(tempCheck, finalEquipVec)
        addVec6Into(tempCheck, finalSkillVec)
        if (!geVec6(tempCheck, targetFinalRequireVec)) {
          prunedByDominance += 1
          return
        }
        const lowerBound = runtime?.bnbLowerBoundScore
        if (lowerBound !== undefined) {
          let upperScore: number
          const cacheKey = `${level}:${jobIndex}:${transferCount}:${quantSig(growth)}`
          const cache = runtime?.bnbUpperScoreCache
          const hit = cache?.get(cacheKey)
          if (hit !== undefined) upperScore = hit
          else {
            upperScore = scoreVec6(tempCheck, search.scorePreset, search.scoreWeights)
            cache?.set(cacheKey, upperScore)
          }
          if (upperScore <= lowerBound) {
            prunedByDominance += 1
            return
          }
        }
      }
      let byHash = routeFrontier.get(jobKey)
      if (!byHash) {
        byHash = new Map<number, SkylineBucket>()
        routeFrontier.set(jobKey, byHash)
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
        const bucketKey = routeBucketKey(transferCount, currentLastLevel, candMajor)
        const shortlist = layer.routeBucketMap.get(bucketKey) ?? layer.majorMap.get(candMajor) ?? []
        const rest = shortlist.length < layer.states.length ? layer.states : []
        const wasmRouteCheckList = runtime?.wasmCore && shortlist.length + rest.length >= ROUTE_WASM_THRESHOLD
          ? [...shortlist, ...rest.filter((kept) => !shortlist.includes(kept))]
          : null
        if (runtime?.wasmCore && wasmRouteCheckList && wasmRouteCheckList.length >= ROUTE_WASM_THRESHOLD) {
          ensureRouteBuffers(wasmRouteCheckList.length)
          for (let i = 0; i < wasmRouteCheckList.length; i += 1) {
            const kept = wasmRouteCheckList[i]
            const keptTransfer = pool.transferCounts[kept]
            if (keptTransfer > transferCount) continue
            const cBase = kept * MAX_TRANSFER_COUNT
            const cOut = i * MAX_TRANSFER_COUNT
            for (let j = 0; j < MAX_TRANSFER_COUNT; j += 1) reusableRouteCodes[cOut + j] = pool.promoLevelCodes[cBase + j]
            const gBase = kept * 6
            const gOut = i * 6
            for (let j = 0; j < 6; j += 1) reusableRouteStats[gOut + j] = pool.growth[gBase + j]
          }
          const compared = runtime.wasmCore.routePruneFlags(
            reusableRouteCodes,
            reusableRouteStats,
            MAX_TRANSFER_COUNT,
            transferCount,
            candidateCode,
            growth,
          )
          for (let i = 0; i < wasmRouteCheckList.length; i += 1) {
            const kept = wasmRouteCheckList[i]
            const keptTransfer = pool.transferCounts[kept]
            if (keptTransfer > transferCount) continue
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
            const keptTransfer = pool.transferCounts[kept]
            // P1: 资源约束支配，较少转职次数可支配较多转职次数
            if (keptTransfer > transferCount) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let i = 0; i < keptTransfer; i += 1) {
              if (pool.promoLevelCodes[keptBase + i] > candidateCode[i]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            const gBase = kept * 6
            if (pool.growth[gBase] < growth[0]) continue
            if (pool.growth[gBase + 1] < growth[1]) continue
            if (pool.growth[gBase + 2] < growth[2]) continue
            routeChecks += 1
            pool.fillGrowth(kept, tempScore)
            if (!geVec6(tempScore, growth)) continue
            dominatedByRoute = true
            prunedByDominance += 1
            routePrunes += 1
            break
          }
        }
        if (!dominatedByRoute && !wasmRouteCheckList) {
          for (const kept of rest) {
            if (shortlist.includes(kept)) continue
            const keptTransfer = pool.transferCounts[kept]
            if (keptTransfer > transferCount) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let i = 0; i < keptTransfer; i += 1) {
              if (pool.promoLevelCodes[keptBase + i] > candidateCode[i]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            const gBase = kept * 6
            if (pool.growth[gBase] < growth[0]) continue
            if (pool.growth[gBase + 1] < growth[1]) continue
            if (pool.growth[gBase + 2] < growth[2]) continue
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
          ensureRouteBuffers(checkList.length)
          for (let i = 0; i < checkList.length; i += 1) {
            const kept = checkList[i]
            const cBase = kept * MAX_TRANSFER_COUNT
            const cOut = i * MAX_TRANSFER_COUNT
            for (let j = 0; j < MAX_TRANSFER_COUNT; j += 1) reusableRouteCodes[cOut + j] = pool.promoLevelCodes[cBase + j]
            const gBase = kept * 6
            const gOut = i * 6
            for (let j = 0; j < 6; j += 1) reusableRouteStats[gOut + j] = pool.growth[gBase + j]
          }
          const compared = runtime.wasmCore.routePruneFlags(
            reusableRouteCodes,
            reusableRouteStats,
            MAX_TRANSFER_COUNT,
            transferCount,
            candidateCode,
            growth,
          )
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
              const keptRouteBucket = layer.stateRouteBucket.get(kept)
              if (keptRouteBucket) {
                const arr = layer.routeBucketMap.get(keptRouteBucket)
                if (arr) {
                  const pos = arr.indexOf(kept)
                  if (pos >= 0) arr.splice(pos, 1)
                  if (arr.length === 0) layer.routeBucketMap.delete(keptRouteBucket)
                }
                layer.stateRouteBucket.delete(kept)
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
            const keptTransfer = pool.transferCounts[kept]
            // 候选转职次数更多时，不反向支配更省资源状态
            if (transferCount > keptTransfer) continue
            const keptBase = kept * MAX_TRANSFER_COUNT
            let noLater = true
            for (let j = 0; j < transferCount; j += 1) {
              if (candidateCode[j] > pool.promoLevelCodes[keptBase + j]) {
                noLater = false
                break
              }
            }
            if (!noLater) continue
            const gBase = kept * 6
            if (growth[0] < pool.growth[gBase]) continue
            if (growth[1] < pool.growth[gBase + 1]) continue
            if (growth[2] < pool.growth[gBase + 2]) continue
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
            const keptRouteBucket = layer.stateRouteBucket.get(kept)
            if (keptRouteBucket) {
              const arr = layer.routeBucketMap.get(keptRouteBucket)
              if (arr) {
                const pos = arr.indexOf(kept)
                if (pos >= 0) arr.splice(pos, 1)
                if (arr.length === 0) layer.routeBucketMap.delete(keptRouteBucket)
              }
              layer.stateRouteBucket.delete(kept)
            }
            pool.release(kept)
            prunedByDominance += 1
            routePrunes += 1
          }
        }
        frontier.byLastLevel[lvl] = layer.states.length > 0 ? layer : undefined
      }
      const k = keyOfStateNum(level, jobIndex, transferCount)
      const bucket = groups.get(k) ?? {
        states: [],
        sigMap: new Map<string, number[]>(),
        stateSig: new Map<number, string>(),
        minorMap: new Map<string, number[]>(),
        stateMinor: new Map<number, string>(),
        archiveByMajor: new Map<string, number[]>(),
        stateArchiveMajor: new Map<number, string>(),
        maxGrowth: Float32Array.from([-1, -1, -1, -1, -1, -1]) as Vec6,
        maxGrowthSum: -1,
      }
      groups.set(k, bucket)
      const sig = quantSig(growth)
      const minor = growthMinorBucket(growth)
      let dominated = false
      let impossibleDominated = false
      let growthSum = 0
      for (let d = 0; d < 6; d += 1) growthSum += growth[d]
      if (growthSum > bucket.maxGrowthSum) impossibleDominated = true
      for (let d = 0; d < 6; d += 1) {
        if (growth[d] > bucket.maxGrowth[d]) {
          impossibleDominated = true
          break
        }
      }
      if (!impossibleDominated) {
        const archiveList = bucket.archiveByMajor.get(candMajor) ?? []
        const baseShortList =
          archiveList.length > 0
            ? archiveList
            : enableGroupMinorBucket
              ? bucket.sigMap.get(sig) ?? bucket.minorMap.get(minor) ?? bucket.states
              : bucket.sigMap.get(sig) ?? bucket.states
        const shortList =
          baseShortList.length > GROUP_COMPARE_CAP ? baseShortList.slice(baseShortList.length - GROUP_COMPARE_CAP) : baseShortList
        const quickFiltered: number[] = []
        for (let i = 0; i < shortList.length; i += 1) {
          const keptIndex = shortList[i]
          const b = keptIndex * 6
          // Group P1: 前置必要条件粗筛（不满足时不可能支配候选）
          if (pool.growth[b] < growth[0]) continue
          if (pool.growth[b + 1] < growth[1]) continue
          if (pool.growth[b + 2] < growth[2]) continue
          quickFiltered.push(keptIndex)
        }
        if (runtime?.wasmCore && quickFiltered.length >= GROUP_WASM_THRESHOLD) {
          ensureGroupBuffer(quickFiltered.length)
          for (let i = 0; i < quickFiltered.length; i += 1) {
            const keptIndex = quickFiltered[i]
            const b = keptIndex * 6
            const o = i * 6
            for (let k = 0; k < 6; k += 1) reusableGroupStats[o + k] = pool.growth[b + k]
          }
          const compared = runtime.wasmCore.pruneFlags(reusableGroupStats, growth)
          for (let i = 0; i < quickFiltered.length; i += 1) {
            groupChecks += 1
            if (compared.domByBatch[i] === 1) {
              dominated = true
              prunedByDominance += 1
              groupPrunes += 1
              break
            }
          }
        } else {
          for (const keptIndex of quickFiltered) {
            groupChecks += 1
            if (geGrowthAt(pool, keptIndex, growth)) {
              dominated = true
              prunedByDominance += 1
              groupPrunes += 1
              break
            }
          }
        }
      }
      if (dominated) return
      if (runtime?.wasmCore && bucket.states.length >= GROUP_WASM_THRESHOLD) {
        ensureGroupBuffer(bucket.states.length)
        for (let i = 0; i < bucket.states.length; i += 1) {
          const kept = bucket.states[i]
          const b = kept * 6
          const o = i * 6
          for (let k = 0; k < 6; k += 1) reusableGroupStats[o + k] = pool.growth[b + k]
        }
        const compared = runtime.wasmCore.pruneFlags(reusableGroupStats, growth)
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
          const keptMinor = bucket.stateMinor.get(kept)
          if (keptMinor) {
            const minorBucket = bucket.minorMap.get(keptMinor)
            if (minorBucket) {
              const pos = minorBucket.indexOf(kept)
              if (pos >= 0) minorBucket.splice(pos, 1)
              if (minorBucket.length === 0) bucket.minorMap.delete(keptMinor)
            }
            bucket.stateMinor.delete(kept)
          }
          const keptArchiveMajor = bucket.stateArchiveMajor.get(kept)
          if (keptArchiveMajor) {
            const archive = bucket.archiveByMajor.get(keptArchiveMajor)
            if (archive) {
              const pos = archive.indexOf(kept)
              if (pos >= 0) archive.splice(pos, 1)
              if (archive.length === 0) bucket.archiveByMajor.delete(keptArchiveMajor)
            }
            bucket.stateArchiveMajor.delete(kept)
          }
          prunedByDominance += 1
          groupPrunes += 1
        }
      } else {
        for (let i = bucket.states.length - 1; i >= 0; i -= 1) {
          const kept = bucket.states[i]
          const b = kept * 6
          if (growth[0] < pool.growth[b]) continue
          if (growth[1] < pool.growth[b + 1]) continue
          if (growth[2] < pool.growth[b + 2]) continue
          if (geVecToGrowthAt(growth, pool, kept)) {
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
            const keptMinor = bucket.stateMinor.get(kept)
            if (keptMinor) {
              const minorBucket = bucket.minorMap.get(keptMinor)
              if (minorBucket) {
                const pos = minorBucket.indexOf(kept)
                if (pos >= 0) minorBucket.splice(pos, 1)
                if (minorBucket.length === 0) bucket.minorMap.delete(keptMinor)
              }
              bucket.stateMinor.delete(kept)
            }
            const keptArchiveMajor = bucket.stateArchiveMajor.get(kept)
            if (keptArchiveMajor) {
              const archive = bucket.archiveByMajor.get(keptArchiveMajor)
              if (archive) {
                const pos = archive.indexOf(kept)
                if (pos >= 0) archive.splice(pos, 1)
                if (archive.length === 0) bucket.archiveByMajor.delete(keptArchiveMajor)
              }
              bucket.stateArchiveMajor.delete(kept)
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
      const routeLayer = frontier.byLastLevel[currentLastLevel] ?? {
        states: [],
        majorMap: new Map<string, number[]>(),
        stateMajor: new Map<number, string>(),
        routeBucketMap: new Map<string, number[]>(),
        stateRouteBucket: new Map<number, string>(),
      }
      routeLayer.states.push(stateIndex)
      const arr = routeLayer.majorMap.get(candMajor) ?? []
      arr.push(stateIndex)
      routeLayer.majorMap.set(candMajor, arr)
      routeLayer.stateMajor.set(stateIndex, candMajor)
      const bucketKey = routeBucketKey(transferCount, currentLastLevel, candMajor)
      const bucketArr = routeLayer.routeBucketMap.get(bucketKey) ?? []
      bucketArr.push(stateIndex)
      routeLayer.routeBucketMap.set(bucketKey, bucketArr)
      routeLayer.stateRouteBucket.set(stateIndex, bucketKey)
      frontier.byLastLevel[currentLastLevel] = routeLayer
      byHash.set(hashKey, frontier)
      bucket.states.push(stateIndex)
      const sigArr = bucket.sigMap.get(sig) ?? []
      sigArr.push(stateIndex)
      bucket.sigMap.set(sig, sigArr)
      bucket.stateSig.set(stateIndex, sig)
      const minorArr = bucket.minorMap.get(minor) ?? []
      minorArr.push(stateIndex)
      bucket.minorMap.set(minor, minorArr)
      bucket.stateMinor.set(stateIndex, minor)
      const archive: number[] = bucket.archiveByMajor.get(candMajor) ?? []
      let dominatedByArchive = false
      for (const kept of archive) {
        if (geGrowthAt(pool, kept, growth)) {
          dominatedByArchive = true
          break
        }
      }
      if (!dominatedByArchive) {
        for (let i = archive.length - 1; i >= 0; i -= 1) {
          const kept = archive[i]
          if (geVecToGrowthAt(growth, pool, kept)) {
            archive.splice(i, 1)
            bucket.stateArchiveMajor.delete(kept)
          }
        }
        archive.push(stateIndex)
        bucket.archiveByMajor.set(candMajor, archive)
        bucket.stateArchiveMajor.set(stateIndex, candMajor)
      }
      for (let d = 0; d < 6; d += 1) {
        if (growth[d] > bucket.maxGrowth[d]) bucket.maxGrowth[d] = growth[d]
      }
      if (growthSum > bucket.maxGrowthSum) bucket.maxGrowthSum = growthSum
    }

    const promoEnumStart = Date.now()
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
      const promoLevels = buildPromoLevelCandidates(stateLevel, input.targetLevel)
      for (const promoLevel of promoLevels) {
        const growthFactor = factorRange(factorPrefixArr, stateLevel, promoLevel)
        tempPanelBase.fill(0)
        addVec6Into(tempPanelBase, baseVec)
        addVec6Into(tempPanelBase, jobPanelVec[stateJobIndex])
        tempBeforeGrowth.fill(0)
        addVec6Into(tempBeforeGrowth, tempStateGrowth)
        addMulVec6Into(tempBeforeGrowth, charGrowthVec, growthFactor)
        addMulVec6Into(tempBeforeGrowth, jobGrowthVec[stateJobIndex], growthFactor)
        addVec6Into(tempPanelBase, tempBeforeGrowth)

        for (let targetJobIndex = 0; targetJobIndex < input.jobs.length; targetJobIndex += 1) {
          const target = input.jobs[targetJobIndex]
          if (targetJobIndex === stateJobIndex) continue
          if ((stateMask & (BigInt(1) << BigInt(targetJobIndex))) !== BigInt(0)) continue
          if (target.tier === 0) continue
          if (target.tier - job.tier > search.maxTierDelta) continue
          if (job.tier - target.tier > 1) continue

          if (stateTransfer === 0 && firstStepAllowed && !firstStepAllowed.has(target.id)) continue
          // P2: 当前等级转职可行域上界剪枝
          addVec6From(tempCheck, tempPanelBase, maxStepEquipSkillVec)
          if (!geVec6(tempCheck, jobRequireVec[targetJobIndex])) continue
          // F1: 转职前可达性硬门禁（终态上界）
          if (targetFinalRequireVec) {
            tempAfterPromoGrowth.fill(0)
            addVec6Into(tempAfterPromoGrowth, tempBeforeGrowth)
            addMulVec6Into(tempAfterPromoGrowth, charGrowthVec, levelFactor(promoLevel))
            addMulVec6Into(tempAfterPromoGrowth, jobGrowthVec[targetJobIndex], levelFactor(promoLevel))
            const remainAfterPromo = factorRange(factorPrefixArr, promoLevel + 1, input.targetLevel)
            tempFinalReachUpper.fill(0)
            addVec6Into(tempFinalReachUpper, baseVec)
            addVec6Into(tempFinalReachUpper, maxJobPanelVec)
            addVec6Into(tempFinalReachUpper, tempAfterPromoGrowth)
            addMulVec6Into(tempFinalReachUpper, charGrowthVec, remainAfterPromo)
            addMulVec6Into(tempFinalReachUpper, maxJobGrowthVec, remainAfterPromo)
            addVec6Into(tempFinalReachUpper, finalEquipVec)
            addVec6Into(tempFinalReachUpper, finalSkillVec)
            if (!geVec6(tempFinalReachUpper, targetFinalRequireVec)) continue
          }
          let passFlags: Uint8Array | null = null
          if (runtime?.wasmCore && comboCount >= 256) {
            for (let k = 0; k < 6; k += 1) reusableComboPanel[k] = tempPanelBase[k]
            for (let k = 0; k < 6; k += 1) reusableComboReq[k] = jobRequireVec[targetJobIndex][k]
            passFlags = runtime.wasmCore.comboPassFlags(
              reusableComboPanel,
              equipFlat,
              equipVecByLoadout.length,
              skillFlat,
              skillVecByLoadout.length,
              reusableComboReq,
            )
          }
          const comboOrder = enableComboPriorityOrder
            ? buildComboOrderForJob(targetJobIndex)
            : defaultComboOrder
          const comboTryLimit = enableComboPriorityOrder
            ? Math.max(32, Math.min(comboOrder.length, Math.floor(search.beamWidth / 2)))
            : comboOrder.length
          // P3: 组合枚举去重。对同一(state, promoLevel, targetJob)仅保留首个可行组合；
          // 组合不影响成长状态，仅影响该步可行性记录，保留一个即可。
          const perTargetJobCap = 1
          let comboAccepted = 0
          const comboStart = Date.now()
          for (let orderIdx = 0; orderIdx < comboOrder.length; orderIdx += 1) {
            if (orderIdx >= comboTryLimit && comboAccepted > 0) break
            if (comboAccepted >= perTargetJobCap) break
            totalComboTried += 1
            const flatIdx = comboOrder[orderIdx]
            const equipIdx = Math.floor(flatIdx / skillLoadoutCount)
            const skillIdx = flatIdx % skillLoadoutCount
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
            comboAccepted += 1
            totalComboPassed += 1
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
                stepDetail: buildStepDetail(),
              })
            }
            if (yieldEvery > 0 && opCounter % yieldEvery === 0) await yieldNow()
          }
          const comboCost = Date.now() - comboStart
          totalComboCheckMs += comboCost
        }
      }
    }
    totalPromoEnumMs += Date.now() - promoEnumStart

    const candidates: number[] = []
    for (const bucket of groups.values()) candidates.push(...bucket.states)
    const scoreCache = new Map<number, number>()
    const scoreRankStart = Date.now()
    const scoreMode =
      search.scorePreset === 'str_first' ? 1 : search.scorePreset === 'agi_first' ? 2 : search.scorePreset === 'balanced' ? 3 : search.scoreWeights ? 4 : 0
    if (runtime?.wasmCore && candidates.length > 0) {
      ensureScoreBuffer(candidates.length)
      for (let i = 0; i < candidates.length; i += 1) {
        const index = candidates[i]
        tempScore.fill(0)
        addVec6Into(tempScore, baseVec)
        addVec6Into(tempScore, jobPanelVec[pool.jobIndexes[index]])
        pool.appendGrowthTo(index, tempScore)
        const b = i * 6
        for (let k = 0; k < 6; k += 1) reusableScoreStats[b + k] = tempScore[k]
      }
      const w: [number, number, number, number, number, number] = [
        search.scoreWeights?.str ?? 1,
        search.scoreWeights?.tec ?? 1,
        search.scoreWeights?.agi ?? 1,
        search.scoreWeights?.con ?? 1,
        search.scoreWeights?.per ?? 1,
        search.scoreWeights?.wil ?? 1,
      ]
      const scores = runtime.wasmCore.scoreBatch(reusableScoreStats, candidates.length, scoreMode, w)
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
    // P4: 等价类压缩，按(job, transfer, lastPromo, growth sig)保留每组最优候选
    const deduped = new Map<string, number>()
    for (const candidate of candidates) {
      pool.fillGrowth(candidate, tempScore)
      const key = `${pool.jobIndexes[candidate]}:${pool.transferCounts[candidate]}:${pool.lastPromoLevels[candidate]}:${quantSig(tempScore)}`
      const prev = deduped.get(key)
      if (prev === undefined || scoreOfCandidate(candidate) > scoreOfCandidate(prev)) deduped.set(key, candidate)
    }
    const dedupedCandidates = [...deduped.values()]

    // P3: 多目标排序（可达性余量 > 综合分 > 资源消耗）
    const marginCache = new Map<number, number>()
    const marginOfCandidate = (index: number): number => {
      const hit = marginCache.get(index)
      if (hit !== undefined) return hit
      if (!targetFinalRequireVec) return Number.POSITIVE_INFINITY
      tempCheck.fill(0)
      addVec6Into(tempCheck, baseVec)
      addVec6Into(tempCheck, jobPanelVec[pool.jobIndexes[index]])
      pool.appendGrowthTo(index, tempCheck)
      addVec6Into(tempCheck, finalEquipVec)
      addVec6Into(tempCheck, finalSkillVec)
      let margin = Number.POSITIVE_INFINITY
      for (let k = 0; k < 6; k += 1) margin = Math.min(margin, tempCheck[k] - targetFinalRequireVec[k])
      marginCache.set(index, margin)
      return margin
    }
    dedupedCandidates.sort((a, b) => {
      const ma = marginOfCandidate(a)
      const mb = marginOfCandidate(b)
      const fa = ma >= 0 ? 1 : 0
      const fb = mb >= 0 ? 1 : 0
      if (fa !== fb) return fb - fa
      if (mb !== ma) return mb - ma
      const sa = scoreOfCandidate(a)
      const sb = scoreOfCandidate(b)
      if (sb !== sa) return sb - sa
      return pool.transferCounts[a] - pool.transferCounts[b]
    })
    // S4: 按 transferStep 动态收缩 Beam（前宽后窄）
    const stepRatio = search.maxTransfer > 0 ? transferStep / search.maxTransfer : 0
    const beamCap = enableDynamicBeamShrink
      ? Math.max(24, Math.floor(search.beamWidth * (1 - 0.4 * stepRatio)))
      : search.beamWidth
    // S4: 低潜力候选截断（基于 margin 分位）
    let screenedCandidates = dedupedCandidates
    if (enableMarginScreen && targetFinalRequireVec && dedupedCandidates.length > 96) {
      const marginValues = dedupedCandidates.map((index) => marginOfCandidate(index)).sort((a, b) => a - b)
      const cutoffIndex = Math.max(0, Math.floor(marginValues.length * 0.25))
      const cutoff = marginValues[cutoffIndex]
      const filtered = dedupedCandidates.filter((index) => marginOfCandidate(index) >= cutoff)
      if (filtered.length >= 64) screenedCandidates = filtered
    }
    // N1: 分层 Beam 预算（transfer/tier/routeHash band）
    const layerKeyOfCandidate = (index: number): string => {
      const transfer = pool.transferCounts[index]
      const tier = input.jobs[pool.jobIndexes[index]].tier
      const routeBand = pool.routeHashes[index] & 31
      return `${transfer}:${tier}:${routeBand}`
    }
    const layerBuckets = new Map<string, number[]>()
    for (const candidate of screenedCandidates) {
      const key = layerKeyOfCandidate(candidate)
      const arr = layerBuckets.get(key) ?? []
      arr.push(candidate)
      layerBuckets.set(key, arr)
    }
    const layerCount = Math.max(1, layerBuckets.size)
    const layerBudgetBase = Math.max(1, Math.floor(beamCap / layerCount))
    const layerBudgetRemainder = beamCap % layerCount
    const layerCap = new Map<string, number>()
    let layerSeq = 0
    for (const key of layerBuckets.keys()) {
      const extra = layerSeq < layerBudgetRemainder ? 1 : 0
      layerCap.set(key, layerBudgetBase + extra)
      layerSeq += 1
    }
    const layerPicked = new Map<string, number>()
    // 多样性约束：限制同 major bucket 过度占用
    const beamNext: number[] = []
    const majorCount = new Map<string, number>()
    const perMajorCap = Math.max(2, Math.ceil(beamCap / 8))
    for (const candidate of screenedCandidates) {
      if (beamNext.length >= beamCap) break
      const layerKey = layerKeyOfCandidate(candidate)
      const used = layerPicked.get(layerKey) ?? 0
      const cap = layerCap.get(layerKey) ?? 1
      if (used >= cap) continue
      pool.fillGrowth(candidate, tempScore)
      const major = majorBucket(tempScore)
      const cnt = majorCount.get(major) ?? 0
      if (cnt >= perMajorCap) continue
      majorCount.set(major, cnt + 1)
      beamNext.push(candidate)
      layerPicked.set(layerKey, used + 1)
    }
    if (beamNext.length < beamCap) {
      for (const candidate of screenedCandidates) {
        if (beamNext.length >= beamCap) break
        if (beamNext.includes(candidate)) continue
        const layerKey = layerKeyOfCandidate(candidate)
        const used = layerPicked.get(layerKey) ?? 0
        const cap = (layerCap.get(layerKey) ?? 1) * 2
        if (used >= cap) continue
        beamNext.push(candidate)
        layerPicked.set(layerKey, used + 1)
      }
    }
    beam = beamNext
    const scoreRankCost = Date.now() - scoreRankStart
    totalScoreRankMs += scoreRankCost
    totalRouteChecks += routeChecks
    totalGroupChecks += groupChecks
    if (pool.size > search.beamWidth * 40) {
      const compacted = compactStatePool(pool, beam, vec6)
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
      candidateSize: dedupedCandidates.length,
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
      stepDetail: buildStepDetail(),
    })
  }

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

  return {
    topPlans,
    exploredStates,
    prunedByDominance,
    perfBreakdown: {
      promoEnumMs: totalPromoEnumMs,
      comboCheckMs: totalComboCheckMs,
      routePruneMs: totalRoutePruneMs,
      groupPruneMs: totalGroupPruneMs,
      scoreRankMs: totalScoreRankMs,
      comboTried: totalComboTried,
      comboPassed: totalComboPassed,
      routeChecks: totalRouteChecks,
      groupChecks: totalGroupChecks,
    },
  }
}
