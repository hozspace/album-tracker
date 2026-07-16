import { useEffect, useState } from 'react'

export type ArtMode = 'photo' | 'dither'

const STORAGE_KEY = 'artMode'
const DEFAULT_ART_MODE: ArtMode = 'photo'
const ART_MODE_CHANGE_EVENT = 'artmodechange'

export function getStoredArtMode(): ArtMode {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'dither' ? 'dither' : DEFAULT_ART_MODE
}

export function applyArtMode(mode: ArtMode): void {
  window.localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent<ArtMode>(ART_MODE_CHANGE_EVENT, { detail: mode }))
}

function subscribeToArtModeChange(callback: (mode: ArtMode) => void): () => void {
  function handler(event: Event): void {
    callback((event as CustomEvent<ArtMode>).detail)
  }
  window.addEventListener(ART_MODE_CHANGE_EVENT, handler)
  return () => window.removeEventListener(ART_MODE_CHANGE_EVENT, handler)
}

/** Reactive read of the current teletext art treatment. Re-renders when `applyArtMode` runs elsewhere. */
export function useArtMode(): ArtMode {
  const [mode, setMode] = useState<ArtMode>(getStoredArtMode)

  useEffect(() => subscribeToArtModeChange(setMode), [])

  return mode
}
