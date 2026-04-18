import { FlatRow, ValidationResult } from './types'

export function validateRows(rows: FlatRow[]): ValidationResult {
  const errors: string[] = []
  const missingCodes: string[] = []

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].code
    const curr = rows[i].code

    if (!prev || !curr) continue

    const expected = nextCode(prev)

    if (expected && expected !== curr) {
      missingCodes.push(expected)
      errors.push(`Missing ${expected} between ${prev} → ${curr}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingCodes
  }
}

function nextCode(code: string): string | null {
  const parts = code.split('.').map(Number)
  if (isNaN(parts[parts.length - 1])) return null

  parts[parts.length - 1] += 1
  return parts.join('.')
}
