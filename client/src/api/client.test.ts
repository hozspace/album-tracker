import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api, ApiError } from './client'

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('unwraps data from a successful envelope', async () => {
    const stats = { total: 3, monthCount: 1, monthAvg: 4.5 }
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: true, data: stats, error: null }),
    )

    const result = await api.getStats()

    expect(result).toEqual(stats)
    expect(fetch).toHaveBeenCalledWith(
      '/api/stats',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    )
  })

  test('throws an ApiError carrying the server message on failure envelope', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, data: null, error: 'Log not found' }),
    )

    await expect(api.getLog('abc')).rejects.toThrow('Log not found')
  })

  test('throws a human message when the network request fails outright', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.getStats()).rejects.toThrow(ApiError)
    await expect(api.getStats()).rejects.toThrow(/reach the server/i)
  })

  test('throws a human message when the response body is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('bad json')),
    } as unknown as Response)

    await expect(api.getStats()).rejects.toThrow(/unexpected response/i)
  })

  test('builds the logs query string with limit and offset', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: true, data: { logs: [], total: 0 }, error: null }),
    )

    await api.getLogs(20, 40)

    expect(fetch).toHaveBeenCalledWith('/api/logs?limit=20&offset=40', expect.anything())
  })

  test('sends a POST with a JSON body when creating a log', async () => {
    const newLog = {
      mbid: 'mbid-1',
      title: 'OK Computer',
      artist: 'Radiohead',
      year: 1997,
      artUrl: null,
      rating: 4.5,
      faveTrack: 'Airbag',
      listenedOn: '2026-07-14',
      relisten: false,
      note: null,
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: true, data: { id: '1', createdAt: 'now', ...newLog }, error: null }),
    )

    await api.createLog(newLog)

    expect(fetch).toHaveBeenCalledWith(
      '/api/logs',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(newLog) }),
    )
  })
})
