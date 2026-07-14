import type {
  MbReleaseGroupReleasesResponse,
  MbReleaseRecordingsResponse,
  MbReleaseSummary,
  Track,
} from './types'

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'

function pickEarliestRelease(releases: MbReleaseSummary[]): MbReleaseSummary | null {
  if (releases.length === 0) return null

  const dated = releases.filter((release) => release.date)
  const official = dated.filter((release) => release.status === 'Official')
  const pool = official.length > 0 ? official : dated

  if (pool.length === 0) return releases[0] ?? null

  return [...pool].sort((a, b) => a.date!.localeCompare(b.date!))[0]!
}

export async function fetchTracklist(mbid: string, signal?: AbortSignal): Promise<Track[] | null> {
  try {
    const rgResponse = await fetch(
      `${MUSICBRAINZ_BASE}/release-group/${mbid}?inc=releases&fmt=json`,
      { signal },
    )
    if (!rgResponse.ok) return null

    const rgBody = (await rgResponse.json()) as MbReleaseGroupReleasesResponse
    const release = pickEarliestRelease(rgBody.releases ?? [])
    if (!release) return null

    const releaseResponse = await fetch(
      `${MUSICBRAINZ_BASE}/release/${release.id}?inc=recordings&fmt=json`,
      { signal },
    )
    if (!releaseResponse.ok) return null

    const releaseBody = (await releaseResponse.json()) as MbReleaseRecordingsResponse
    const tracks = (releaseBody.media ?? []).flatMap((medium) => medium.tracks ?? [])
    if (tracks.length === 0) return null

    return tracks.map((track) => ({
      position: Number(track.number),
      title: track.title,
    }))
  } catch {
    return null
  }
}
