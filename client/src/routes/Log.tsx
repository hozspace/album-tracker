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

interface EditValues {
  rating: number
  faveTrack: string | null
  listenedOn: string
  relisten: boolean
  note: string | null
}

interface LocationState {
  album?: SelectedAlbum
  editLogId?: string
  editValues?: EditValues
}

export function Log() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as LocationState | null) ?? null
  const prefill = state?.album ?? null
  const editLogId = state?.editLogId
  const editValues = state?.editValues

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
      <LogForm
        album={selected}
        editLogId={editLogId}
        editValues={editValues}
        onDone={() => navigate(editLogId ? `/album/${editLogId}` : '/')}
        onChangeAlbum={() => setSelected(null)}
      />
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
                <AlbumArt src={coverArtUrl(result.mbid)} alt={`${result.title} cover art`} title={result.title} treat={false} />
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
  editLogId?: string
  editValues?: EditValues
  onDone: () => void
  onChangeAlbum: () => void
}

function LogForm({ album, editLogId, editValues, onDone, onChangeAlbum }: LogFormProps) {
  const [rating, setRating] = useState(editValues?.rating ?? 3)
  const [faveTrack, setFaveTrack] = useState(editValues?.faveTrack ?? '')
  const [listenedOn, setListenedOn] = useState(editValues?.listenedOn ?? todayIsoDate())
  const [relisten, setRelisten] = useState(editValues?.relisten ?? false)
  const [note, setNote] = useState(editValues?.note ?? '')
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
      if (editLogId) {
        await api.updateLog(editLogId, payload)
      } else {
        await api.createLog(payload)
      }
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
          <AlbumArt src={coverArtUrl(album.mbid)} alt={`${album.title} cover art`} title={album.title} treat={false} />
        </div>
        <div className="log-form__selected-meta">
          <span className="log-form__title">{album.title}</span>
          <span className="log-form__artist">{album.artist}</span>
        </div>
      </button>

      <div className="log-form__field">
        <span className="log-form__label">Rating</span>
        <RatingControl value={rating} onChange={setRating} />
      </div>

      <div className="log-form__field">
        <span className="log-form__label">Favourite song</span>
        <FaveTrackPicker tracks={tracks} value={faveTrack} onChange={setFaveTrack} />
      </div>

      <div className="log-form__field">
        <span className="log-form__label">Listened</span>
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
          <span className="log-form__relisten-text">Relisten</span>
          <span className={relisten ? 'log-form__relisten-value log-form__relisten-value--yes' : 'log-form__relisten-value'}>
            {relisten ? 'Yes' : 'No'}
          </span>
        </label>
      </div>

      <div className="log-form__field">
        <span className="log-form__label">Note</span>
        <textarea
          className="log-form__note"
          placeholder="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {submitError && <p className="error-state">{submitError}</p>}

      <button type="submit" className="log-form__submit" disabled={submitting}>
        {editLogId ? 'Save' : 'Log'}
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
