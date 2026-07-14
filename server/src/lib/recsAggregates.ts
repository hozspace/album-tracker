import type { Log } from '../types/log.js'

const TOP_N = 5
const ERA_BUCKET_SIZE = 10

export interface RecsAggregateHints {
  topArtists: string[]
  topEras: string[]
  monthCounts: { month: string; count: number }[]
}

// Pure aggregation over a listener's logs: which artists and eras they rate
// highest on average, and how many albums they log per month. All inputs
// (rating, year, listenedOn) already live on the log rows, so this needs no
// clock and produces the same output for the same logs every time.
export function buildRecsAggregates(logs: Log[]): RecsAggregateHints {
  return {
    topArtists: topByAverageRating(logs, (log) => log.artist),
    topEras: topByAverageRating(logs, (log) => eraLabel(log.year)),
    monthCounts: monthCounts(logs),
  }
}

function topByAverageRating(logs: Log[], keyFn: (log: Log) => string | null, limit = TOP_N): string[] {
  const groups = new Map<string, { total: number; count: number }>()

  for (const log of logs) {
    const key = keyFn(log)
    if (!key) continue
    const group = groups.get(key) ?? { total: 0, count: 0 }
    group.total += log.rating
    group.count += 1
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .map(([key, { total, count }]) => ({ key, avg: total / count }))
    .sort((a, b) => b.avg - a.avg || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map((entry) => entry.key)
}

function eraLabel(year: number | null): string | null {
  if (year === null) return null
  const decade = Math.floor(year / ERA_BUCKET_SIZE) * ERA_BUCKET_SIZE
  return `${decade}s`
}

function monthCounts(logs: Log[]): { month: string; count: number }[] {
  const counts = new Map<string, number>()

  for (const log of logs) {
    const month = log.listenedOn.slice(0, 7)
    counts.set(month, (counts.get(month) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
}
