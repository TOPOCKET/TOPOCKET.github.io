import { describe, expect, it } from 'vitest'
import { normalizeUnknownError } from './errors'

describe('shared/observability errors', () => {
  it('classifies input errors', () => {
    const err = normalizeUnknownError(new Error('invalid schema payload'), 'zhushen.calculate')
    expect(err.category).toBe('input')
    expect(err.code).toBe('INPUT_INVALID')
  })

  it('classifies business errors', () => {
    const err = normalizeUnknownError(new Error('promotion failed at level 1'), 'zhushen.calculate')
    expect(err.category).toBe('business')
    expect(err.code).toBe('BUSINESS_RULE_VIOLATION')
  })

  it('classifies unknown errors as system', () => {
    const err = normalizeUnknownError('oops', 'zhushen.calculate')
    expect(err.category).toBe('system')
    expect(err.code).toBe('UNKNOWN_ERROR')
  })
})
