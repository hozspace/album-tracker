import type { MbReleaseGroup, MbReleaseGroupSearchResponse, ReleaseGroupSearchResult } from './types'

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'
const SEARCH_LIMIT = 8

// User-Agent is a forbidden header name in browser fetch; MusicBrainz allows
// anonymous unauthenticated requests at low volume without one.

function toSearchResult(releaseGroup: MbReleaseGroup): ReleaseGroupSearchResult {
  const artistCredit = releaseGroup['artist-credit'] ?? []
  const releaseDate = releaseGroup['first-release-date']

  return {
    mbid: releaseGroup.id,
    title: releaseGroup.title,
    artist: artistCredit.map((credit) => credit.name).join(', ') || 'Unknown artist',
    year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
  }
}

export async function searchReleaseGroups(
  query: string,
  signal?: AbortSignal,
): Promise<ReleaseGroupSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = `${MUSICBRAINZ_BASE}/release-group?query=${encodeURIComponent(trimmed)}&fmt=json&limit=${SEARCH_LIMIT}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error('MusicBrainz search failed.')
  }

  const body = (await response.json()) as MbReleaseGroupSearchResponse
  return body['release-groups'].map(toSearchResult)
}
