import { createNoopAnalyticsAdapter, type AnalyticsAdapter, type AnalyticsEvent } from './events'

let adapter: AnalyticsAdapter = createNoopAnalyticsAdapter()

export const setAnalyticsAdapter = (next: AnalyticsAdapter): void => {
  adapter = next
}

export const resetAnalyticsAdapter = (): void => {
  adapter = createNoopAnalyticsAdapter()
}

export const trackAnalyticsEvent = (event: AnalyticsEvent): void => {
  adapter.track(event)
}
