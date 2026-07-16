import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { searchArtists } from './artistSearch'

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

describe('searchArtists', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns an empty array without calling fetch for a blank query', async () => {
    const result = await searchArtists('   ')

    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('builds a URL-encoded query against the artist endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ artists: [] }))

    await searchArtists('Boards of Canada')

    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('https://musicbrainz.org/ws/2/artist?query=')
    expect(calledUrl).toContain('Boards%20of%20Canada')
    expect(calledUrl).toContain('fmt=json')
    expect(calledUrl).toContain('limit=5')
  })

  test('maps MusicBrainz artists into flat search results', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        artists: [{ id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711', name: 'Radiohead' }],
      }),
    )

    const result = await searchArtists('Radiohead')

    expect(result).toEqual([{ mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711', name: 'Radiohead' }])
  })

  test('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)

    await expect(searchArtists('fail')).rejects.toThrow('MusicBrainz search failed.')
  })

  test('passes the abort signal through to fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ artists: [] }))
    const controller = new AbortController()

    await searchArtists('Radiohead', controller.signal)

    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(init?.signal).toBe(controller.signal)
  })
})
