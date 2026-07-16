export interface ReleaseGroupSearchResult {
  mbid: string
  title: string
  artist: string
  year: number | null
}

export interface Track {
  position: number
  title: string
}

interface MbArtistCredit {
  name: string
}

interface MbReleaseGroup {
  id: string
  title: string
  'first-release-date'?: string
  'artist-credit'?: MbArtistCredit[]
}

export interface MbReleaseGroupSearchResponse {
  'release-groups': MbReleaseGroup[]
}

export interface ArtistSearchResult {
  mbid: string
  name: string
}

interface MbArtist {
  id: string
  name: string
}

export interface MbArtistSearchResponse {
  artists: MbArtist[]
}

export interface MbReleaseSummary {
  id: string
  status?: string
  date?: string
}

interface MbReleaseGroupReleasesResponse {
  releases?: MbReleaseSummary[]
}

interface MbTrack {
  number: string
  title: string
}

interface MbMedium {
  tracks?: MbTrack[]
}

interface MbReleaseRecordingsResponse {
  media?: MbMedium[]
}

export type { MbReleaseGroup, MbReleaseGroupReleasesResponse, MbReleaseRecordingsResponse }
