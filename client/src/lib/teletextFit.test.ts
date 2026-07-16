import { describe, expect, test } from 'vitest'
import { computeFitFontSize, resolveTeletextTargetWidth } from './teletextFit'

describe('computeFitFontSize', () => {
  test('scales font size proportionally so the probe width matches the target', () => {
    // 40 chars measured 800px wide at 100px font-size (20px/char); fitting
    // that same 40-char row into 400px means halving the font size.
    expect(computeFitFontSize(400, 100, 800)).toBe(50)
  })

  test('returns the reference size unchanged when target equals reference width', () => {
    expect(computeFitFontSize(800, 100, 800)).toBe(100)
  })

  test('scales up for a wider target', () => {
    expect(computeFitFontSize(1600, 100, 800)).toBe(200)
  })

  test('falls back to the reference font size when the probe has no width', () => {
    expect(computeFitFontSize(400, 100, 0)).toBe(100)
  })

  test('falls back to the reference font size for a negative probe width', () => {
    expect(computeFitFontSize(400, 100, -10)).toBe(100)
  })
})

describe('resolveTeletextTargetWidth', () => {
  test('fills the full viewport width below the desktop breakpoint', () => {
    expect(resolveTeletextTargetWidth(390, 720, 640)).toBe(390)
  })

  test('caps at the desktop max width above the breakpoint', () => {
    expect(resolveTeletextTargetWidth(1440, 720, 640)).toBe(640)
  })

  test('does not exceed a desktop viewport narrower than the cap', () => {
    expect(resolveTeletextTargetWidth(700, 720, 640)).toBe(700)
  })

  test('treats the breakpoint itself as desktop', () => {
    expect(resolveTeletextTargetWidth(720, 720, 640)).toBe(640)
  })
})
