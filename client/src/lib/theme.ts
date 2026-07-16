export type ThemeName = 'minimal' | 'teletext'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: ThemeName = 'minimal'
const THEME_CHANGE_EVENT = 'themechange'

export function getStoredTheme(): ThemeName {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'teletext' ? 'teletext' : DEFAULT_THEME
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.remove('theme-minimal', 'theme-teletext')
  document.documentElement.classList.add(`theme-${theme}`)
  window.localStorage.setItem(STORAGE_KEY, theme)
  window.dispatchEvent(new CustomEvent<ThemeName>(THEME_CHANGE_EVENT, { detail: theme }))
}

/** Notifies `callback` whenever `applyTheme` runs. Returns an unsubscribe function. */
export function subscribeToThemeChange(callback: (theme: ThemeName) => void): () => void {
  function handler(event: Event): void {
    callback((event as CustomEvent<ThemeName>).detail)
  }
  window.addEventListener(THEME_CHANGE_EVENT, handler)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler)
}
