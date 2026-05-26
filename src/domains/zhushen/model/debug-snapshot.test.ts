import { describe, expect, it } from 'vitest'
import { createZhushenDebugSnapshot, parseZhushenDebugSnapshot, replayZhushenDebugSnapshot } from './debug-snapshot'

describe('zhushen debug snapshot', () => {
  it('parses and replays snapshot events', () => {
    const snapshot = createZhushenDebugSnapshot({
      domain: 'zhushen',
      input: {} as never,
      events: [
        { type: 'calculation_started' },
        {
          type: 'calculation_failed',
          error: { code: 'SYSTEM_ERROR', category: 'system', stage: 't', message: 'boom' },
        },
      ],
      state: {} as never,
      meta: { version: '0.0.0', buildAt: '2026-05-26T00:00:00.000Z' },
    })
    const parsed = parseZhushenDebugSnapshot(JSON.stringify(snapshot))
    const replayed = replayZhushenDebugSnapshot(parsed)
    expect(parsed.domain).toBe('zhushen')
    expect(replayed.errorText).toContain('SYSTEM_ERROR')
  })
})
