import { describe, expect, it } from 'vitest'
import { runZhushenSimulation } from './simulation'
import type { SimulationInput } from '@/domains/zhushen/model/zhushen-model'

const vec = (value: number) => ({ str: value, tec: 0, agi: 0, con: 0, per: 0, wil: 0 })

const baseInput = (): SimulationInput => ({
  targetLevel: 3,
  initialJobId: 'novice',
  character: {
    base: vec(0),
    trait: vec(0),
    growth: vec(1),
  },
  jobs: [
    { id: 'novice', name: 'Novice', tier: 0, panel: vec(10), growth: vec(1), require: vec(0) },
    { id: 'warrior', name: 'Warrior', tier: 1, panel: vec(20), growth: vec(2), require: vec(20) },
  ],
  equips: [],
  skills: [],
  traits: [],
  activeEquipIds: [],
  activeSkillIds: [],
  activeTraitIds: [],
  promotions: [],
  ignorePromotionRequirements: false,
})

describe('domains/zhushen/engine/simulation', () => {
  it('computes stable final stat without promotions', () => {
    const result = runZhushenSimulation(baseInput())
    expect(result.currentJob.id).toBe('novice')
    expect(result.growthAcc.str).toBe(4)
    expect(result.final.str).toBe(14)
    expect(result.logs).toEqual([])
  })

  it('throws when promotion requirement is not met', () => {
    const input = baseInput()
    input.promotions = [{ level: 1, toJobId: 'warrior', equipIds: [], skillIds: [] }]
    expect(() => runZhushenSimulation(input)).toThrow(/promotion failed/i)
  })

  it('allows promotion when ignorePromotionRequirements is enabled', () => {
    const input = baseInput()
    input.promotions = [{ level: 1, toJobId: 'warrior', equipIds: [], skillIds: [] }]
    input.ignorePromotionRequirements = true
    const result = runZhushenSimulation(input)
    expect(result.currentJob.id).toBe('warrior')
    expect(result.logs.length).toBeGreaterThan(0)
  })
})
