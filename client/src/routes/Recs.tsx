import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import type { Rec } from '../api/types'
import { AlbumArt } from '../components/AlbumArt'
import { ArtistAutocomplete } from '../components/ArtistAutocomplete'
import { Screen } from '../components/Screen'
import { errorMessage } from '../lib/errorMessage'
import { GENRES } from '../lib/genres'
import { clampCarouselIndex, nextCarouselIndex } from '../lib/recsCarousel'
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
            <select value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option value="">Any genre</option>
              {GENRES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ArtistAutocomplete value={artist} onChange={setArtist} />
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

  return <RecsCarousel recs={state.recs} onLogIt={onLogIt} onDismiss={onDismiss} />
}

interface RecsCarouselProps {
  recs: Rec[]
  onLogIt: (rec: Rec) => void
  onDismiss: (rec: Rec) => void
}

/**
 * Renders every rec, always — theme-blind, same markup under both themes.
 * Under theme-minimal this is just "the list" as it's always been: CSS
 * applies no positioning trickery, so every `.recs__card` is visible.
 * Under theme-teletext, CSS hides every card except the one flagged
 * `data-active`, turning the same list into a P300 "subpage" carousel —
 * the `.recs__next` control (also always rendered, CSS-hidden under
 * minimal) advances `activeIndex`. See RatingControl for the same
 * "always render both, let CSS pick" pattern.
 */
function RecsCarousel({ recs, onLogIt, onDismiss }: RecsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const boundedIndex = clampCarouselIndex(activeIndex, recs.length)

  function handleNext() {
    setActiveIndex((current) => nextCarouselIndex(clampCarouselIndex(current, recs.length), recs.length))
  }

  return (
    <>
      <p className="recs__tt-header">NOW TUNE TO&hellip;</p>
      <ul className="recs__list">
        {recs.map((rec, index) => (
          <RecCard
            key={rec.id}
            rec={rec}
            index={index}
            total={recs.length}
            active={index === boundedIndex}
            onLogIt={onLogIt}
            onDismiss={onDismiss}
          />
        ))}
      </ul>
      <button type="button" className="recs__next" onClick={handleNext}>
        Next
      </button>
    </>
  )
}

interface RecCardProps {
  rec: Rec
  index: number
  total: number
  active: boolean
  onLogIt: (rec: Rec) => void
  onDismiss: (rec: Rec) => void
}

function RecCard({ rec, index, total, active, onLogIt, onDismiss }: RecCardProps) {
  return (
    <li className="recs__card" data-active={active ? 'true' : undefined}>
      <span className="recs__subpage" aria-hidden="true">{`${index + 1}/${total}`}</span>
      <div className="recs__art">
        <AlbumArt src={rec.artUrl} alt={`${rec.title} cover art`} title={rec.title} />
      </div>
      <div className="recs__body">
        <span className="recs__title">{rec.title}</span>
        <span className="recs__meta">
          <span className="recs__artist">{rec.artist}</span>
          {rec.year ? <span className="recs__year"> · {rec.year}</span> : null}
        </span>
        <p className="recs__because">{rec.because}</p>
        <span className="recs__mode">{rec.mode}</span>
        <div className="recs__actions">
          <button type="button" className="recs__logit" onClick={() => onLogIt(rec)}>
            <span className="recs__action-label">Log it</span>
          </button>
          <button type="button" className="recs__dismiss" onClick={() => onDismiss(rec)}>
            <span className="recs__action-label">Dismiss</span>
          </button>
        </div>
      </div>
    </li>
  )
}
