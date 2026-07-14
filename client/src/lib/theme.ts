export type ThemeName = 'minimal' | 'teletext'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: ThemeName = 'minimal'

export function getStoredTheme(): ThemeName {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'teletext' ? 'teletext' : DEFAULT_THEME
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.remove('theme-minimal', 'theme-teletext')
  document.documentElement.classList.add(`theme-${theme}`)
  window.localStorage.setItem(STORAGE_KEY, theme)
}
