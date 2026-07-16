import { describe, expect, test } from 'vitest'
import { BLOCK_COUNT, MAX_RATING, MIN_RATING, filledBlockCount, starFillRatio, valueFromPointerX } from './ratingMath'

describe('valueFromPointerX', () => {
  test('clamps to the minimum step at the left edge', () => {
    expect(valueFromPointerX(0, 0, 200)).toBe(MIN_RATING)
  })

  test('clamps to the maximum at the right edge', () => {
    expect(valueFromPointerX(200, 0, 200)).toBe(MAX_RATING)
  })

  test('rounds to the nearest half star in the middle of the track', () => {
    expect(valueFromPointerX(100, 0, 200)).toBe(2.5)
  })

  test('rounds to a whole star when the pointer sits on a star boundary', () => {
    expect(valueFromPointerX(80, 0, 200)).toBe(2)
  })

  test('clamps pointer positions before the track start', () => {
    expect(valueFromPointerX(-50, 0, 200)).toBe(MIN_RATING)
  })

  test('clamps pointer positions past the track end', () => {
    expect(valueFromPointerX(500, 0, 200)).toBe(MAX_RATING)
  })

  test('accounts for the track offset from the viewport origin', () => {
    expect(valueFromPointerX(150, 100, 200)).toBe(1.5)
  })

  test('falls back to the minimum when the track has no width', () => {
    expect(valueFromPointerX(50, 0, 0)).toBe(MIN_RATING)
  })
})

describe('starFillRatio', () => {
  test('is fully filled for a star well below the value', () => {
    expect(starFillRatio(3, 0)).toBe(1)
  })

  test('is half filled for the star matching a half-step value', () => {
    expect(starFillRatio(2.5, 2)).toBe(0.5)
  })

  test('is empty for a star at or above the value', () => {
    expect(starFillRatio(2.5, 3)).toBe(0)
  })
})

describe('filledBlockCount', () => {
  test('fills all 10 blocks at the maximum rating', () => {
    expect(filledBlockCount(MAX_RATING)).toBe(BLOCK_COUNT)
  })

  test('fills a single block at the minimum rating', () => {
    expect(filledBlockCount(MIN_RATING)).toBe(1)
  })

  test('fills half the blocks at the midpoint', () => {
    expect(filledBlockCount(2.5)).toBe(5)
  })

  test('matches one block per half-step', () => {
    expect(filledBlockCount(4.5)).toBe(9)
  })
})
