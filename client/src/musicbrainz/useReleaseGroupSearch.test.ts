import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SEARCH_DEBOUNCE_MS, useReleaseGroupSearch } from './useReleaseGroupSearch'

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

describe('useReleaseGroupSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('does not call fetch before the debounce window elapses', () => {
    renderHook(() => useReleaseGroupSearch('radiohead'))

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50)
    })

    expect(fetch).not.toHaveBeenCalled()
  })

  test('calls fetch once the debounce window elapses', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ 'release-groups': [] }))

    renderHook(() => useReleaseGroupSearch('radiohead'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('aborts the in-flight request when the query changes before it resolves', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ 'release-groups': [] }))

    const { rerender } = renderHook(({ query }) => useReleaseGroupSearch(query), {
      initialProps: { query: 'rad' },
    })

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
    })

    const firstSignal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
    expect(firstSignal?.aborted).toBe(false)

    rerender({ query: 'radio' })

    expect(firstSignal?.aborted).toBe(true)
  })

  test('clears results for a blank query without calling fetch', () => {
    const { result } = renderHook(() => useReleaseGroupSearch('   '))

    expect(result.current.results).toEqual([])
    expect(result.current.status).toBe('idle')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('exposes the mapped results once the request resolves', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        'release-groups': [{ id: 'x', title: 'OK Computer', 'artist-credit': [{ name: 'Radiohead' }] }],
      }),
    )

    const { result } = renderHook(() => useReleaseGroupSearch('ok computer'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(result.current.results).toHaveLength(1)
    expect(result.current.status).toBe('idle')
  })
})
