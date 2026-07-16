import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ARTIST_SEARCH_DEBOUNCE_MS, useArtistSearch } from './useArtistSearch'

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

describe('useArtistSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('does not call fetch before the debounce window elapses', () => {
    renderHook(() => useArtistSearch('radio'))

    act(() => {
      vi.advanceTimersByTime(ARTIST_SEARCH_DEBOUNCE_MS - 50)
    })

    expect(fetch).not.toHaveBeenCalled()
  })

  test('calls fetch once the debounce window elapses', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ artists: [] }))

    renderHook(() => useArtistSearch('radio'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARTIST_SEARCH_DEBOUNCE_MS)
    })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('clears results for a blank query without calling fetch', () => {
    const { result } = renderHook(() => useArtistSearch('   '))

    expect(result.current.results).toEqual([])
    expect(result.current.status).toBe('idle')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('exposes the mapped results once the request resolves', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ artists: [{ id: 'x', name: 'Radiohead' }] }),
    )

    const { result } = renderHook(() => useArtistSearch('radiohead'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARTIST_SEARCH_DEBOUNCE_MS)
    })

    expect(result.current.results).toEqual([{ mbid: 'x', name: 'Radiohead' }])
    expect(result.current.status).toBe('idle')
  })

  test('sets error status when the search fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useArtistSearch('radiohead'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARTIST_SEARCH_DEBOUNCE_MS)
    })

    expect(result.current.status).toBe('error')
  })
})
