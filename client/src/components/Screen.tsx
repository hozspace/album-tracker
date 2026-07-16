import type { CSSProperties, ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { useTheme } from '../lib/useTheme'
import { useTeletextFit } from '../lib/useTeletextFit'
import { useTeletextReveal } from '../lib/useTeletextReveal'

interface ScreenProps {
  screen: string
  title: string
  children: ReactNode
  /** Overrides the screen's default page number (album detail varies per album). */
  pageNumber?: number
}

export function Screen({ screen, title, children, pageNumber }: ScreenProps) {
  const theme = useTheme()
  const isTeletext = theme === 'teletext'
  const { ref, fontSize } = useTeletextFit(isTeletext)
  useTeletextReveal(ref, isTeletext)

  const style: CSSProperties | undefined = isTeletext && fontSize ? { fontSize: `${fontSize}px` } : undefined

  // TopBar (row 0) and BottomNav (the Fastext row) are fixed-position
  // siblings of <main>, but they still need the SAME computed font-size so
  // 1ch lines up as one character cell across all three — that only works
  // if they share a common ancestor carrying the font-size (CSS inheritance
  // follows the DOM tree regardless of position: fixed). Under
  // theme-minimal `style` is undefined and this wrapper is unstyled, so it
  // has no effect on layout there.
  return (
    <div ref={ref} style={style} className="tt-page">
      <TopBar screen={screen} pageNumber={pageNumber} />
      <main data-screen={screen}>
        <h1 className="screen-title">{title}</h1>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
