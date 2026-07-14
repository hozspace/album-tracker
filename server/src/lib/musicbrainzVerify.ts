const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'
const USER_AGENT = 'album-tracker/0.1 (https://github.com/hozspace/album-tracker)'
const RATE_LIMIT_DELAY_MS = 1000

export interface VerifiedMatch {
  mbid: string
  artUrl: string
}

interface MbReleaseGroupSearchResponse {
  'release-groups'?: Array<{ id: string }>
}

// Anti-hallucination check: confirms Claude's pick actually exists as a
// MusicBrainz release group before we ever show it to the listener or store
// it. Never throws — a network failure or missing match just means the rec
// gets dropped upstream; the failure is logged here for visibility.
export async function verifyReleaseGroup(artist: string, title: string): Promise<VerifiedMatch | null> {
  const query = `release:"${title}" AND artist:"${artist}"`
  const url = `${MUSICBRAINZ_BASE}/release-group?query=${encodeURIComponent(query)}&fmt=json`

  let response: Response
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  } catch (error) {
    console.error(`musicbrainz verification failed for "${artist} - ${title}":`, error)
    return null
  }

  if (!response.ok) {
    console.error(`musicbrainz verification failed for "${artist} - ${title}": status ${response.status}`)
    return null
  }

  let body: MbReleaseGroupSearchResponse
  try {
    body = (await response.json()) as MbReleaseGroupSearchResponse
  } catch (error) {
    console.error(`musicbrainz verification returned an unparsable response for "${artist} - ${title}":`, error)
    return null
  }

  const match = body['release-groups']?.[0]
  if (!match) {
    console.error(`musicbrainz verification found no match for "${artist} - ${title}" — dropping recommendation`)
    return null
  }

  return {
    mbid: match.id,
    artUrl: `https://coverartarchive.org/release-group/${match.id}/front-500`,
  }
}

// Verifies a batch of recommendations one at a time, respecting MusicBrainz's
// ~1 request/second rate limit. Unmatched recommendations are dropped
// (already logged inside verifyReleaseGroup). delayMs is overridable so tests
// don't have to wait on real timers.
export async function verifyRecommendations<T extends { artist: string; title: string }>(
  recommendations: T[],
  delayMs = RATE_LIMIT_DELAY_MS,
): Promise<(T & VerifiedMatch)[]> {
  const verified: (T & VerifiedMatch)[] = []

  for (const [index, rec] of recommendations.entries()) {
    const match = await verifyReleaseGroup(rec.artist, rec.title)
    if (match) verified.push({ ...rec, ...match })

    const isLast = index === recommendations.length - 1
    if (!isLast) await delay(delayMs)
  }

  return verified
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
