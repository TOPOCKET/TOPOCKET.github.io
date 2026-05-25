/**
 * @file search-pruning 文件说明。
 * @description 诸神搜索的剪枝辅助函数。
 */
import type { AttrVector, PromotionStep, SearchPlan } from '@/domains/zhushen/model/zhushen-model'

/**
 * 将六维向量量化为细粒度桶签名。
 * @param v 六维向量。
 * @returns 量化签名。
 */
export const quantSig = (v: Float32Array): string => {
  const q = 0.25
  return `${Math.floor(v[0] / q)}|${Math.floor(v[1] / q)}|${Math.floor(v[2] / q)}|${Math.floor(v[3] / q)}|${Math.floor(v[4] / q)}|${Math.floor(v[5] / q)}`
}

/**
 * 将六维向量量化为主桶签名。
 * @param v 六维向量。
 * @returns 主桶签名。
 */
export const majorBucket = (v: Float32Array): string => {
  const q = 2
  return `${Math.floor(v[0] / q)}|${Math.floor(v[2] / q)}|${Math.floor(v[3] / q)}`
}

/**
 * 生成下一跳路线哈希。
 * @param parentHash 父哈希。
 * @param promoJobIndex 目标职业索引。
 * @returns 新哈希值。
 */
export const routeHashNext = (parentHash: number, promoJobIndex: number): number => ((parentHash * 1315423911) ^ (promoJobIndex + 1)) >>> 0

const vecDominatesOrEqual = (a: AttrVector, b: AttrVector): boolean =>
  a.str >= b.str && a.tec >= b.tec && a.agi >= b.agi && a.con >= b.con && a.per >= b.per && a.wil >= b.wil

const routeKey = (promotions: PromotionStep[]): string => promotions.map((p) => p.toJobId).join('>')

const levelsNoLater = (a: PromotionStep[], b: PromotionStep[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i].level > b[i].level) return false
  return true
}

/**
 * 过滤“同路线且更晚且不优”方案。
 * @param plans 候选方案。
 * @returns 去除时序支配后的方案列表。
 */
export const filterDominatedByTiming = (plans: SearchPlan[]): SearchPlan[] => {
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
