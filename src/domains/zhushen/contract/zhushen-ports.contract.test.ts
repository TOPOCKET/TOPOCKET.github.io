import { describe, expect, it } from 'vitest'
import { runZhushenSimulation, setZhushenSimulationPort, resetZhushenSimulationPort } from '@/domains/zhushen/engine/simulation'
import { zhushenSearchOrchestratorFactory } from '@/domains/zhushen/orchestrator/search-orchestrator'
import type { SimulationInput } from '@/domains/zhushen/model/zhushen-model'

const input: SimulationInput = {
  targetLevel: 2,
  initialJobId: 'novice',
  character: {
    base: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
    trait: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
    growth: { str: 1, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
  },
  jobs: [{ id: 'novice', name: 'Novice', tier: 0, panel: { str: 1, tec: 0, agi: 0, con: 0, per: 0, wil: 0 }, growth: { str: 1, tec: 0, agi: 0, con: 0, per: 0, wil: 0 }, require: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 } }],
  equips: [],
  skills: [],
  traits: [],
  activeEquipIds: [],
  activeSkillIds: [],
  activeTraitIds: [],
  promotions: [],
  ignorePromotionRequirements: false,
}

describe('domains/zhushen ports contract', () => {
  it('supports simulation port injection/reset contract', () => {
    setZhushenSimulationPort({
      runSimulation: () => ({
        final: { str: 99, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
        growthAcc: { str: 0, tec: 0, agi: 0, con: 0, per: 0, wil: 0 },
        currentJob: input.jobs[0],
        logs: ['stub'],
      }),
    })
    const stubbed = runZhushenSimulation(input)
    expect(stubbed.final.str).toBe(99)
    resetZhushenSimulationPort()
    const restored = runZhushenSimulation(input)
    expect(restored.final.str).not.toBe(99)
  })

  it('provides orchestrator factory contract', () => {
    const orchestrator = zhushenSearchOrchestratorFactory.create({ onProgress: () => {} })
    expect(typeof orchestrator.run).toBe('function')
    expect(typeof orchestrator.dispose).toBe('function')
    orchestrator.dispose()
  })
})
