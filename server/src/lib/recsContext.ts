import type { RecsAggregateHints } from './recsAggregates.js'

const COLD_START_LOG_THRESHOLD = 5

export interface RecsContextLog {
  title: string
  artist: string
  year: number | null
  rating: number
  relisten: boolean
  faveTrack: string | null
  note: string | null
}

export interface RecsContextPastRec {
  artist: string
  title: string
  status: 'pending' | 'logged' | 'dismissed'
}

export interface RecsContextSeed {
  genre?: string
  artist?: string
}

export interface BuildRecsContextInput {
  logs: RecsContextLog[]
  aggregates: RecsAggregateHints
  pastRecs: RecsContextPastRec[]
  seed?: RecsContextSeed
}

// Pure function: builds the user message sent to Claude from already-fetched
// data. No clock, no randomness — the same input always produces the same
// context string, which keeps this unit-testable and keeps prompt caching
// effective in production.
export function buildRecsContext(input: BuildRecsContextInput): string {
  const { logs, aggregates, pastRecs, seed } = input
  const hasSeed = Boolean(seed?.genre || seed?.artist)
  const isColdStart = logs.length < COLD_START_LOG_THRESHOLD || hasSeed

  const sections: string[] = []

  if (hasSeed && seed) {
    sections.push(buildSeedSection(seed))
  } else if (isColdStart) {
    sections.push(buildColdStartNotice(logs.length))
  }

  sections.push(logs.length > 0 ? buildLogsSection(logs) : 'The listener has no logged albums yet.')

  if (!isColdStart) {
    const aggregateSection = buildAggregatesSection(aggregates)
    if (aggregateSection) sections.push(aggregateSection)
  }

  sections.push(buildPastRecsSection(pastRecs))

  return sections.join('\n\n')
}

function buildSeedSection(seed: RecsContextSeed): string {
  const parts: string[] = []
  if (seed.genre) parts.push(`genre ${seed.genre}`)
  if (seed.artist) parts.push(`artist ${seed.artist}`)
  return `The listener wants recommendations seeded from: ${parts.join(' / ')}`
}

function buildColdStartNotice(logCount: number): string {
  return `The listener is new and has only ${logCount} logged album${logCount === 1 ? '' : 's'} so far. Recommend broadly appealing, well-regarded albums as a strong starting point, informed by whatever is logged below.`
}

function buildLogsSection(logs: RecsContextLog[]): string {
  const lines = logs.map((log) => {
    const parts = [`${log.artist} — ${log.title}${log.year ? ` (${log.year})` : ''}`]
    parts.push(`rating ${log.rating}/5${log.relisten ? ', relisten' : ', no relisten'}`)
    if (log.faveTrack) parts.push(`fave track "${log.faveTrack}"`)
    if (log.note) parts.push(`note: ${log.note}`)
    return `- ${parts.join('; ')}`
  })
  return `Listening history (${logs.length} most recent, newest first):\n${lines.join('\n')}`
}

function buildAggregatesSection(aggregates: RecsAggregateHints): string {
  const lines: string[] = []

  if (aggregates.topArtists.length > 0) {
    lines.push(`Top-rated artists: ${aggregates.topArtists.join(', ')}`)
  }
  if (aggregates.topEras.length > 0) {
    lines.push(`Top-rated eras: ${aggregates.topEras.join(', ')}`)
  }
  if (aggregates.monthCounts.length > 0) {
    const counts = aggregates.monthCounts.map((entry) => `${entry.month}: ${entry.count}`).join(', ')
    lines.push(`Listening cadence by month: ${counts}`)
  }

  return lines.length > 0 ? `Aggregate signals:\n${lines.join('\n')}` : ''
}

function buildPastRecsSection(pastRecs: RecsContextPastRec[]): string {
  if (pastRecs.length === 0) return 'No past recommendations yet — nothing to avoid repeating.'

  const names = pastRecs.map((rec) => `${rec.artist} — ${rec.title}`)
  const dismissedNames = pastRecs
    .filter((rec) => rec.status === 'dismissed')
    .map((rec) => `${rec.artist} — ${rec.title}`)

  const lines = [`Never recommend any of these again — already recommended: ${names.join('; ')}`]
  if (dismissedNames.length > 0) {
    lines.push(
      `The listener dismissed these — treat each as a mild negative signal about that artist or style, not a hard rule against the genre: ${dismissedNames.join('; ')}`,
    )
  }
  return lines.join('\n')
}
