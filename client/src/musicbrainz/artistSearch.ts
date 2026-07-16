import type { ArtistSearchResult, MbArtistSearchResponse } from './types'

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'
const SEARCH_LIMIT = 5

// User-Agent is a forbidden header name in browser fetch; MusicBrainz allows
// anonymous unauthenticated requests at low volume without one.

export async function searchArtists(query: string, signal?: AbortSignal): Promise<ArtistSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = `${MUSICBRAINZ_BASE}/artist?query=${encodeURIComponent(trimmed)}&fmt=json&limit=${SEARCH_LIMIT}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error('MusicBrainz search failed.')
  }

  const body = (await response.json()) as MbArtistSearchResponse
  return body.artists.map((artist) => ({ mbid: artist.id, name: artist.name }))
}
