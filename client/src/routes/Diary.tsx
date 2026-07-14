import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import type { Log, Stats } from '../api/types'
import { AlbumArt } from '../components/AlbumArt'
import { RatingControl } from '../components/RatingControl/RatingControl'
import { Screen } from '../components/Screen'
import { dayOfMonth, weekdayLabel } from '../lib/date'
import { errorMessage } from '../lib/errorMessage'
import { groupLogsByMonth } from '../lib/groupLogsByMonth'
import './Diary.css'

const PAGE_SIZE = 50

type LogsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; logs: Log[] }

export function Diary() {
  const [state, setState] = useState<LogsState>({ status: 'loading' })
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false

    api
      .getLogs(PAGE_SIZE, 0)
      .then(({ logs }) => {
        if (!cancelled) setState({ status: 'ready', logs })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(error) })
      })

    api
      .getStats()
      .then((result) => {
        if (!cancelled) setStats(result)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Screen screen="diary" title="Diary">
      <DiaryBody state={state} />
      {stats && (
        <p className="diary__footer">
          {stats.monthCount} this month
          {stats.monthAvg !== null ? ` · avg ${stats.monthAvg.toFixed(1)}` : ''}
        </p>
      )}
    </Screen>
  )
}

function DiaryBody({ state }: { state: LogsState }) {
  if (state.status === 'loading') return null

  if (state.status === 'error') {
    return <p className="error-state">{state.message}</p>
  }

  if (state.logs.length === 0) {
    return <p className="empty-state">Nothing logged yet.</p>
  }

  const groups = groupLogsByMonth(state.logs)

  return (
    <div className="diary">
      {groups.map((group) => (
        <section key={group.key} className="diary__month">
          <h2 className="diary__month-header">{group.label}</h2>
          {group.logs.map((log) => (
            <DiaryRow key={log.id} log={log} />
          ))}
        </section>
      ))}
    </div>
  )
}

function DiaryRow({ log }: { log: Log }) {
  return (
    <Link to={`/album/${log.id}`} className="log-entry">
      <div className="log-entry__date">
        <span className="log-entry__day">{dayOfMonth(log.listenedOn)}</span>
        <span className="log-entry__weekday">{weekdayLabel(log.listenedOn)}</span>
      </div>
      <div className="log-entry__art">
        <AlbumArt src={log.artUrl} alt={`${log.title} cover art`} />
      </div>
      <div className="log-entry__meta">
        <span className="log-entry__title">{log.title}</span>
        <span className="log-entry__artist">{log.artist}</span>
        <RatingControl value={log.rating} readOnly />
      </div>
      {log.relisten && (
        <span className="log-entry__relisten" title="Relisten" aria-label="Relisten">
          ↻
        </span>
      )}
    </Link>
  )
}
