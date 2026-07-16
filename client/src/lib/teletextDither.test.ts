import { describe, expect, test } from 'vitest'
import { boostSaturationAndContrast, ditherToTeletextPalette, floydSteinbergDither } from './teletextDither'

function pixel(r: number, g: number, b: number, a = 255): number[] {
  return [r, g, b, a]
}

describe('boostSaturationAndContrast', () => {
  test('leaves a neutral grey pixel at mid-contrast unchanged in hue (still grey)', () => {
    const input = new Uint8ClampedArray(pixel(128, 128, 128))
    const output = boostSaturationAndContrast(input)
    expect(output[0]).toBe(output[1])
    expect(output[1]).toBe(output[2])
  })

  test('does not mutate the input buffer', () => {
    const input = new Uint8ClampedArray(pixel(200, 50, 50))
    const original = Uint8ClampedArray.from(input)
    boostSaturationAndContrast(input)
    expect(input).toEqual(original)
  })

  test('pushes a saturated colour further from grey', () => {
    const input = new Uint8ClampedArray(pixel(200, 100, 100))
    const output = boostSaturationAndContrast(input)
    // Red channel (already above grey) should move further above; green/blue further below.
    expect(output[0]).toBeGreaterThan(200)
    expect(output[1]).toBeLessThan(100)
  })

  test('preserves the alpha channel', () => {
    const input = new Uint8ClampedArray(pixel(10, 20, 30, 128))
    const output = boostSaturationAndContrast(input)
    expect(output[3]).toBe(128)
  })
})

describe('floydSteinbergDither', () => {
  test('quantizes every RGB channel to exactly 0 or 255', () => {
    const input = new Uint8ClampedArray([
      ...pixel(10, 60, 130),
      ...pixel(200, 90, 5),
      ...pixel(128, 128, 128),
      ...pixel(255, 0, 40),
    ])
    const output = floydSteinbergDither(input, 2, 2)

    for (let i = 0; i < output.length; i += 4) {
      expect([0, 255]).toContain(output[i])
      expect([0, 255]).toContain(output[i + 1])
      expect([0, 255]).toContain(output[i + 2])
    }
  })

  test('does not mutate the input buffer', () => {
    const input = new Uint8ClampedArray([...pixel(100, 100, 100), ...pixel(150, 150, 150)])
    const original = Uint8ClampedArray.from(input)
    floydSteinbergDither(input, 2, 1)
    expect(input).toEqual(original)
  })

  test('preserves the alpha channel unthresholded', () => {
    const input = new Uint8ClampedArray(pixel(128, 128, 128, 200))
    const output = floydSteinbergDither(input, 1, 1)
    expect(output[3]).toBe(200)
  })

  test('diffuses quantization error so a uniform mid-grey field does not collapse to one value', () => {
    const width = 4
    const height = 4
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128
      data[i + 1] = 128
      data[i + 2] = 128
      data[i + 3] = 255
    }

    const output = floydSteinbergDither(data, width, height)
    const redValues = new Set<number>()
    for (let i = 0; i < output.length; i += 4) redValues.add(output[i]!)

    // A flat mid-grey field should dither into a mix of black and white, not one flat value.
    expect(redValues.size).toBeGreaterThan(1)
  })
})

describe('ditherToTeletextPalette', () => {
  test('produces only the 8 teletext palette colours', () => {
    const width = 3
    const height = 3
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(Math.random() * 256)
      data[i + 1] = Math.floor(Math.random() * 256)
      data[i + 2] = Math.floor(Math.random() * 256)
      data[i + 3] = 255
    }

    const output = ditherToTeletextPalette(data, width, height)
    const palette = new Set(['0,0,0', '255,0,0', '0,255,0', '0,0,255', '255,255,0', '255,0,255', '0,255,255', '255,255,255'])

    for (let i = 0; i < output.length; i += 4) {
      const key = `${output[i]},${output[i + 1]},${output[i + 2]}`
      expect(palette.has(key)).toBe(true)
    }
  })

  test('does not mutate the input buffer', () => {
    const input = new Uint8ClampedArray([...pixel(80, 160, 200), ...pixel(30, 30, 30)])
    const original = Uint8ClampedArray.from(input)
    ditherToTeletextPalette(input, 2, 1)
    expect(input).toEqual(original)
  })
})
