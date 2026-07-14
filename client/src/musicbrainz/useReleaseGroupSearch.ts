import { useEffect, useState } from 'react'
import { searchReleaseGroups } from './search'
import type { ReleaseGroupSearchResult } from './types'

export const SEARCH_DEBOUNCE_MS = 600

export type SearchStatus = 'idle' | 'loading' | 'error'

interface UseReleaseGroupSearchResult {
  results: ReleaseGroupSearchResult[]
  status: SearchStatus
}

export function useReleaseGroupSearch(query: string): UseReleaseGroupSearchResult {
  const [results, setResults] = useState<ReleaseGroupSearchResult[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    setStatus('loading')

    const timer = setTimeout(() => {
      searchReleaseGroups(trimmed, controller.signal)
        .then((found) => {
          setResults(found)
          setStatus('idle')
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setStatus('error')
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, status }
}
