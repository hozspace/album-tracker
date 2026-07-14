import { describe, it, expect } from 'vitest'
import { buildRecsContext, type RecsContextLog, type RecsContextPastRec } from './recsContext.js'
import type { RecsAggregateHints } from './recsAggregates.js'

const EMPTY_AGGREGATES: RecsAggregateHints = { topArtists: [], topEras: [], monthCounts: [] }

function makeLog(overrides: Partial<RecsContextLog> = {}): RecsContextLog {
  return {
    title: 'OK Computer',
    artist: 'Radiohead',
    year: 1997,
    rating: 4.5,
    relisten: true,
    faveTrack: 'Paranoid Android',
    note: null,
    ...overrides,
  }
}

describe('buildRecsContext — history mode', () => {
  it('lists recent logs with rating, relisten, fave track, and note', () => {
    const context = buildRecsContext({
      logs: [makeLog({ note: 'second half drags a bit' })],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
    })

    expect(context).toContain('Radiohead — OK Computer (1997)')
    expect(context).toContain('rating 4.5/5, relisten')
    expect(context).toContain('fave track "Paranoid Android"')
    expect(context).toContain('note: second half drags a bit')
  })

  it('includes aggregate hints when there is enough history and no seed', () => {
    const context = buildRecsContext({
      logs: Array.from({ length: 6 }, (_, i) => makeLog({ title: `Album ${i}` })),
      aggregates: {
        topArtists: ['Radiohead', 'Björk'],
        topEras: ['1990s'],
        monthCounts: [{ month: '2026-07', count: 3 }],
      },
      pastRecs: [],
    })

    expect(context).toContain('Top-rated artists: Radiohead, Björk')
    expect(context).toContain('Top-rated eras: 1990s')
    expect(context).toContain('Listening cadence by month: 2026-07: 3')
  })

  it('is deterministic for identical input', () => {
    const input = {
      logs: [makeLog()],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
    }

    expect(buildRecsContext(input)).toBe(buildRecsContext(input))
  })
})

describe('buildRecsContext — cold-start mode', () => {
  it('leads with a cold-start notice when fewer than 5 logs exist and no seed is given', () => {
    const context = buildRecsContext({
      logs: [makeLog()],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
    })

    expect(context.startsWith('The listener is new and has only 1 logged album')).toBe(true)
  })

  it('leads with the seed line when a seed is supplied, even with plenty of history', () => {
    const context = buildRecsContext({
      logs: Array.from({ length: 10 }, (_, i) => makeLog({ title: `Album ${i}` })),
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
      seed: { genre: 'shoegaze' },
    })

    expect(context.startsWith('The listener wants recommendations seeded from: genre shoegaze')).toBe(true)
  })

  it('combines genre and artist seeds', () => {
    const context = buildRecsContext({
      logs: [],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
      seed: { genre: 'shoegaze', artist: 'My Bloody Valentine' },
    })

    expect(context).toContain('genre shoegaze / artist My Bloody Valentine')
  })

  it('omits aggregate hints during cold start', () => {
    const context = buildRecsContext({
      logs: [makeLog()],
      aggregates: { topArtists: ['Radiohead'], topEras: ['1990s'], monthCounts: [] },
      pastRecs: [],
    })

    expect(context).not.toContain('Top-rated artists')
  })

  it('handles zero logs gracefully', () => {
    const context = buildRecsContext({
      logs: [],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
      seed: { artist: 'Aphex Twin' },
    })

    expect(context).toContain('The listener has no logged albums yet.')
  })
})

describe('buildRecsContext — do-not-repeat list', () => {
  const pastRecs: RecsContextPastRec[] = [
    { artist: 'Boards of Canada', title: 'Geogaddi', status: 'logged' },
    { artist: 'Burial', title: 'Untrue', status: 'dismissed' },
    { artist: 'Four Tet', title: 'Rounds', status: 'pending' },
  ]

  it('lists every past recommendation as a do-not-repeat item regardless of status', () => {
    const context = buildRecsContext({
      logs: [makeLog()],
      aggregates: EMPTY_AGGREGATES,
      pastRecs,
    })

    expect(context).toContain('Never recommend any of these again')
    expect(context).toContain('Boards of Canada — Geogaddi')
    expect(context).toContain('Burial — Untrue')
    expect(context).toContain('Four Tet — Rounds')
  })

  it('calls out dismissed recs as a soft negative signal, separate from the hard do-not-repeat rule', () => {
    const context = buildRecsContext({
      logs: [makeLog()],
      aggregates: EMPTY_AGGREGATES,
      pastRecs,
    })

    expect(context).toContain('The listener dismissed these')
    expect(context).toContain('Burial — Untrue')
    // Logged/pending recs should not appear in the dismissed line.
    const dismissedLine = context.split('\n').find((line) => line.startsWith('The listener dismissed'))
    expect(dismissedLine).not.toContain('Boards of Canada')
  })

  it('says there is nothing to avoid when there are no past recommendations', () => {
    const context = buildRecsContext({
      logs: [makeLog()],
      aggregates: EMPTY_AGGREGATES,
      pastRecs: [],
    })

    expect(context).toContain('No past recommendations yet')
  })
})
