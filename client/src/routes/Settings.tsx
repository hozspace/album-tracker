import { useState } from 'react'
import { APP_NAME } from '../config'
import { Screen } from '../components/Screen'
import { applyArtMode, getStoredArtMode } from '../lib/artMode'
import type { ArtMode } from '../lib/artMode'
import { applyTheme, getStoredTheme } from '../lib/theme'
import type { ThemeName } from '../lib/theme'
import './Settings.css'

const THEME_OPTIONS: Array<{ value: ThemeName; label: string }> = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'teletext', label: 'Teletext' },
]

// Only meaningful under the teletext theme; hidden under minimal via CSS
// (see Settings.css) rather than a theme check here, keeping this screen's
// markup theme-blind.
const ART_MODE_OPTIONS: Array<{ value: ArtMode; label: string }> = [
  { value: 'photo', label: 'Photo insert' },
  { value: 'dither', label: 'Dithered' },
]

export function Settings() {
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme)
  const [artMode, setArtMode] = useState<ArtMode>(getStoredArtMode)

  function handleThemeChange(next: ThemeName) {
    applyTheme(next)
    setTheme(next)
  }

  function handleArtModeChange(next: ArtMode) {
    applyArtMode(next)
    setArtMode(next)
  }

  return (
    <Screen screen="settings" title="Settings">
      <p className="settings__app-name">{APP_NAME}</p>

      <fieldset className="settings__theme">
        <legend>Theme</legend>
        {THEME_OPTIONS.map((option) => (
          <label key={option.value} className="settings__theme-option">
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => handleThemeChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="settings__art">
        <legend>Art</legend>
        {ART_MODE_OPTIONS.map((option) => (
          <label key={option.value} className="settings__art-option">
            <input
              type="radio"
              name="artMode"
              value={option.value}
              checked={artMode === option.value}
              onChange={() => handleArtModeChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </Screen>
  )
}
