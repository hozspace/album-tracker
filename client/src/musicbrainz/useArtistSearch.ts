import { useEffect, useState } from 'react'
import { searchArtists } from './artistSearch'
import type { ArtistSearchResult } from './types'

export const ARTIST_SEARCH_DEBOUNCE_MS = 600

export type ArtistSearchStatus = 'idle' | 'loading' | 'error'

interface UseArtistSearchResult {
  results: ArtistSearchResult[]
  status: ArtistSearchStatus
}

export function useArtistSearch(query: string): UseArtistSearchResult {
  const [results, setResults] = useState<ArtistSearchResult[]>([])
  const [status, setStatus] = useState<ArtistSearchStatus>('idle')

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
      searchArtists(trimmed, controller.signal)
        .then((found) => {
          setResults(found)
          setStatus('idle')
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setStatus('error')
        })
    }, ARTIST_SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, status }
}
