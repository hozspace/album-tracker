import { describe, expect, test } from 'vitest'
import { pageNumberForAlbum, pageNumberForScreen } from './pageNumbers'

describe('pageNumberForScreen', () => {
  test('assigns the diary its CEEFAX page number', () => {
    expect(pageNumberForScreen('diary')).toBe(101)
  })

  test('assigns the log its CEEFAX page number', () => {
    expect(pageNumberForScreen('log')).toBe(102)
  })

  test('assigns recs its CEEFAX page number', () => {
    expect(pageNumberForScreen('recs')).toBe(300)
  })

  test('assigns settings its CEEFAX page number', () => {
    expect(pageNumberForScreen('settings')).toBe(400)
  })

  test('falls back to a default for an unknown screen', () => {
    expect(pageNumberForScreen('unknown')).toBe(100)
  })
})

describe('pageNumberForAlbum', () => {
  test('always falls in the P2xx range', () => {
    const ids = ['1', 'abc-123', 'z', '', 'a-very-long-uuid-like-identifier-0001']
    for (const id of ids) {
      const page = pageNumberForAlbum(id)
      expect(page).toBeGreaterThanOrEqual(200)
      expect(page).toBeLessThanOrEqual(299)
    }
  })

  test('is deterministic for the same id', () => {
    expect(pageNumberForAlbum('log-42')).toBe(pageNumberForAlbum('log-42'))
  })

  test('differs across different ids', () => {
    expect(pageNumberForAlbum('log-1')).not.toBe(pageNumberForAlbum('log-2'))
  })
})
