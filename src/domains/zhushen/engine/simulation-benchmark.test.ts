import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { searchZhushenPlans } from './simulator-core'
import type { SimulationInput } from '@/domains/zhushen/model/zhushen-model'

const vec = (v: number) => ({ str: v, tec: v, agi: v, con: v, per: v, wil: v })

const buildInput = (targetLevel: number, beamWidth: number, maxTransfer: number): SimulationInput => ({
  targetLevel,
  initialJobId: 'novice',
  character: { base: vec(0), trait: vec(0), growth: vec(2) },
  jobs: [
    { id: 'novice', name: 'Novice', tier: 0, panel: vec(1), growth: vec(1), require: vec(0) },
    { id: 'fighter', name: 'Fighter', tier: 1, panel: vec(2), growth: vec(2), require: vec(10) },
    { id: 'knight', name: 'Knight', tier: 2, panel: vec(3), growth: vec(3), require: vec(20) },
    { id: 'champion', name: 'Champion', tier: 3, panel: vec(4), growth: vec(4), require: vec(35) },
  ],
  equips: [
    { id: 'e1', name: 'e1', slot: 'main_hand', stat: vec(2) },
    { id: 'e2', name: 'e2', slot: 'armor', stat: vec(2) },
    { id: 'e3', name: 'e3', slot: 'shoes', stat: vec(1) },
  ],
  skills: [
    { id: 's1', name: 's1', category: 'str', stat: vec(1) },
    { id: 's2', name: 's2', category: 'agi', stat: vec(1) },
  ],
  traits: [],
  activeEquipIds: [],
  activeSkillIds: [],
  activeTraitIds: [],
  promotions: [],
  search: {
    enabled: true,
    beamWidth,
    maxTransfer,
    maxTierDelta: 2,
    maxSkillPerStep: 2,
    scorePreset: 'sum',
    finalActiveEquipIds: ['e1', 'e2'],
    finalActiveSkillIds: ['s1'],
    targetFinalJobId: 'champion',
  },
})

describe('zhushen benchmark dataset', () => {
  it('generates benchmark report for small/medium/large datasets', async () => {
    const root = process.cwd()
    const datasetPath = path.join(root, 'scripts', 'benchmarks', 'zhushen-benchmark-dataset.json')
    const reportPath = path.join(root, 'scripts', 'benchmarks', 'zhushen-benchmark-report.json')
    const raw = JSON.parse(fs.readFileSync(datasetPath, 'utf8')) as {
      datasets: Array<{ id: string; targetLevel: number; beamWidth: number; maxTransfer: number }>
    }

    const report = []
    for (const item of raw.datasets) {
      const input = buildInput(item.targetLevel, item.beamWidth, item.maxTransfer)
      const start = performance.now()
      const result = await searchZhushenPlans(input)
      const durationMs = Number((performance.now() - start).toFixed(2))
      const prunedRatio = result.exploredStates > 0 ? Number((result.prunedByDominance / result.exploredStates).toFixed(4)) : 0
      report.push({
        id: item.id,
        targetLevel: item.targetLevel,
        beamWidth: item.beamWidth,
        maxTransfer: item.maxTransfer,
        exploredStates: result.exploredStates,
        prunedByDominance: result.prunedByDominance,
        prunedRatio,
        durationMs,
        bestScore: result.topPlans[0]?.score ?? null,
      })
      expect(result.exploredStates).toBeGreaterThan(0)
    }
    fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)}\n`, 'utf8')
    expect(fs.existsSync(reportPath)).toBe(true)
  })
})
