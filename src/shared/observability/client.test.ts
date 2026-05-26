import { describe, expect, it } from 'vitest'
import { resetAnalyticsAdapter, setAnalyticsAdapter, trackAnalyticsEvent } from './client'

describe('shared/observability client', () => {
  it('tracks event through injected adapter', () => {
    const received: string[] = []
    setAnalyticsAdapter({
      track: (event) => {
        received.push(event.name)
      },
    })
    trackAnalyticsEvent({ name: 'calculation_started', domain: 'zhushen', at: Date.now() })
    expect(received).toEqual(['calculation_started'])
    resetAnalyticsAdapter()
  })

  it('noop adapter does not throw', () => {
    resetAnalyticsAdapter()
    expect(() =>
      trackAnalyticsEvent({
        name: 'page_entered',
        domain: 'zhushen',
        at: Date.now(),
      }),
    ).not.toThrow()
  })
})
