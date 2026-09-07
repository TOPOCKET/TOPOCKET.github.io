/**
 * @file simulation-helpers
 * @description 诸神模拟与搜索共用的向量、校验与等级系数工具。
 */
import {
  ATTR_KEYS,
  addVec,
  zeroVec,
  type AttrVector,
  type EquipDef,
  type TraitDef,
} from '@/domains/zhushen/model/zhushen-model'

export const MIN_LEVEL = 1
export const MAX_LEVEL = 150

const SCALE = 10000

/**
 * 按四位小数舍入数值。
 * @param value 待舍入数值。
 * @returns 四位小数数值。
 */
export const round4 = (value: number): number => Math.round((value + Number.EPSILON) * SCALE) / SCALE

/**
 * 属性向量按倍率缩放。
 * @param a 属性向量。
 * @param m 倍率。
 * @returns 缩放后的属性向量。
 */
export const mulVec = (a: AttrVector, m: number): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = round4(a[key] * m)
  return out
}

/**
 * 累加多个属性向量。
 * @param vectors 属性向量列表。
 * @returns 累加后的属性向量。
 */
export const addMany = (vectors: AttrVector[]): AttrVector => vectors.reduce((acc, it) => addVec(acc, it), zeroVec())

/**
 * 判断向量是否逐项大于等于目标。
 * @param a 被检查向量。
 * @param b 目标向量。
 * @returns 是否满足逐项大于等于。
 */
export const vecGE = (a: AttrVector, b: AttrVector): boolean => ATTR_KEYS.every((key) => a[key] >= b[key])

/**
 * 将属性向量规整到四位小数。
 * @param v 属性向量。
 * @returns 四位小数属性向量。
 */
export const toFixed4Vec = (v: AttrVector): AttrVector => {
  const out = zeroVec()
  for (const key of ATTR_KEYS) out[key] = Number(v[key].toFixed(4))
  return out
}

/**
 * 校验装备选择是否存在并满足单槽位约束。
 * @param allEquips 装备全集。
 * @param equipIds 待校验装备 id 列表。
 * @param context 错误上下文。
 * @returns {void}
 * @throws 当装备不存在或槽位冲突时抛出异常。
 */
export const validateSingleEquipPerSlot = (allEquips: EquipDef[], equipIds: string[], context: string): void => {
  const map = new Map(allEquips.map((item) => [item.id, item]))
  const used = new Set<EquipDef['slot']>()
  for (const equipId of equipIds) {
    const equip = map.get(equipId)
    if (!equip) throw new Error(`equip not found in ${context}: ${equipId}`)
    if (used.has(equip.slot)) throw new Error(`equip slot conflict in ${context}: ${equip.slot}`)
    used.add(equip.slot)
  }
}

/**
 * 校验特性选择是否存在并满足槽位约束。
 * @param allTraits 特性全集。
 * @param traitIds 待校验特性 id 列表。
 * @param context 错误上下文。
 * @returns {void}
 * @throws 当特性不存在或槽位冲突时抛出异常。
 */
export const validateTraitSlots = (allTraits: TraitDef[], traitIds: string[], context: string): void => {
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

/**
 * 校验技能数量上限。
 * @param skillIds 技能 id 列表。
 * @param context 错误上下文。
 * @returns {void}
 * @throws 当技能数量超过 3 个时抛出异常。
 */
export const validateSkillCount = (skillIds: string[], context: string): void => {
  if (skillIds.length > 3) throw new Error(`skill count overflow in ${context}: max 3`)
}

/**
 * 按 id 汇总带 stat 字段的数据。
 * @param source 数据源。
 * @param ids 待汇总 id 列表。
 * @param label 错误标签。
 * @returns 汇总后的属性向量。
 * @throws 当 id 不存在时抛出异常。
 */
export const sumStatsByIds = <T extends { id: string; stat: AttrVector }>(source: T[], ids: string[], label: string): AttrVector => {
  const map = new Map(source.map((item) => [item.id, item]))
  return addMany(
    ids.map((id) => {
      const item = map.get(id)
      if (!item) throw new Error(`${label} not found: ${id}`)
      return item.stat
    }),
  )
}

/**
 * 计算指定等级的成长系数。
 * @param level 等级。
 * @returns 成长系数。
 */
export const levelFactor = (level: number): number => (level > 60 ? 0.35 : 1)
