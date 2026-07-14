import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../api/client'
import type { NewLog } from '../api/types'
import { AlbumArt } from '../components/AlbumArt'
import { RatingControl } from '../components/RatingControl/RatingControl'
import { Screen } from '../components/Screen'
import { errorMessage } from '../lib/errorMessage'
import { todayIsoDate } from '../lib/date'
import { coverArtUrl } from '../musicbrainz/coverArt'
import { fetchTracklist } from '../musicbrainz/tracklist'
import { useReleaseGroupSearch } from '../musicbrainz/useReleaseGroupSearch'
import type { ReleaseGroupSearchResult, Track } from '../musicbrainz/types'
import './Log.css'

interface SelectedAlbum {
  mbid: string
  title: string
  artist: string
  year: number | null
}

interface LocationState {
  album?: SelectedAlbum
}

export function Log() {
  const location = useLocation()
  const navigate = useNavigate()
  const prefill = (location.state as LocationState | null)?.album ?? null

  const [selected, setSelected] = useState<SelectedAlbum | null>(prefill)

  if (!selected) {
    return (
      <Screen screen="log" title="Log">
        <AlbumSearch onSelect={setSelected} />
      </Screen>
    )
  }

  return (
    <Screen screen="log" title="Log">
      <LogForm album={selected} onDone={() => navigate('/')} onChangeAlbum={() => setSelected(null)} />
    </Screen>
  )
}

function AlbumSearch({ onSelect }: { onSelect: (album: ReleaseGroupSearchResult) => void }) {
  const [query, setQuery] = useState('')
  const { results, status } = useReleaseGroupSearch(query)

  return (
    <div className="album-search">
      <input
        type="search"
        className="album-search__input"
        placeholder="Search albums"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoFocus
      />
      {status === 'error' && <p className="error-state">Search isn't working right now.</p>}
      {status === 'idle' && query.trim() && results.length === 0 && (
        <p className="empty-state">No albums found.</p>
      )}
      <ul className="album-search__results">
        {results.map((result) => (
          <li key={result.mbid}>
            <button
              type="button"
              className="album-search__result"
              onClick={() => onSelect(result)}
            >
              <div className="album-search__art">
                <AlbumArt src={coverArtUrl(result.mbid)} alt={`${result.title} cover art`} />
              </div>
              <div className="album-search__meta">
                <span className="album-search__title">{result.title}</span>
                <span className="album-search__artist">
                  {result.artist}
                  {result.year ? ` · ${result.year}` : ''}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface LogFormProps {
  album: SelectedAlbum
  onDone: () => void
  onChangeAlbum: () => void
}

function LogForm({ album, onDone, onChangeAlbum }: LogFormProps) {
  const [rating, setRating] = useState(3)
  const [faveTrack, setFaveTrack] = useState('')
  const [listenedOn, setListenedOn] = useState(todayIsoDate())
  const [relisten, setRelisten] = useState(false)
  const [note, setNote] = useState('')
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    fetchTracklist(album.mbid, controller.signal).then((result) => {
      if (!cancelled) setTracks(result)
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [album.mbid])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const payload: NewLog = {
      mbid: album.mbid,
      title: album.title,
      artist: album.artist,
      year: album.year,
      artUrl: coverArtUrl(album.mbid),
      rating,
      faveTrack: faveTrack.trim() || null,
      listenedOn,
      relisten,
      note: note.trim() || null,
    }

    try {
      await api.createLog(payload)
      onDone()
    } catch (error) {
      setSubmitError(errorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form className="log-form" onSubmit={handleSubmit}>
      <button type="button" className="log-form__selected" onClick={onChangeAlbum}>
        <div className="log-form__art">
          <AlbumArt src={coverArtUrl(album.mbid)} alt={`${album.title} cover art`} />
        </div>
        <div className="log-form__selected-meta">
          <span className="log-form__title">{album.title}</span>
          <span className="log-form__artist">{album.artist}</span>
        </div>
      </button>

      <div className="log-form__field">
        <RatingControl value={rating} onChange={setRating} />
      </div>

      <div className="log-form__field">
        <FaveTrackPicker tracks={tracks} value={faveTrack} onChange={setFaveTrack} />
      </div>

      <div className="log-form__field">
        <input
          type="date"
          className="log-form__date"
          value={listenedOn}
          onChange={(event) => setListenedOn(event.target.value)}
        />
      </div>

      <div className="log-form__field log-form__relisten">
        <label>
          <input
            type="checkbox"
            checked={relisten}
            onChange={(event) => setRelisten(event.target.checked)}
          />
          Relisten
        </label>
      </div>

      <div className="log-form__field">
        <textarea
          className="log-form__note"
          placeholder="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {submitError && <p className="error-state">{submitError}</p>}

      <button type="submit" className="log-form__submit" disabled={submitting}>
        Log
      </button>
    </form>
  )
}

interface FaveTrackPickerProps {
  tracks: Track[] | null
  value: string
  onChange: (value: string) => void
}

function FaveTrackPicker({ tracks, value, onChange }: FaveTrackPickerProps) {
  if (tracks && tracks.length > 0) {
    return (
      <select
        className="log-form__fave-track"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Favourite song</option>
        {tracks.map((track) => (
          <option key={track.position} value={track.title}>
            {track.position}. {track.title}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="text"
      className="log-form__fave-track"
      placeholder="Favourite song"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
