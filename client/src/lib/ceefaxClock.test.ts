import { describe, expect, test } from 'vitest'
import { formatCeefaxClock } from './ceefaxClock'

describe('formatCeefaxClock', () => {
  test('formats day, date, month and zero-padded time with a slash before seconds', () => {
    // 1 Jan 2024 was a Monday.
    expect(formatCeefaxClock(new Date(2024, 0, 1, 21, 6, 33))).toBe('MON 01 JAN 21:06/33')
  })

  test('pads single-digit hours, minutes and seconds', () => {
    expect(formatCeefaxClock(new Date(2024, 0, 1, 5, 3, 9))).toBe('MON 01 JAN 05:03/09')
  })

  test('uses three-letter month abbreviations', () => {
    expect(formatCeefaxClock(new Date(2026, 6, 14, 0, 0, 0))).toBe('TUE 14 JUL 00:00/00')
  })

  test('covers each weekday name', () => {
    // 2024-01-01 (Mon) through 2024-01-07 (Sun).
    const expected = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    const actual = expected.map((_, offset) => formatCeefaxClock(new Date(2024, 0, 1 + offset, 0, 0, 0)).slice(0, 3))
    expect(actual).toEqual(expected)
  })
})
