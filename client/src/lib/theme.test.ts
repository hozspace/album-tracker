import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { applyTheme, getStoredTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
  })

  test('defaults to minimal when nothing is stored', () => {
    expect(getStoredTheme()).toBe('minimal')
  })

  test('defaults to minimal for an unrecognised stored value', () => {
    window.localStorage.setItem('theme', 'garbage')
    expect(getStoredTheme()).toBe('minimal')
  })

  test('reads back a stored teletext preference', () => {
    window.localStorage.setItem('theme', 'teletext')
    expect(getStoredTheme()).toBe('teletext')
  })

  test('applyTheme sets the class on <html> and persists the choice', () => {
    applyTheme('teletext')

    expect(document.documentElement.classList.contains('theme-teletext')).toBe(true)
    expect(document.documentElement.classList.contains('theme-minimal')).toBe(false)
    expect(window.localStorage.getItem('theme')).toBe('teletext')
  })

  test('applyTheme replaces a previously applied theme class', () => {
    applyTheme('teletext')
    applyTheme('minimal')

    expect(document.documentElement.classList.contains('theme-minimal')).toBe(true)
    expect(document.documentElement.classList.contains('theme-teletext')).toBe(false)
  })
})
