import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import type { Rec } from '../api/types'
import { AlbumArt } from '../components/AlbumArt'
import { Screen } from '../components/Screen'
import { errorMessage } from '../lib/errorMessage'
import '../styles/recs.css'

const COLD_START_LOG_THRESHOLD = 5

type RecsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; recs: Rec[] }

export function Recs() {
  const navigate = useNavigate()
  const [state, setState] = useState<RecsState>({ status: 'loading' })
  const [logCount, setLogCount] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [genre, setGenre] = useState('')
  const [artist, setArtist] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .getRecs()
      .then(({ recs }) => {
        if (!cancelled) setState({ status: 'ready', recs })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(error) })
      })

    api
      .getStats()
      .then((stats) => {
        if (!cancelled) setLogCount(stats.total)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  async function handleGenerate(event: FormEvent) {
    event.preventDefault()
    setGenerating(true)
    setGenerateError(null)

    const trimmedGenre = genre.trim()
    const trimmedArtist = artist.trim()
    const seed =
      trimmedGenre || trimmedArtist
        ? { ...(trimmedGenre ? { genre: trimmedGenre } : {}), ...(trimmedArtist ? { artist: trimmedArtist } : {}) }
        : undefined

    try {
      await api.generateRecs(seed)
      const { recs } = await api.getRecs()
      setState({ status: 'ready', recs })
      setGenre('')
      setArtist('')
    } catch (error) {
      setGenerateError(errorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  async function handleLogIt(rec: Rec) {
    try {
      await api.updateRecStatus(rec.id, 'logged')
      navigate('/log', {
        state: { album: { mbid: rec.mbid, title: rec.title, artist: rec.artist, year: rec.year } },
      })
    } catch (error) {
      setGenerateError(errorMessage(error))
    }
  }

  async function handleDismiss(rec: Rec) {
    try {
      await api.updateRecStatus(rec.id, 'dismissed')
      setState((current) =>
        current.status === 'ready'
          ? { status: 'ready', recs: current.recs.filter((item) => item.id !== rec.id) }
          : current,
      )
    } catch (error) {
      setGenerateError(errorMessage(error))
    }
  }

  const showSeedInputs = logCount !== null && logCount < COLD_START_LOG_THRESHOLD

  return (
    <Screen screen="recs" title="Recs">
      <form className="recs__generate" onSubmit={handleGenerate}>
        {showSeedInputs && (
          <div className="recs__seed">
            <input
              type="text"
              placeholder="Genre (optional)"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
            />
            <input
              type="text"
              placeholder="Artist (optional)"
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
            />
          </div>
        )}
        <button type="submit" disabled={generating}>
          {generating ? 'Getting recommendations…' : 'Get recommendations'}
        </button>
      </form>

      {generateError && <p className="error-state">{generateError}</p>}

      <RecsBody state={state} onLogIt={handleLogIt} onDismiss={handleDismiss} />
    </Screen>
  )
}

interface RecsBodyProps {
  state: RecsState
  onLogIt: (rec: Rec) => void
  onDismiss: (rec: Rec) => void
}

function RecsBody({ state, onLogIt, onDismiss }: RecsBodyProps) {
  if (state.status === 'loading') return null

  if (state.status === 'error') {
    return <p className="error-state">{state.message}</p>
  }

  if (state.recs.length === 0) {
    return <p className="empty-state">No recommendations yet.</p>
  }

  return (
    <ul className="recs__list">
      {state.recs.map((rec) => (
        <RecCard key={rec.id} rec={rec} onLogIt={onLogIt} onDismiss={onDismiss} />
      ))}
    </ul>
  )
}

interface RecCardProps {
  rec: Rec
  onLogIt: (rec: Rec) => void
  onDismiss: (rec: Rec) => void
}

function RecCard({ rec, onLogIt, onDismiss }: RecCardProps) {
  return (
    <li className="recs__card">
      <div className="recs__art">
        <AlbumArt src={rec.artUrl} alt={`${rec.title} cover art`} title={rec.title} />
      </div>
      <div className="recs__body">
        <span className="recs__title">{rec.title}</span>
        <span className="recs__artist">
          {rec.artist}
          {rec.year ? ` · ${rec.year}` : ''}
        </span>
        <p className="recs__because">{rec.because}</p>
        <span className="recs__mode">{rec.mode}</span>
        <div className="recs__actions">
          <button type="button" onClick={() => onLogIt(rec)}>
            Log it
          </button>
          <button type="button" onClick={() => onDismiss(rec)}>
            Dismiss
          </button>
        </div>
      </div>
    </li>
  )
}
