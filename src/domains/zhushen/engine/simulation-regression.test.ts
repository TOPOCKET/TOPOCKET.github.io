import { describe, expect, it } from 'vitest'
import { runZhushenSimulation } from './simulation'
import type { SimulationInput } from '@/domains/zhushen/model/zhushen-model'
import { searchZhushenPlans } from './simulator-core'

const vec = (value: number) => ({ str: value, tec: value, agi: value, con: value, per: value, wil: value })

const makeInput = (growth: number, targetLevel = 6): SimulationInput => ({
  targetLevel,
  initialJobId: 'novice',
  character: {
    base: vec(0),
    trait: vec(0),
    growth: vec(growth),
  },
  jobs: [{ id: 'novice', name: 'Novice', tier: 0, panel: vec(10), growth: vec(1), require: vec(0) }],
  equips: [],
  skills: [],
  traits: [],
  activeEquipIds: [],
  activeSkillIds: [],
  activeTraitIds: [],
  promotions: [],
  ignorePromotionRequirements: false,
})

describe('domains/zhushen/engine simulation regression', () => {
  it('property: higher character growth yields no lower final attributes', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const low = runZhushenSimulation(makeInput(seed + 1))
      const high = runZhushenSimulation(makeInput(seed + 2))
      expect(high.final.str).toBeGreaterThanOrEqual(low.final.str)
      expect(high.final.tec).toBeGreaterThanOrEqual(low.final.tec)
      expect(high.final.agi).toBeGreaterThanOrEqual(low.final.agi)
      expect(high.final.con).toBeGreaterThanOrEqual(low.final.con)
      expect(high.final.per).toBeGreaterThanOrEqual(low.final.per)
      expect(high.final.wil).toBeGreaterThanOrEqual(low.final.wil)
    }
  })

  it('golden dataset: stable outputs for representative inputs', () => {
    const dataset = [
      { id: 'g1', input: makeInput(1, 4), expectedFinalStr: 16, expectedGrowthStr: 6 },
      { id: 'g2', input: makeInput(2, 5), expectedFinalStr: 22, expectedGrowthStr: 12 },
      { id: 'g3', input: makeInput(3, 6), expectedFinalStr: 30, expectedGrowthStr: 20 },
    ]

    for (const sample of dataset) {
      const result = runZhushenSimulation(sample.input)
      expect(result.final.str, sample.id).toBe(sample.expectedFinalStr)
      expect(result.growthAcc.str, sample.id).toBe(sample.expectedGrowthStr)
    }
  })

  it('search pruning keeps semantics for impossible/possible target final job', async () => {
    const jobs = [
      { id: 'novice', name: 'Novice', tier: 0, panel: vec(1), growth: vec(1), require: vec(0) },
      { id: 'elite', name: 'Elite', tier: 1, panel: vec(3), growth: vec(2), require: vec(9999) },
    ]
    const impossible = await searchZhushenPlans({
      ...makeInput(1, 5),
      jobs,
      search: {
        enabled: true,
        beamWidth: 32,
        maxTransfer: 2,
        maxTierDelta: 2,
        maxSkillPerStep: 1,
        scorePreset: 'sum',
        finalActiveEquipIds: [],
        finalActiveSkillIds: [],
        targetFinalJobId: 'elite',
      },
    })
    expect(impossible.topPlans.length).toBe(0)

    const possible = await searchZhushenPlans({
      ...makeInput(1, 5),
      jobs: [{ ...jobs[0] }],
      search: {
        enabled: true,
        beamWidth: 32,
        maxTransfer: 1,
        maxTierDelta: 1,
        maxSkillPerStep: 1,
        scorePreset: 'sum',
        finalActiveEquipIds: [],
        finalActiveSkillIds: [],
        targetFinalJobId: 'novice',
      },
    })
    expect(possible.topPlans.length).toBeGreaterThan(0)
  })
})
