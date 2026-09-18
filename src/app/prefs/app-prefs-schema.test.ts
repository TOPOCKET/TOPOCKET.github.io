import { describe, expect, it } from 'vitest'
import { createDefaultAppPrefs } from './app-prefs-schema'

describe('app prefs defaults', () => {
  it('creates isolated mutable defaults', () => {
    const first = createDefaultAppPrefs()
    first.recentTools.push('tactics-rogue')
    expect(createDefaultAppPrefs().recentTools).toEqual([])
  })
})
