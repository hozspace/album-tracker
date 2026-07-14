import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import type { Log } from '../api/types'
import { Diary } from './Diary'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      getLogs: vi.fn(),
      getStats: vi.fn(),
    },
  }
})

function makeLog(overrides: Partial<Log>): Log {
  return {
    id: '1',
    mbid: 'mbid',
    title: 'OK Computer',
    artist: 'Radiohead',
    year: 1997,
    artUrl: null,
    rating: 4.5,
    faveTrack: 'Airbag',
    listenedOn: '2026-07-10',
    relisten: false,
    note: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

function renderDiary() {
  return render(
    <MemoryRouter>
      <Diary />
    </MemoryRouter>,
  )
}

describe('Diary', () => {
  beforeEach(() => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 0, monthCount: 0, monthAvg: null })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('renders a row per log once loaded', async () => {
    vi.mocked(api.getLogs).mockResolvedValue({ logs: [makeLog({})], total: 1 })

    renderDiary()

    expect(await screen.findByText('OK Computer')).toBeInTheDocument()
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
  })

  test('shows a quiet empty state with no logs', async () => {
    vi.mocked(api.getLogs).mockResolvedValue({ logs: [], total: 0 })

    renderDiary()

    expect(await screen.findByText('Nothing logged yet.')).toBeInTheDocument()
  })

  test('renders a human error message instead of crashing on API failure', async () => {
    vi.mocked(api.getLogs).mockRejectedValue(new Error("Can't reach the server."))

    renderDiary()

    await waitFor(() => {
      expect(screen.getByText(/reach the server/i)).toBeInTheDocument()
    })
  })

  test('shows the month count and average from stats', async () => {
    vi.mocked(api.getLogs).mockResolvedValue({ logs: [makeLog({})], total: 1 })
    vi.mocked(api.getStats).mockResolvedValue({ total: 5, monthCount: 3, monthAvg: 4.2 })

    renderDiary()

    expect(await screen.findByText(/3 this month/)).toBeInTheDocument()
    expect(screen.getByText(/avg 4.2/)).toBeInTheDocument()
  })
})
