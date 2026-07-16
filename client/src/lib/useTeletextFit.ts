import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { computeFitFontSize, resolveTeletextTargetWidth, TELETEXT_COLUMNS } from './teletextFit'

const REFERENCE_FONT_SIZE_PX = 100

function measureReferenceWidth(fontFamily: string): number {
  const probe = document.createElement('span')
  probe.textContent = '0'.repeat(TELETEXT_COLUMNS)
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.whiteSpace = 'pre'
  probe.style.left = '-9999px'
  probe.style.fontFamily = fontFamily
  probe.style.fontSize = `${REFERENCE_FONT_SIZE_PX}px`
  document.body.appendChild(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width
}

/**
 * Sizes a 40-column monospace grid to exactly fill the viewport (capped and
 * centred on desktop). Only measures/recalculates while `enabled`, so it's a
 * no-op under theme-minimal.
 */
export function useTeletextFit<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean,
): {
  ref: RefObject<T | null>
  fontSize: number | null
} {
  const ref = useRef<T | null>(null)
  const [fontSize, setFontSize] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setFontSize(null)
      return
    }

    function recalc() {
      const container = ref.current
      if (!container) return
      const fontFamily = getComputedStyle(container).fontFamily
      const referenceWidth = measureReferenceWidth(fontFamily)
      const targetWidth = resolveTeletextTargetWidth(window.innerWidth)
      setFontSize(computeFitFontSize(targetWidth, REFERENCE_FONT_SIZE_PX, referenceWidth))
    }

    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [enabled])

  return { ref, fontSize }
}
