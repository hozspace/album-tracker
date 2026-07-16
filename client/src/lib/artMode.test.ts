import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { applyArtMode, getStoredArtMode } from './artMode'

describe('artMode', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  test('defaults to photo insert when nothing is stored', () => {
    expect(getStoredArtMode()).toBe('photo')
  })

  test('defaults to photo insert for an unrecognised stored value', () => {
    window.localStorage.setItem('artMode', 'garbage')
    expect(getStoredArtMode()).toBe('photo')
  })

  test('reads back a stored dither preference', () => {
    window.localStorage.setItem('artMode', 'dither')
    expect(getStoredArtMode()).toBe('dither')
  })

  test('applyArtMode persists the choice', () => {
    applyArtMode('dither')
    expect(window.localStorage.getItem('artMode')).toBe('dither')
  })

  test('applyArtMode notifies subscribers', () => {
    const callback = vi.fn()
    window.addEventListener('artmodechange', (event) => callback((event as CustomEvent).detail))

    applyArtMode('dither')

    expect(callback).toHaveBeenCalledWith('dither')
  })
})
