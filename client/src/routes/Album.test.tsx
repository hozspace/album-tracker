import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import type { Log } from '../api/types'
import { Album } from './Album'
import { Log as LogRoute } from './Log'
import { Diary } from './Diary'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      getLog: vi.fn(),
      getLogs: vi.fn(),
      getStats: vi.fn(),
      deleteLog: vi.fn(),
      createLog: vi.fn(),
      updateLog: vi.fn(),
    },
  }
})

vi.mock('../musicbrainz/tracklist', () => ({
  fetchTracklist: vi.fn(() => Promise.resolve(null)),
}))

function makeLog(overrides: Partial<Log> = {}): Log {
  return {
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
    ...overrides,
  }
}

function renderAlbum(id = '42') {
  return render(
    <MemoryRouter initialEntries={[`/album/${id}`]}>
      <Routes>
        <Route path="/" element={<Diary />} />
        <Route path="/log" element={<LogRoute />} />
        <Route path="/album/:id" element={<Album />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Album — edit action', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('navigates to the log form with every field prefilled for editing', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())

    renderAlbum()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('Great record')).toBeInTheDocument()
  })

  test('saving an edit PUTs to /api/logs/:id and returns to the album page', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())
    vi.mocked(api.updateLog).mockResolvedValue(makeLog({ note: 'Updated note' }))

    renderAlbum()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.updateLog).toHaveBeenCalledWith('42', expect.objectContaining({ title: 'OK Computer' }))
    })
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

describe('Album — delete action', () => {
  beforeEach(() => {
    vi.mocked(api.getLogs).mockResolvedValue({ logs: [], total: 0 })
    vi.mocked(api.getStats).mockResolvedValue({ total: 0, monthCount: 0, monthAvg: null })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('clicking Delete shows an inline confirm instead of deleting immediately', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())

    renderAlbum()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(screen.getByText('Delete this log?')).toBeInTheDocument()
    expect(api.deleteLog).not.toHaveBeenCalled()
  })

  test('cancelling the confirm step leaves the log untouched', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())

    renderAlbum()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Delete this log?')).not.toBeInTheDocument()
    expect(api.deleteLog).not.toHaveBeenCalled()
  })

  test('confirming delete calls DELETE /api/logs/:id and navigates to the diary', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())
    vi.mocked(api.deleteLog).mockResolvedValue(null)

    renderAlbum()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => {
      expect(api.deleteLog).toHaveBeenCalledWith('42')
    })
    expect(await screen.findByText('Nothing logged yet.')).toBeInTheDocument()
  })

  test('shows a human error message when delete fails', async () => {
    vi.mocked(api.getLog).mockResolvedValue(makeLog())
    vi.mocked(api.deleteLog).mockRejectedValue(new Error("Can't reach the server."))

    renderAlbum()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => {
      expect(screen.getByText(/reach the server/i)).toBeInTheDocument()
    })
  })
})
