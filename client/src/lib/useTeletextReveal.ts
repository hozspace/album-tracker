import { useEffect } from 'react'
import type { RefObject } from 'react'

// Broad, screen-agnostic list of "row" units across every screen. Kept here
// (shared furniture) rather than in the screen components so the routes stay
// theme-blind — this hook just watches for whichever of these land in the
// DOM and stages them in, mimicking CEEFAX's row-by-row page acquisition.
const ROW_SELECTOR = [
  '.diary__month-header',
  '.log-entry',
  '.diary__footer',
  '.album-search__result',
  '.log-form__selected',
  '.log-form__field',
  '.log-form__submit',
  '.album-detail__hero',
  '.album-detail__title',
  '.album-detail__artist',
  '.album-detail__user-block > *',
  '.album-detail__relog',
  '.album-detail__tracklist > li',
  '.settings__app-name',
  '.settings__theme',
  '.settings__art',
  '.empty-state',
  '.error-state',
].join(', ')

const MAX_STAGGER_INDEX = 12

/** Stages rows in top-to-bottom as they appear in the DOM, CEEFAX-style. No-op unless `enabled`. */
export function useTeletextReveal(containerRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    let frame = 0

    function applyReveal() {
      const rows = container!.querySelectorAll<HTMLElement>(ROW_SELECTOR)
      rows.forEach((row, index) => {
        row.style.setProperty('--tt-i', String(Math.min(index, MAX_STAGGER_INDEX)))
        row.classList.add('tt-reveal-row')
      })
    }

    frame = window.requestAnimationFrame(applyReveal)
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(applyReveal)
    })
    observer.observe(container, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [enabled, containerRef])
}
