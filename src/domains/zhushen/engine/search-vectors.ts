/**
 * @file search-vectors
 * @description 诸神搜索引擎使用的 Vec6 运算、评分和等级系数前缀表。
 */
import type { AttrVector, ScorePreset } from '@/domains/zhushen/model/zhushen-model'
import type { Vec6 } from '@/domains/zhushen/state-pool/soa-state-pool'
import { levelFactor, round4 } from './simulation-helpers'

/**
 * 创建空 Vec6。
 * @returns 空属性向量。
 */
export const vec6 = (): Vec6 => new Float32Array(6)

/**
 * 将属性对象转为 Vec6。
 * @param v 属性对象。
 * @returns Vec6 属性向量。
 */
export const vec6FromAttr = (v: AttrVector): Vec6 => new Float32Array([v.str, v.tec, v.agi, v.con, v.per, v.wil])

/**
 * 将 Vec6 转回属性对象。
 * @param v Vec6 属性向量。
 * @returns 属性对象。
 */
export const attrFromVec6 = (v: Vec6): AttrVector => ({ str: round4(v[0]), tec: round4(v[1]), agi: round4(v[2]), con: round4(v[3]), per: round4(v[4]), wil: round4(v[5]) })

/**
 * 将向量累加到输出向量。
 * @param out 输出向量。
 * @param a 待累加向量。
 * @returns {void}
 */
export const addVec6Into = (out: Vec6, a: Vec6): void => {
  for (let i = 0; i < 6; i += 1) out[i] += a[i]
}

/**
 * 将向量乘倍率后累加到输出向量。
 * @param out 输出向量。
 * @param a 待累加向量。
 * @param m 倍率。
 * @returns {void}
 */
export const addMulVec6Into = (out: Vec6, a: Vec6, m: number): void => {
  for (let i = 0; i < 6; i += 1) out[i] += a[i] * m
}

/**
 * 将两个向量相加写入输出向量。
 * @param out 输出向量。
 * @param a 左向量。
 * @param b 右向量。
 * @returns {void}
 */
export const addVec6From = (out: Vec6, a: Vec6, b: Vec6): void => {
  for (let i = 0; i < 6; i += 1) out[i] = a[i] + b[i]
}

/**
 * 判断 Vec6 是否逐项大于等于目标。
 * @param a 被检查向量。
 * @param b 目标向量。
 * @returns 是否满足逐项大于等于。
 */
export const geVec6 = (a: Vec6, b: Vec6): boolean => {
  for (let i = 0; i < 6; i += 1) if (a[i] < b[i]) return false
  return true
}

/**
 * 判断 Vec6 是否严格支配另一个 Vec6。
 * @param a 候选支配向量。
 * @param b 被支配向量。
 * @returns 是否存在逐项不劣且至少一项更优。
 */
export const dominatesVec6 = (a: Vec6, b: Vec6): boolean => {
  let strictly = false
  for (let i = 0; i < 6; i += 1) {
    if (a[i] < b[i]) return false
    if (a[i] > b[i]) strictly = true
  }
  return strictly
}

/**
 * 按评分预设计算 Vec6 分数。
 * @param v 属性向量。
 * @param preset 评分预设。
 * @param custom 可选自定义权重。
 * @returns 评分值。
 */
export const scoreVec6 = (v: Vec6, preset: ScorePreset, custom?: Partial<AttrVector>): number => {
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

/**
 * 构建等级成长系数前缀表。
 * @param targetLevel 目标等级。
 * @returns 等级系数前缀表。
 */
export const factorPrefix = (targetLevel: number): Float32Array => {
  const prefix = new Float32Array(targetLevel + 1)
  for (let level = 1; level < targetLevel; level += 1) prefix[level + 1] = prefix[level] + levelFactor(level)
  return prefix
}

/**
 * 读取等级区间成长系数和。
 * @param prefix 等级系数前缀表。
 * @param fromLevel 起始等级。
 * @param toLevel 结束等级。
 * @returns 区间成长系数和。
 */
export const factorRange = (prefix: Float32Array, fromLevel: number, toLevel: number): number => {
  if (toLevel <= fromLevel) return 0
  return prefix[toLevel] - prefix[fromLevel]
}
