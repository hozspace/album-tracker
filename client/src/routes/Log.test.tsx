import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import { Log } from './Log'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: { ...actual.api, createLog: vi.fn() },
  }
})

vi.mock('../musicbrainz/useReleaseGroupSearch', () => ({
  useReleaseGroupSearch: vi.fn(() => ({ results: [], status: 'idle' })),
}))

vi.mock('../musicbrainz/tracklist', () => ({
  fetchTracklist: vi.fn(() => Promise.resolve(null)),
}))

function renderLog(initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/log']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Log />
    </MemoryRouter>,
  )
}

describe('Log', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('shows the search field first', () => {
    renderLog()

    expect(screen.getByPlaceholderText('Search albums')).toBeInTheDocument()
  })

  test('renders search results returned by the MusicBrainz hook', async () => {
    const { useReleaseGroupSearch } = await import('../musicbrainz/useReleaseGroupSearch')
    vi.mocked(useReleaseGroupSearch).mockReturnValue({
      results: [{ mbid: 'mbid-1', title: 'OK Computer', artist: 'Radiohead', year: 1997 }],
      status: 'idle',
    })

    renderLog()

    expect(screen.getByText('OK Computer')).toBeInTheDocument()
    expect(screen.getByText('Radiohead · 1997')).toBeInTheDocument()
  })

  test('selecting a result moves to the log form with the album pinned', async () => {
    const { useReleaseGroupSearch } = await import('../musicbrainz/useReleaseGroupSearch')
    vi.mocked(useReleaseGroupSearch).mockReturnValue({
      results: [{ mbid: 'mbid-1', title: 'OK Computer', artist: 'Radiohead', year: 1997 }],
      status: 'idle',
    })

    renderLog()
    fireEvent.click(screen.getByText('OK Computer'))

    expect(await screen.findByRole('button', { name: 'Log' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Favourite song')).toBeInTheDocument()
  })

  test('starts directly on the form when an album is prefilled via navigation state', () => {
    renderLog([
      {
        pathname: '/log',
        state: { album: { mbid: 'mbid-1', title: 'OK Computer', artist: 'Radiohead', year: 1997 } },
      },
    ])

    expect(screen.queryByPlaceholderText('Search albums')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log' })).toBeInTheDocument()
  })

  test('submits the form and shows a human error message on API failure', async () => {
    vi.mocked(api.createLog).mockRejectedValue(new Error("Can't reach the server."))

    renderLog([
      {
        pathname: '/log',
        state: { album: { mbid: 'mbid-1', title: 'OK Computer', artist: 'Radiohead', year: 1997 } },
      },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Log' }))

    await waitFor(() => {
      expect(screen.getByText(/reach the server/i)).toBeInTheDocument()
    })
  })
})
