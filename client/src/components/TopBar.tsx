import { useEffect, useState } from 'react'
import { APP_NAME } from '../config'
import { formatCeefaxClock } from '../lib/ceefaxClock'
import { pageNumberForScreen } from '../lib/pageNumbers'
import { useTheme } from '../lib/useTheme'

const CLOCK_TICK_MS = 1000

interface TopBarProps {
  screen: string
  /** Overrides the screen's default page number (album detail varies per album). */
  pageNumber?: number
}

export function TopBar({ screen, pageNumber }: TopBarProps) {
  const theme = useTheme()
  const isTeletext = theme === 'teletext'
  const resolvedPageNumber = pageNumber ?? pageNumberForScreen(screen)
  const clock = useCeefaxClock(isTeletext)

  return (
    <header className="page-meta">
      <span className="page-meta__page-number">{`P${resolvedPageNumber}`}</span>
      <span className="page-meta__app-name">{APP_NAME}</span>
      <span className="page-meta__clock">{clock}</span>
    </header>
  )
}

/** Ticks every second, but only while `enabled` — no interval runs under theme-minimal. */
function useCeefaxClock(enabled: boolean): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return

    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [enabled])

  return formatCeefaxClock(now)
}
