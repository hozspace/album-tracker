import { describe, it, expect } from 'vitest'
import { buildRecEmail } from './emailContent.js'
import type { Rec } from '../types/rec.js'

function fakeRec(overrides: Partial<Rec> = {}): Rec {
  return {
    id: 1,
    artist: 'Radiohead',
    title: 'OK Computer',
    year: 1997,
    mbid: 'mbid-1',
    artUrl: 'https://coverartarchive.org/release-group/mbid-1/front-500',
    because: 'You loved Kid A — this is where that sound started.',
    mode: 'deepen',
    status: 'pending',
    createdAt: '2026-07-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('buildRecEmail', () => {
  it('builds a subject from the title and artist', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.subject).toBe("Today's album: OK Computer — Radiohead")
  })

  it('includes title, artist, year, because, and mode in the html body', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.html).toContain('OK Computer')
    expect(content.html).toContain('Radiohead')
    expect(content.html).toContain('1997')
    expect(content.html).toContain('You loved Kid A')
    expect(content.html).toContain('mode: deepen')
  })

  it('includes the same information in the plain-text alternative', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.text).toContain('OK Computer — Radiohead (1997)')
    expect(content.text).toContain('You loved Kid A')
    expect(content.text).toContain('mode: deepen')
  })

  it('includes an "open the app" link when APP_URL is set', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, 'https://diary.example.com')

    // Assert
    expect(content.html).toContain('href="https://diary.example.com"')
    expect(content.html).toContain('open the app')
    expect(content.text).toContain('open the app: https://diary.example.com')
  })

  it('omits the app link entirely when APP_URL is unset', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.html).not.toContain('open the app')
    expect(content.text).not.toContain('open the app')
  })

  it('omits the app link when APP_URL is only whitespace', () => {
    // Arrange
    const rec = fakeRec()

    // Act
    const content = buildRecEmail(rec, '   ')

    // Assert
    expect(content.html).not.toContain('open the app')
  })

  it('falls back to "year unknown" when year is null', () => {
    // Arrange
    const rec = fakeRec({ year: null })

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.html).toContain('year unknown')
    expect(content.text).toContain('year unknown')
  })

  it('escapes HTML-significant characters in user-facing fields', () => {
    // Arrange
    const rec = fakeRec({ because: 'Loud <script>alert(1)</script> & "quoted"' })

    // Act
    const content = buildRecEmail(rec, undefined)

    // Assert
    expect(content.html).not.toContain('<script>')
    expect(content.html).toContain('&lt;script&gt;')
    expect(content.html).toContain('&amp;')
  })
})
