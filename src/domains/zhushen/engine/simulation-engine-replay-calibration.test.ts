import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { builtinZhushenEquips, builtinZhushenJobs, builtinZhushenSkills, builtinZhushenTraits } from '@/data/zhushen'
import type { SearchEngineType, SearchResult, SimulationInput } from '@/domains/zhushen/model/zhushen-model'
import { zhushenSimulationInputSchema } from '@/domains/zhushen/model/zhushen-model'
import { searchZhushenPlansByEngine } from './search-engine'

interface ReplayInputSnapshot {
  id: string
  description: string
  input: Omit<SimulationInput, 'jobs' | 'equips' | 'skills' | 'traits'>
}

const BEAM_BASELINE_20260528 = {
  medianMs: 119959.48,
  roundsMs: [120197.55, 119959.48, 117844.69],
  exploredStates: 28135083,
  bestScore: 2646.422,
  routeSignature: '4:priest|147:magic-archer|149:royal-knight',
}

const routeSignature = (result: SearchResult): string => {
  const plan = result.topPlans[0]
  if (!plan) return ''
  return plan.promotions.map((p) => `${p.level}:${p.toJobId}`).join('|')
}

const runEngineMedian = async (
  input: SimulationInput,
  engine: SearchEngineType,
  rounds: number,
): Promise<{ roundsMs: number[]; medianMs: number; result: SearchResult; step3Detail: unknown | null }> => {
  const roundsMs: number[] = []
  let lastResult: SearchResult | null = null
  let lastStep3Detail: unknown | null = null
  for (let i = 0; i < rounds; i += 1) {
    const start = performance.now()
    let lastLogAt = 0
    const result = await searchZhushenPlansByEngine(
      {
        ...input,
        search: {
          ...input.search!,
          engine,
        },
      },
      (progress) => {
        const now = Date.now()
        if (now - lastLogAt < 10000) return
        lastLogAt = now
        console.log(
          `[engine-replay] engine=${engine} round=${i + 1}/${rounds} ` +
            `step=${progress.step}/${progress.totalSteps} explored=${progress.exploredStates} ` +
            `route=${progress.routePrunes}/${progress.routeChecks} group=${progress.groupPrunes}/${progress.groupChecks} stepMs=${progress.stepMs}`,
        )
      },
      { yieldEvery: 200000 },
    )
    roundsMs.push(Number((performance.now() - start).toFixed(2)))
    lastResult = result
  }
  if (!lastResult) throw new Error(`missing result for engine=${engine}`)
  const sorted = [...roundsMs].sort((a, b) => a - b)
  const medianMs = sorted[Math.floor(sorted.length / 2)]
  return { roundsMs, medianMs: Number(medianMs.toFixed(2)), result: lastResult, step3Detail: lastStep3Detail }
}

describe('zhushen live replay engine calibration', () => {
  it(
    'compares beam / astar_bnb_mvp on real replay snapshot with median rounds',
    async () => {
      const root = process.cwd()
      const snapshotPath = path.join(root, 'scripts', 'benchmarks', 'zhushen-live-replay-input.json')
      const reportPath = path.join(root, 'scripts', 'benchmarks', 'zhushen-engine-replay-calibration-report.json')
      const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as ReplayInputSnapshot
      const rounds = Math.max(1, Number(process.env.ZHUSHEN_ENGINE_REPLAY_ROUNDS ?? 3))

      const input = zhushenSimulationInputSchema.parse({
        ...raw.input,
        jobs: builtinZhushenJobs,
        equips: builtinZhushenEquips,
        skills: builtinZhushenSkills,
        traits: builtinZhushenTraits,
      })

      const astar = await runEngineMedian(input, 'astar_bnb_mvp', rounds)
      const beamBest = BEAM_BASELINE_20260528.bestScore
      const astarBest = astar.result.topPlans[0]?.score ?? null
      const scoreGap =
        beamBest !== null && astarBest !== null && beamBest !== 0
          ? Number((((astarBest - beamBest) / beamBest) * 100).toFixed(4))
          : null

      const report = {
        generatedAt: new Date().toISOString(),
        snapshotId: raw.id,
        description: raw.description,
        rounds,
        beam: {
          baselineRef: 'README 2026-05-28',
          ...BEAM_BASELINE_20260528,
          perfBreakdown: null,
        },
        astarBnbMvp: {
          medianMs: astar.medianMs,
          roundsMs: astar.roundsMs,
          exploredStates: astar.result.exploredStates,
          bestScore: astarBest,
          routeSignature: routeSignature(astar.result),
          perfBreakdown: astar.result.perfBreakdown ?? null,
          step3Detail: astar.step3Detail,
        },
        compare: {
          medianDeltaMs: Number((astar.medianMs - BEAM_BASELINE_20260528.medianMs).toFixed(2)),
          scoreGapPercentVsBeam: scoreGap,
          routeSignatureMatch: BEAM_BASELINE_20260528.routeSignature === routeSignature(astar.result),
          mode: 'astar_only_vs_readme_baseline',
        },
      }

      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      expect(fs.existsSync(reportPath)).toBe(true)
      expect(astar.result.exploredStates).toBeGreaterThan(0)
    },
    30 * 60 * 1000,
  )
})
