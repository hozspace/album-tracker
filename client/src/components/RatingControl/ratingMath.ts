export const STAR_COUNT = 5
export const RATING_STEP = 0.5
export const MIN_RATING = 0.5
export const MAX_RATING = 5
/** Teletext renders the same value as a 10-segment block bar (one block per half-step). */
export const BLOCK_COUNT = MAX_RATING / RATING_STEP

export function valueFromPointerX(clientX: number, rectLeft: number, rectWidth: number): number {
  if (rectWidth <= 0) return MIN_RATING

  const ratio = Math.min(1, Math.max(0, (clientX - rectLeft) / rectWidth))
  const raw = ratio * STAR_COUNT
  const stepped = Math.round(raw / RATING_STEP) * RATING_STEP

  return Math.min(MAX_RATING, Math.max(MIN_RATING, stepped))
}

export function starFillRatio(value: number, starIndex: number): number {
  return Math.min(1, Math.max(0, value - starIndex))
}

/** Number of filled cells (out of BLOCK_COUNT) in the teletext block-bar rendering. */
export function filledBlockCount(value: number): number {
  return Math.round(value / RATING_STEP)
}
