import { useEffect, useState } from 'react'
import { getStoredTheme, subscribeToThemeChange } from './theme'
import type { ThemeName } from './theme'

/** Reactive read of the current theme. Re-renders when `applyTheme` runs elsewhere. */
export function useTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme)

  useEffect(() => subscribeToThemeChange(setTheme), [])

  return theme
}
