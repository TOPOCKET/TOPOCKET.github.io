import { describe, expect, it } from 'vitest'
import {
  initialZhushenSimulatorUiState,
  reduceZhushenSimulatorState,
  replayZhushenSimulatorEvents,
  type ZhushenSimulatorEvent,
} from './simulator-events'

describe('simulator-events reducer', () => {
  it('should replay events and produce stable state', () => {
    const events: ZhushenSimulatorEvent[] = [
      { type: 'calculation_started' },
      {
        type: 'simulation_succeeded',
        output: {
          final: { str: 1, tec: 2, agi: 3, con: 4, per: 5, wil: 6 },
          growthAcc: { str: 1, tec: 1, agi: 1, con: 1, per: 1, wil: 1 },
          jobName: 'job-a',
          logs: ['ok'],
        },
      },
      { type: 'search_started' },
      {
        type: 'search_progress_updated',
        progress: {
          phase: 'running',
          step: 1,
          totalSteps: 2,
          beamSize: 10,
          candidateSize: 20,
          exploredStates: 100,
          prunedByDominance: 40,
          poolSize: 30,
          compactionCount: 1,
          poolPeak: 50,
          stepMs: 8,
          routeChecks: 1,
          routePrunes: 1,
          groupChecks: 1,
          groupPrunes: 1,
        },
      },
      {
        type: 'search_succeeded',
        summary: { exploredStates: 1000, prunedByDominance: 500 },
        plans: [],
      },
    ]
    const finalState = replayZhushenSimulatorEvents(events)
    expect(finalState.output?.jobName).toBe('job-a')
    expect(finalState.searchPending).toBe(false)
    expect(finalState.searchSummary?.exploredStates).toBe(1000)
    expect(finalState.errorText).toBe('')
  })

  it('should clear pending/progress on failure', () => {
    const state = reduceZhushenSimulatorState(initialZhushenSimulatorUiState(), { type: 'search_started' })
    const next = reduceZhushenSimulatorState(state, {
      type: 'calculation_failed',
      error: { code: 'SYSTEM_ERROR', category: 'system', stage: 't', message: 'boom' },
    })
    expect(next.searchPending).toBe(false)
    expect(next.searchProgress).toBeNull()
    expect(next.errorText).toBe('[SYSTEM_ERROR] boom')
  })
})
