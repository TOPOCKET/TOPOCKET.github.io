/**
 * @file search-combinations
 * @description 诸神搜索引擎的装备、技能与转职等级候选枚举。
 */
import type { EquipDef } from '@/domains/zhushen/model/zhushen-model'

/**
 * 枚举最多选取指定数量元素的组合。
 * @param arr 候选数组。
 * @param maxPick 最大选择数量。
 * @returns 组合列表。
 */
export const combinations = <T,>(arr: T[], maxPick: number): T[][] => {
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

/**
 * 按装备槽位枚举可行装备组合。
 * @param equips 装备定义列表。
 * @returns 装备 id 组合列表。
 */
export const buildEquipLoadouts = (equips: EquipDef[]): string[][] => {
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

/**
 * 构建转职等级候选集合。
 * @param stateLevel 当前状态等级。
 * @param targetLevel 目标等级。
 * @returns 转职等级候选。
 */
export const buildPromoLevelCandidates = (stateLevel: number, targetLevel: number): number[] => {
  const lastLevel = targetLevel - 1
  if (stateLevel > lastLevel) return []
  const span = lastLevel - stateLevel + 1
  if (span <= 6) {
    const full: number[] = []
    for (let level = stateLevel; level <= lastLevel; level += 1) full.push(level)
    return full
  }
  const set = new Set<number>([stateLevel, lastLevel])
  for (const offset of [1, 2, 3]) {
    const level = stateLevel + offset
    if (level <= lastLevel) set.add(level)
  }
  const mid = stateLevel + Math.floor(span / 2)
  if (mid >= stateLevel && mid <= lastLevel) set.add(mid)
  for (let level = Math.max(stateLevel, lastLevel - 2); level <= lastLevel; level += 1) set.add(level)
  return [...set].sort((a, b) => a - b)
}
