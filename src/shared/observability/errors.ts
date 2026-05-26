export type ErrorCategory = 'input' | 'business' | 'system'

export interface DiagnosticError {
  code: string
  category: ErrorCategory
  stage: string
  message: string
  context?: Record<string, unknown>
}

export const createDiagnosticError = (
  code: string,
  category: ErrorCategory,
  stage: string,
  message: string,
  context?: Record<string, unknown>,
): DiagnosticError => ({
  code,
  category,
  stage,
  message,
  context,
})

export const normalizeUnknownError = (error: unknown, stage: string, context?: Record<string, unknown>): DiagnosticError => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('parse') || msg.includes('invalid') || msg.includes('schema')) {
      return createDiagnosticError('INPUT_INVALID', 'input', stage, error.message, context)
    }
    if (msg.includes('promotion failed') || msg.includes('not found') || msg.includes('conflict')) {
      return createDiagnosticError('BUSINESS_RULE_VIOLATION', 'business', stage, error.message, context)
    }
    return createDiagnosticError('SYSTEM_ERROR', 'system', stage, error.message, context)
  }
  return createDiagnosticError('UNKNOWN_ERROR', 'system', stage, 'unknown error', context)
}
