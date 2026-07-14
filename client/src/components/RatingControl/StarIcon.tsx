import { useId } from 'react'

// Five-point star inscribed in a 24x24 viewBox, precomputed so the shape is
// pixel-identical across browsers/platforms (no reliance on font glyph metrics).
const STAR_PATH =
  'M12 2 L14.25 8.91 L21.51 8.91 L15.63 13.18 L17.88 20.09 L12 15.82 L6.12 20.09 L8.37 13.18 L2.49 8.91 L9.75 8.91 Z'
const STAR_PATH_WIDTH = 24

interface StarIconProps {
  /** 0..1 — fraction of the star's width that should render as filled. */
  fillRatio: number
  size: number
}

export function StarIcon({ fillRatio, size }: StarIconProps) {
  const rawId = useId().replace(/:/g, '')
  const clipId = `rating-star-clip-${rawId}`
  const clampedRatio = Math.min(1, Math.max(0, fillRatio))
  const fillWidth = clampedRatio * STAR_PATH_WIDTH

  return (
    <svg
      className="rating__star-svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path className="rating__star-bg" d={STAR_PATH} />
      {clampedRatio > 0 && (
        <>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={fillWidth} height={STAR_PATH_WIDTH} />
          </clipPath>
          <path className="rating__star-fg" d={STAR_PATH} clipPath={`url(#${clipId})`} />
        </>
      )}
    </svg>
  )
}
