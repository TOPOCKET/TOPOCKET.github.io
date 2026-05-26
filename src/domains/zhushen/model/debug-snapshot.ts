import { z } from 'zod'
import type { SimulationInput } from './zhushen-model'
import {
  initialZhushenSimulatorUiState,
  replayZhushenSimulatorEvents,
  type ZhushenSimulatorEvent,
  type ZhushenSimulatorUiState,
} from './simulator-events'

export interface ZhushenDebugSnapshot {
  domain: 'zhushen'
  input: SimulationInput
  events: ZhushenSimulatorEvent[]
  state: ZhushenSimulatorUiState
  meta: {
    version: string
    buildAt: string
  }
}

export const createZhushenDebugSnapshot = (snapshot: ZhushenDebugSnapshot): ZhushenDebugSnapshot => snapshot

const snapshotSchema = z.object({
  domain: z.literal('zhushen'),
  input: z.any(),
  events: z.array(z.any()),
  state: z.any(),
  meta: z.object({
    version: z.string(),
    buildAt: z.string(),
  }),
})

export const parseZhushenDebugSnapshot = (raw: string): ZhushenDebugSnapshot => {
  const data = JSON.parse(raw)
  return snapshotSchema.parse(data) as ZhushenDebugSnapshot
}

export const replayZhushenDebugSnapshot = (snapshot: ZhushenDebugSnapshot): ZhushenSimulatorUiState => {
  if (!snapshot.events.length) return snapshot.state ?? initialZhushenSimulatorUiState()
  return replayZhushenSimulatorEvents(snapshot.events)
}
