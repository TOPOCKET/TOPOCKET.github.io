/**
 * @file simulation-runner
 * @description 诸神皇冠手动培养路线的逐级模拟执行。
 */
import { addVec, type SimulationInput, type SimulationResult } from '@/domains/zhushen/model/zhushen-model'
import {
  addMany,
  levelFactor,
  MIN_LEVEL,
  mulVec,
  sumStatsByIds,
  toFixed4Vec,
  validateSingleEquipPerSlot,
  validateSkillCount,
  validateTraitSlots,
  vecGE,
} from './simulation-helpers'

/**
 * 执行诸神皇冠培养路线模拟。
 * @param input 业务输入对象，包含角色、职业、装备、技能、特性与转职路径。
 * @returns 最终面板、成长累计、当前职业与转职日志。
 * @throws 当输入引用不存在、装备/技能槽位不合法或转职条件不满足时抛出异常。
 */
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
  let growthAcc = addMany([])
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
