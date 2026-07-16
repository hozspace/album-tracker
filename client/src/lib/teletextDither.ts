// Ported from the reviewed static mockup (scratchpad/mockups/index.html):
// a saturation/contrast boost followed by Floyd–Steinberg error diffusion,
// thresholding each channel to 0/255. Thresholding all three channels to
// their extremes naturally lands every pixel on one of the 8 teletext
// colours (all combinations of {0,255} per RGB channel) — no separate
// nearest-palette-colour step is needed.

const SATURATION_BOOST = 1.6
const CONTRAST_BOOST = 1.15
const RGB_CHANNELS = 3
const RGBA_STRIDE = 4

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value))
}

/** Boosts saturation and contrast ahead of dithering. Returns a new buffer; does not mutate `source`. */
export function boostSaturationAndContrast(source: Uint8ClampedArray): Uint8ClampedArray {
  const result = Uint8ClampedArray.from(source)

  for (let i = 0; i < result.length; i += RGBA_STRIDE) {
    const gray = 0.299 * result[i]! + 0.587 * result[i + 1]! + 0.114 * result[i + 2]!

    for (let channel = 0; channel < RGB_CHANNELS; channel++) {
      const saturated = gray + (result[i + channel]! - gray) * SATURATION_BOOST
      result[i + channel] = clampByte((saturated - 128) * CONTRAST_BOOST + 128)
    }
  }

  return result
}

/**
 * Floyd–Steinberg dither, thresholding each RGB channel independently to
 * 0 or 255 and diffusing the quantisation error to neighbouring pixels.
 * Returns a new buffer; does not mutate `source`.
 */
export function floydSteinbergDither(
  source: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const buffer = Float32Array.from(source)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * RGBA_STRIDE

      for (let channel = 0; channel < RGB_CHANNELS; channel++) {
        const old = buffer[i + channel]!
        const quantized = old >= 128 ? 255 : 0
        const error = old - quantized
        buffer[i + channel] = quantized

        if (x + 1 < width) buffer[i + RGBA_STRIDE + channel] += (error * 7) / 16
        if (y + 1 < height) {
          if (x > 0) buffer[i + (width - 1) * RGBA_STRIDE + channel] += (error * 3) / 16
          buffer[i + width * RGBA_STRIDE + channel] += (error * 5) / 16
          if (x + 1 < width) buffer[i + (width + 1) * RGBA_STRIDE + channel] += (error * 1) / 16
        }
      }
    }
  }

  const result = new Uint8ClampedArray(source.length)
  for (let i = 0; i < result.length; i++) result[i] = clampByte(buffer[i]!)
  return result
}

/** Full treatment: boost then dither to the 8-colour teletext palette. */
export function ditherToTeletextPalette(
  source: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  return floydSteinbergDither(boostSaturationAndContrast(source), width, height)
}
