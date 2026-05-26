import type { SearchProgress, SearchResult, SimulationInput, SimulationResult } from './model/zhushen-model'

export interface ZhushenSimulationPort {
  runSimulation: (input: SimulationInput) => SimulationResult
}

export interface ZhushenSearchOrchestratorPort {
  run: (input: SimulationInput) => Promise<SearchResult>
  dispose: () => void
}

export interface ZhushenSearchOrchestratorFactoryPort {
  create: (callbacks: { onProgress: (progress: SearchProgress) => void }) => ZhushenSearchOrchestratorPort
}
