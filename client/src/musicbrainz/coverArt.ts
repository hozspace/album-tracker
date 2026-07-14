export type CoverArtSize = 250 | 500

export function coverArtUrl(mbid: string, size: CoverArtSize = 250): string {
  return `https://coverartarchive.org/release-group/${mbid}/front-${size}`
}
