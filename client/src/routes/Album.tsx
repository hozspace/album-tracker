import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { api } from '../api/client'
import type { Log } from '../api/types'
import { AlbumArt } from '../components/AlbumArt'
import { BottomNav } from '../components/BottomNav'
import { RatingControl } from '../components/RatingControl/RatingControl'
import { TopBar } from '../components/TopBar'
import { errorMessage } from '../lib/errorMessage'
import { fetchTracklist } from '../musicbrainz/tracklist'
import type { Track } from '../musicbrainz/types'
import './Album.css'

type AlbumState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; log: Log }

export function Album() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<AlbumState>({ status: 'loading' })
  const [tracks, setTracks] = useState<Track[] | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    api
      .getLog(id)
      .then((log) => {
        if (cancelled) return
        setState({ status: 'ready', log })
        fetchTracklist(log.mbid).then((result) => {
          if (!cancelled) setTracks(result)
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(error) })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <>
      <TopBar />
      <main data-screen="album">
        <AlbumBody state={state} tracks={tracks} onLogAgain={(log) => navigateToLog(navigate, log)} />
      </main>
      <BottomNav />
    </>
  )
}

function navigateToLog(navigate: ReturnType<typeof useNavigate>, log: Log) {
  navigate('/log', {
    state: { album: { mbid: log.mbid, title: log.title, artist: log.artist, year: log.year } },
  })
}

interface AlbumBodyProps {
  state: AlbumState
  tracks: Track[] | null
  onLogAgain: (log: Log) => void
}

function AlbumBody({ state, tracks, onLogAgain }: AlbumBodyProps) {
  if (state.status === 'loading') return null

  if (state.status === 'error') {
    return <p className="error-state">{state.message}</p>
  }

  const { log } = state

  return (
    <article className="album-detail">
      <div className="album-detail__hero">
        <AlbumArt src={log.artUrl} alt={`${log.title} cover art`} />
      </div>

      <h1 className="album-detail__title">{log.title}</h1>
      <p className="album-detail__artist">
        {log.artist}
        {log.year ? ` · ${log.year}` : ''}
      </p>

      <dl className="album-detail__user-block">
        <dt>Rating</dt>
        <dd>
          <RatingControl value={log.rating} readOnly />
        </dd>

        <dt>Listened</dt>
        <dd>{log.listenedOn}</dd>

        {log.faveTrack && (
          <>
            <dt>Favourite</dt>
            <dd>{log.faveTrack}</dd>
          </>
        )}

        <dt>Relisten</dt>
        <dd>{log.relisten ? 'Yes' : 'No'}</dd>

        {log.note && (
          <>
            <dt>Note</dt>
            <dd>{log.note}</dd>
          </>
        )}
      </dl>

      <button type="button" className="album-detail__relog" onClick={() => onLogAgain(log)}>
        Log again
      </button>

      {tracks && tracks.length > 0 && (
        <ol className="album-detail__tracklist">
          {tracks.map((track) => (
            <li
              key={track.position}
              className={track.title === log.faveTrack ? 'album-detail__track--fave' : undefined}
            >
              {track.title}
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
