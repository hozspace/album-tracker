export const TELETEXT_COLUMNS = 40
export const TELETEXT_DESKTOP_BREAKPOINT_PX = 720
export const TELETEXT_DESKTOP_MAX_WIDTH_PX = 640

/**
 * Solves for the font-size that makes a 40-column monospace row exactly span
 * `targetWidthPx`, given how wide a 40-character probe string measured at
 * `referenceFontSizePx`. Linear because vector fonts scale proportionally.
 */
export function computeFitFontSize(
  targetWidthPx: number,
  referenceFontSizePx: number,
  referenceTextWidthPx: number,
): number {
  if (referenceTextWidthPx <= 0) return referenceFontSizePx
  return (targetWidthPx / referenceTextWidthPx) * referenceFontSizePx
}

/**
 * The width the 40-column grid should fill: the full viewport on phone,
 * capped and centred like a TV capture on desktop.
 */
export function resolveTeletextTargetWidth(
  viewportWidthPx: number,
  breakpointPx: number = TELETEXT_DESKTOP_BREAKPOINT_PX,
  maxWidthPx: number = TELETEXT_DESKTOP_MAX_WIDTH_PX,
): number {
  if (viewportWidthPx >= breakpointPx) return Math.min(viewportWidthPx, maxWidthPx)
  return viewportWidthPx
}
