import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import { Log } from './Log'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: { ...actual.api, createLog: vi.fn(), updateLog: vi.fn() },
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

describe('Log — edit mode', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  function renderEdit() {
    return renderLog([
      {
        pathname: '/log',
        state: {
          album: { mbid: 'mbid-1', title: 'OK Computer', artist: 'Radiohead', year: 1997 },
          editLogId: '42',
          editValues: {
            rating: 4.5,
            faveTrack: 'Airbag',
            listenedOn: '2026-06-01',
            relisten: true,
            note: 'Great record',
          },
        },
      },
    ])
  }

  test('prefills all fields from the edit values and shows a Save button', () => {
    renderEdit()

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log' })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('Great record')).toBeInTheDocument()
  })

  test('submitting sends a PUT to /api/logs/:id with the edited payload and navigates to the album', async () => {
    vi.mocked(api.updateLog).mockResolvedValue({
      id: '42',
      mbid: 'mbid-1',
      title: 'OK Computer',
      artist: 'Radiohead',
      year: 1997,
      artUrl: null,
      rating: 4.5,
      faveTrack: 'Airbag',
      listenedOn: '2026-06-01',
      relisten: true,
      note: 'Great record',
      createdAt: '2026-06-01T00:00:00.000Z',
    })

    renderEdit()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.updateLog).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({
          mbid: 'mbid-1',
          title: 'OK Computer',
          artist: 'Radiohead',
          rating: 4.5,
          faveTrack: 'Airbag',
          listenedOn: '2026-06-01',
          relisten: true,
          note: 'Great record',
        }),
      )
    })
    expect(api.createLog).not.toHaveBeenCalled()
  })

  test('shows a human error message when the update fails', async () => {
    vi.mocked(api.updateLog).mockRejectedValue(new Error("Can't reach the server."))

    renderEdit()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/reach the server/i)).toBeInTheDocument()
    })
  })
})
