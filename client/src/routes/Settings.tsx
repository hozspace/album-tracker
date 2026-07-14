import { useState } from 'react'
import { APP_NAME } from '../config'
import { Screen } from '../components/Screen'
import { applyTheme, getStoredTheme } from '../lib/theme'
import type { ThemeName } from '../lib/theme'
import './Settings.css'

const THEME_OPTIONS: Array<{ value: ThemeName; label: string }> = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'teletext', label: 'Teletext' },
]

export function Settings() {
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme)

  function handleThemeChange(next: ThemeName) {
    applyTheme(next)
    setTheme(next)
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
    </Screen>
  )
}
