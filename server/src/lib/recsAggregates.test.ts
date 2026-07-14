import { describe, it, expect } from 'vitest'
import { buildRecsAggregates } from './recsAggregates.js'
import type { Log } from '../types/log.js'

function makeLog(overrides: Partial<Log> = {}): Log {
  return {
    id: 1,
    mbid: null,
    title: 'Album',
    artist: 'Artist',
    year: 2000,
    artUrl: null,
    rating: 4,
    faveTrack: null,
    listenedOn: '2026-07-01',
    relisten: false,
    note: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildRecsAggregates', () => {
  it('ranks artists by average rating, highest first', () => {
    const logs = [
      makeLog({ artist: 'Low Rated Band', rating: 2 }),
      makeLog({ artist: 'High Rated Band', rating: 5 }),
      makeLog({ artist: 'Mid Band', rating: 3.5 }),
    ]

    const { topArtists } = buildRecsAggregates(logs)

    expect(topArtists).toEqual(['High Rated Band', 'Mid Band', 'Low Rated Band'])
  })

  it('averages multiple logs by the same artist', () => {
    const logs = [
      makeLog({ artist: 'Radiohead', rating: 5 }),
      makeLog({ artist: 'Radiohead', rating: 3 }),
      makeLog({ artist: 'Björk', rating: 4 }),
    ]

    const { topArtists } = buildRecsAggregates(logs)

    // Radiohead avg 4, Björk avg 4 — tie broken alphabetically.
    expect(topArtists).toEqual(['Björk', 'Radiohead'])
  })

  it('buckets years into decade-labelled eras', () => {
    const logs = [
      makeLog({ year: 1997, rating: 5 }),
      makeLog({ year: 1999, rating: 4 }),
      makeLog({ year: 2015, rating: 2 }),
    ]

    const { topEras } = buildRecsAggregates(logs)

    expect(topEras[0]).toBe('1990s')
  })

  it('skips logs with no year when building eras', () => {
    const logs = [makeLog({ year: null, rating: 5 }), makeLog({ year: 2010, rating: 4 })]

    const { topEras } = buildRecsAggregates(logs)

    expect(topEras).toEqual(['2010s'])
  })

  it('counts logs per month, newest month first', () => {
    const logs = [
      makeLog({ listenedOn: '2026-06-01' }),
      makeLog({ listenedOn: '2026-07-01' }),
      makeLog({ listenedOn: '2026-07-15' }),
    ]

    const { monthCounts } = buildRecsAggregates(logs)

    expect(monthCounts).toEqual([
      { month: '2026-07', count: 2 },
      { month: '2026-06', count: 1 },
    ])
  })

  it('returns empty arrays for no logs', () => {
    expect(buildRecsAggregates([])).toEqual({ topArtists: [], topEras: [], monthCounts: [] })
  })
})
