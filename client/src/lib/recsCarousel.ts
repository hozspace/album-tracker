/** Advances the P300 teletext subpage index, wrapping back to the first
 * rec after the last. Pure so it's cheap to unit test independent of the
 * carousel's rendering. */
export function nextCarouselIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current + 1) % total
}

/** Clamps a possibly-stale index (e.g. after a dismiss shrinks the list)
 * back into range, defaulting to the first rec. */
export function clampCarouselIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.max(current, 0), total - 1)
}
