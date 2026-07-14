import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

interface ScreenProps {
  screen: string
  title: string
  children: ReactNode
}

export function Screen({ screen, title, children }: ScreenProps) {
  return (
    <>
      <TopBar />
      <main data-screen={screen}>
        <h1 className="screen-title">{title}</h1>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
