import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { searchReleaseGroups } from './search'

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

describe('searchReleaseGroups', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns an empty array without calling fetch for a blank query', async () => {
    const result = await searchReleaseGroups('   ')

    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('builds a URL-encoded query against the release-group endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ 'release-groups': [] }))

    await searchReleaseGroups('OK Computer')

    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('https://musicbrainz.org/ws/2/release-group?query=')
    expect(calledUrl).toContain('OK%20Computer')
    expect(calledUrl).toContain('fmt=json')
    expect(calledUrl).toContain('limit=8')
  })

  test('maps MusicBrainz release-groups into flat search results', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        'release-groups': [
          {
            id: 'b1392450-e666-3926-a536-22c65f834433',
            title: 'OK Computer',
            'first-release-date': '1997-05-21',
            'artist-credit': [{ name: 'Radiohead' }],
          },
        ],
      }),
    )

    const result = await searchReleaseGroups('OK Computer')

    expect(result).toEqual([
      {
        mbid: 'b1392450-e666-3926-a536-22c65f834433',
        title: 'OK Computer',
        artist: 'Radiohead',
        year: 1997,
      },
    ])
  })

  test('falls back gracefully when release date or artist credit is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ 'release-groups': [{ id: 'x', title: 'Untitled' }] }),
    )

    const result = await searchReleaseGroups('Untitled')

    expect(result).toEqual([{ mbid: 'x', title: 'Untitled', artist: 'Unknown artist', year: null }])
  })

  test('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)

    await expect(searchReleaseGroups('fail')).rejects.toThrow('MusicBrainz search failed.')
  })

  test('passes the abort signal through to fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ 'release-groups': [] }))
    const controller = new AbortController()

    await searchReleaseGroups('OK Computer', controller.signal)

    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(init?.signal).toBe(controller.signal)
  })
})
