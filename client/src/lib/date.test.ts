import { describe, expect, test } from 'vitest'
import { compactDiaryDate, formatDate } from './date'

describe('formatDate', () => {
  test('formats an ISO date as "D Month YYYY" for display', () => {
    expect(formatDate('2026-07-12')).toBe('12 July 2026')
  })

  test('pads neither the day nor uses leading zeros', () => {
    expect(formatDate('2026-01-05')).toBe('5 January 2026')
  })

  test('handles December correctly across the year boundary', () => {
    expect(formatDate('2025-12-31')).toBe('31 December 2025')
  })
})

describe('compactDiaryDate', () => {
  test('formats an ISO date as zero-padded day + 3-letter month, no separator', () => {
    expect(compactDiaryDate('2026-07-13')).toBe('13JUL')
  })

  test('zero-pads single-digit days', () => {
    expect(compactDiaryDate('2026-07-04')).toBe('04JUL')
  })

  test('uppercases the month abbreviation', () => {
    expect(compactDiaryDate('2025-12-31')).toBe('31DEC')
  })
})
