export type AnalyticsEventName =
  | 'page_entered'
  | 'calculation_started'
  | 'simulation_succeeded'
  | 'search_started'
  | 'search_progress_updated'
  | 'search_succeeded'
  | 'calculation_failed'
  | 'selection_error_set'
  | 'selection_error_clear'

export interface AnalyticsEvent {
  name: AnalyticsEventName
  domain: string
  at: number
  payload?: Record<string, unknown>
}

export interface AnalyticsAdapter {
  track: (event: AnalyticsEvent) => void
}

export const createNoopAnalyticsAdapter = (): AnalyticsAdapter => ({
  track: () => {},
})

export const createConsoleAnalyticsAdapter = (): AnalyticsAdapter => ({
  track: (event) => {
    // eslint-disable-next-line no-console
    console.info('[analytics]', JSON.stringify(event))
  },
})
