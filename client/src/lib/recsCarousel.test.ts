import { describe, expect, test } from 'vitest'
import { clampCarouselIndex, nextCarouselIndex } from './recsCarousel'

describe('nextCarouselIndex', () => {
  test('advances by one', () => {
    expect(nextCarouselIndex(0, 5)).toBe(1)
    expect(nextCarouselIndex(3, 5)).toBe(4)
  })

  test('wraps back to the first subpage after the last', () => {
    expect(nextCarouselIndex(4, 5)).toBe(0)
  })

  test('stays at zero with a single rec', () => {
    expect(nextCarouselIndex(0, 1)).toBe(0)
  })

  test('returns zero for an empty list', () => {
    expect(nextCarouselIndex(0, 0)).toBe(0)
  })
})

describe('clampCarouselIndex', () => {
  test('leaves an in-range index untouched', () => {
    expect(clampCarouselIndex(2, 5)).toBe(2)
  })

  test('clamps an index past the end of a shrunk list', () => {
    expect(clampCarouselIndex(4, 2)).toBe(1)
  })

  test('clamps a negative index up to zero', () => {
    expect(clampCarouselIndex(-1, 5)).toBe(0)
  })

  test('returns zero for an empty list', () => {
    expect(clampCarouselIndex(3, 0)).toBe(0)
  })
})
