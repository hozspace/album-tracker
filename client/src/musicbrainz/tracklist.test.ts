import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { fetchTracklist } from './tracklist'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response
}

describe('fetchTracklist', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('picks the earliest official release and returns its tracks', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          releases: [
            { id: 'late', status: 'Official', date: '2017-06-23' },
            { id: 'early', status: 'Official', date: '1997-05-21' },
            { id: 'promo', status: 'Promotion', date: '1997-01-01' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          media: [
            {
              tracks: [
                { number: '1', title: 'Airbag' },
                { number: '2', title: 'Paranoid Android' },
              ],
            },
          ],
        }),
      )

    const result = await fetchTracklist('mbid-1')

    expect(result).toEqual([
      { position: 1, title: 'Airbag' },
      { position: 2, title: 'Paranoid Android' },
    ])
    const secondCallUrl = vi.mocked(fetch).mock.calls[1]?.[0] as string
    expect(secondCallUrl).toContain('/release/early')
  })

  test('returns null when the release-group lookup fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false))

    const result = await fetchTracklist('mbid-1')

    expect(result).toBeNull()
  })

  test('returns null when there are no releases at all', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ releases: [] }))

    const result = await fetchTracklist('mbid-1')

    expect(result).toBeNull()
  })

  test('returns null when the chosen release has no tracks', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ releases: [{ id: 'r1', status: 'Official', date: '1997-01-01' }] }))
      .mockResolvedValueOnce(jsonResponse({ media: [] }))

    const result = await fetchTracklist('mbid-1')

    expect(result).toBeNull()
  })

  test('returns null instead of throwing when a network error occurs', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const result = await fetchTracklist('mbid-1')

    expect(result).toBeNull()
  })
})
