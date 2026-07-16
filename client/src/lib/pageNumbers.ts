const PAGE_NUMBERS: Record<string, number> = {
  diary: 101,
  log: 102,
  recs: 300,
  settings: 400,
}

const DEFAULT_PAGE_NUMBER = 100
const ALBUM_PAGE_BASE = 200
const ALBUM_PAGE_RANGE = 100
const HASH_MULTIPLIER = 31

/** Static page number for a named screen, per the CEEFAX page-numbering scheme. */
export function pageNumberForScreen(screen: string): number {
  return PAGE_NUMBERS[screen] ?? DEFAULT_PAGE_NUMBER
}

/** Deterministic P2xx page number for an album detail page, derived from its log id. */
export function pageNumberForAlbum(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash * HASH_MULTIPLIER + id.charCodeAt(index)) >>> 0
  }
  return ALBUM_PAGE_BASE + (hash % ALBUM_PAGE_RANGE)
}
