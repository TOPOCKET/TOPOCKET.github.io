import type { AttrVector, PromotionStep, SearchProgress } from './zhushen-model'
import type { DiagnosticError } from '@/shared/observability/errors'

export interface ZhushenUiOutput {
  final: AttrVector
  growthAcc: AttrVector
  jobName: string
  logs: string[]
}

export interface ZhushenUiPlan {
  rank: number
  score: number
  final: AttrVector
  route: string
  promotions: PromotionStep[]
}

export interface ZhushenUiSearchSummary {
  exploredStates: number
  prunedByDominance: number
}

export interface ZhushenSimulatorUiState {
  output: ZhushenUiOutput | null
  searchSummary: ZhushenUiSearchSummary | null
  topPlans: ZhushenUiPlan[]
  searchPending: boolean
  searchProgress: SearchProgress | null
  errorText: string
  selectionError: string
}

export type ZhushenSimulatorEvent =
  | { type: 'selection_error_set'; message: string }
  | { type: 'selection_error_clear' }
  | { type: 'calculation_started' }
  | { type: 'simulation_succeeded'; output: ZhushenUiOutput }
  | { type: 'search_started' }
  | { type: 'search_progress_updated'; progress: SearchProgress }
  | { type: 'search_succeeded'; summary: ZhushenUiSearchSummary; plans: ZhushenUiPlan[] }
  | { type: 'calculation_failed'; error: DiagnosticError }

export const initialZhushenSimulatorUiState = (): ZhushenSimulatorUiState => ({
  output: null,
  searchSummary: null,
  topPlans: [],
  searchPending: false,
  searchProgress: null,
  errorText: '',
  selectionError: '',
})

export const reduceZhushenSimulatorState = (
  state: ZhushenSimulatorUiState,
  event: ZhushenSimulatorEvent,
): ZhushenSimulatorUiState => {
  switch (event.type) {
    case 'selection_error_set':
      return { ...state, selectionError: event.message }
    case 'selection_error_clear':
      return { ...state, selectionError: '' }
    case 'calculation_started':
      return { ...state, output: null, searchSummary: null, topPlans: [], searchPending: false, searchProgress: null, errorText: '' }
    case 'simulation_succeeded':
      return { ...state, output: event.output }
    case 'search_started':
      return { ...state, searchPending: true, searchProgress: null }
    case 'search_progress_updated':
      return { ...state, searchProgress: event.progress }
    case 'search_succeeded':
      return { ...state, searchPending: false, searchProgress: null, searchSummary: event.summary, topPlans: event.plans }
    case 'calculation_failed':
      return { ...state, searchPending: false, searchProgress: null, errorText: `[${event.error.code}] ${event.error.message}` }
    default:
      return state
  }
}

export const replayZhushenSimulatorEvents = (events: ZhushenSimulatorEvent[]): ZhushenSimulatorUiState =>
  events.reduce(reduceZhushenSimulatorState, initialZhushenSimulatorUiState())
