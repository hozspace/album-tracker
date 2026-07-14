import { describe, expect, test } from 'vitest'
import type { Log } from '../api/types'
import { groupLogsByMonth } from './groupLogsByMonth'

function makeLog(overrides: Partial<Log>): Log {
  return {
    id: '1',
    mbid: 'mbid',
    title: 'Title',
    artist: 'Artist',
    year: 2020,
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

describe('groupLogsByMonth', () => {
  test('returns an empty array for no logs', () => {
    expect(groupLogsByMonth([])).toEqual([])
  })

  test('groups logs from the same month together', () => {
    const logs = [
      makeLog({ id: '1', listenedOn: '2026-07-03' }),
      makeLog({ id: '2', listenedOn: '2026-07-01' }),
    ]

    const groups = groupLogsByMonth(logs)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.logs.map((l) => l.id)).toEqual(['1', '2'])
  })

  test('splits logs into separate groups by month, newest first', () => {
    const logs = [
      makeLog({ id: '1', listenedOn: '2026-06-15' }),
      makeLog({ id: '2', listenedOn: '2026-07-10' }),
    ]

    const groups = groupLogsByMonth(logs)

    expect(groups.map((g) => g.key)).toEqual(['2026-07', '2026-06'])
    expect(groups[0]!.logs.map((l) => l.id)).toEqual(['2'])
    expect(groups[1]!.logs.map((l) => l.id)).toEqual(['1'])
  })

  test('does not mutate the input array', () => {
    const logs = [makeLog({ id: '1', listenedOn: '2026-07-03' })]
    const copy = [...logs]

    groupLogsByMonth(logs)

    expect(logs).toEqual(copy)
  })
})
