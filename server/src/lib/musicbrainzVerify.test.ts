import { describe, it, expect, afterEach, vi } from 'vitest'
import { verifyReleaseGroup, verifyRecommendations } from './musicbrainzVerify.js'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyReleaseGroup', () => {
  it('returns mbid and cover art URL when MusicBrainz finds a match', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ 'release-groups': [{ id: 'abc-123' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyReleaseGroup('Boards of Canada', 'Geogaddi')

    expect(result).toEqual({
      mbid: 'abc-123',
      artUrl: 'https://coverartarchive.org/release-group/abc-123/front-500',
    })
  })

  it('sends the required User-Agent header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ 'release-groups': [{ id: 'abc-123' }] }))
    vi.stubGlobal('fetch', fetchMock)

    await verifyReleaseGroup('Boards of Canada', 'Geogaddi')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/album-tracker/)
  })

  it('returns null and logs when there is no match', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ 'release-groups': [] }))
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await verifyReleaseGroup('Nonexistent Artist', 'Nonexistent Album')

    expect(result).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('returns null when the request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await verifyReleaseGroup('Artist', 'Title')

    expect(result).toBeNull()
    consoleErrorSpy.mockRestore()
  })

  it('returns null on a non-ok response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 503))
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await verifyReleaseGroup('Artist', 'Title')

    expect(result).toBeNull()
    consoleErrorSpy.mockRestore()
  })
})

describe('verifyRecommendations', () => {
  it('drops unmatched recommendations and keeps verified ones with mbid/artUrl attached', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ 'release-groups': [{ id: 'found-1' }] }))
      .mockResolvedValueOnce(jsonResponse({ 'release-groups': [] }))
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await verifyRecommendations(
      [
        { artist: 'Found Artist', title: 'Found Album' },
        { artist: 'Missing Artist', title: 'Missing Album' },
      ],
      0,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      artist: 'Found Artist',
      title: 'Found Album',
      mbid: 'found-1',
    })
    consoleErrorSpy.mockRestore()
  })

  it('waits delayMs between requests, but not after the last one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ 'release-groups': [{ id: 'x' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const start = Date.now()
    await verifyRecommendations(
      [
        { artist: 'A', title: 'A' },
        { artist: 'B', title: 'B' },
      ],
      20,
    )
    const elapsed = Date.now() - start

    // One 20ms gap between the two calls, no trailing delay after the last.
    expect(elapsed).toBeGreaterThanOrEqual(15)
    expect(elapsed).toBeLessThan(200)
  })

  it('returns an empty array for an empty input without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyRecommendations([], 0)

    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
