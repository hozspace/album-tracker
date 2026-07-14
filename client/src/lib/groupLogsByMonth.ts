import type { Log } from '../api/types'
import { monthKey, monthLabel } from './date'

export interface MonthGroup {
  key: string
  label: string
  logs: Log[]
}

export function groupLogsByMonth(logs: Log[]): MonthGroup[] {
  const sorted = [...logs].sort((a, b) => b.listenedOn.localeCompare(a.listenedOn))

  return sorted.reduce<MonthGroup[]>((groups, log) => {
    const key = monthKey(log.listenedOn)
    const current = groups.at(-1)

    if (current && current.key === key) {
      const updatedGroup: MonthGroup = { ...current, logs: [...current.logs, log] }
      return [...groups.slice(0, -1), updatedGroup]
    }

    return [...groups, { key, label: monthLabel(log.listenedOn), logs: [log] }]
  }, [])
}
