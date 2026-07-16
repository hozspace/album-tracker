import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import type { Rec } from '../api/types'
import { Recs } from './Recs'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      getRecs: vi.fn(),
      getStats: vi.fn(),
      generateRecs: vi.fn(),
      updateRecStatus: vi.fn(),
    },
  }
})

vi.mock('../musicbrainz/useArtistSearch', () => ({
  useArtistSearch: vi.fn(() => ({ results: [], status: 'idle' })),
}))

function makeRec(overrides: Partial<Rec> = {}): Rec {
  return {
    id: 1,
    artist: 'Boards of Canada',
    title: 'Geogaddi',
    year: 2002,
    mbid: 'mbid-1',
    artUrl: null,
    because: 'You rated Music Has the Right to Children 5 stars with a relisten.',
    mode: 'deepen',
    status: 'pending',
    createdAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

function renderRecs() {
  return render(
    <MemoryRouter>
      <Recs />
    </MemoryRouter>,
  )
}

describe('Recs', () => {
  beforeEach(() => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 20, monthCount: 2, monthAvg: 4 })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('renders a card per pending recommendation', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [makeRec()] })

    renderRecs()

    expect(await screen.findByText('Geogaddi')).toBeInTheDocument()
    expect(screen.getByText('Boards of Canada')).toBeInTheDocument()
    expect(screen.getByText('· 2002')).toBeInTheDocument()
    expect(screen.getByText(/rated Music Has the Right to Children/)).toBeInTheDocument()
    expect(screen.getByText('deepen')).toBeInTheDocument()
  })

  test('shows a quiet empty state with no pending recommendations', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })

    renderRecs()

    expect(await screen.findByText('No recommendations yet.')).toBeInTheDocument()
  })

  test('renders a human error message on load failure', async () => {
    vi.mocked(api.getRecs).mockRejectedValue(new Error("Can't reach the server."))

    renderRecs()

    await waitFor(() => {
      expect(screen.getByText(/reach the server/i)).toBeInTheDocument()
    })
  })

  test('clicking "Get recommendations" calls generate and refreshes the list', async () => {
    vi.mocked(api.getRecs)
      .mockResolvedValueOnce({ recs: [] })
      .mockResolvedValueOnce({ recs: [makeRec()] })
    vi.mocked(api.generateRecs).mockResolvedValue({ recs: [makeRec()] })

    renderRecs()

    await screen.findByText('No recommendations yet.')
    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(await screen.findByText('Geogaddi')).toBeInTheDocument()
    expect(api.generateRecs).toHaveBeenCalledWith(undefined)
  })

  test('shows a human error message when generation fails', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.generateRecs).mockRejectedValue(new Error('set ANTHROPIC_API_KEY in .env'))

    renderRecs()

    await screen.findByText('No recommendations yet.')
    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(await screen.findByText('set ANTHROPIC_API_KEY in .env')).toBeInTheDocument()
  })

  test('dismissing a rec posts the status and removes it from the list', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [makeRec()] })
    vi.mocked(api.updateRecStatus).mockResolvedValue(makeRec({ status: 'dismissed' }))

    renderRecs()

    await screen.findByText('Geogaddi')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => {
      expect(screen.queryByText('Geogaddi')).not.toBeInTheDocument()
    })
    expect(api.updateRecStatus).toHaveBeenCalledWith(1, 'dismissed')
  })

  test('logging a rec posts the status', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [makeRec()] })
    vi.mocked(api.updateRecStatus).mockResolvedValue(makeRec({ status: 'logged' }))

    renderRecs()

    await screen.findByText('Geogaddi')
    fireEvent.click(screen.getByRole('button', { name: 'Log it' }))

    await waitFor(() => {
      expect(api.updateRecStatus).toHaveBeenCalledWith(1, 'logged')
    })
  })
})

describe('Recs — seed input visibility', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('hides seed inputs when the diary has 5 or more logs', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.getStats).mockResolvedValue({ total: 5, monthCount: 1, monthAvg: 4 })

    renderRecs()

    await screen.findByText('No recommendations yet.')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Artist (optional)')).not.toBeInTheDocument()
  })

  test('shows seed inputs when the diary has fewer than 5 logs', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.getStats).mockResolvedValue({ total: 3, monthCount: 1, monthAvg: 4 })

    renderRecs()

    expect(await screen.findByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Artist (optional)')).toBeInTheDocument()
  })

  test('the genre picker defaults to "Any genre" and lists the curated genres', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.getStats).mockResolvedValue({ total: 0, monthCount: 0, monthAvg: null })

    renderRecs()

    const select = await screen.findByRole('combobox')
    expect(select).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Any genre' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'shoegaze' })).toBeInTheDocument()
  })

  test('passes the seed through to generateRecs', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.getStats).mockResolvedValue({ total: 0, monthCount: 0, monthAvg: null })
    vi.mocked(api.generateRecs).mockResolvedValue({ recs: [] })

    renderRecs()

    const genreSelect = await screen.findByRole('combobox')
    fireEvent.change(genreSelect, { target: { value: 'shoegaze' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }))

    await waitFor(() => {
      expect(api.generateRecs).toHaveBeenCalledWith({ genre: 'shoegaze' })
    })
  })

  test('passes free-typed artist text through to generateRecs', async () => {
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [] })
    vi.mocked(api.getStats).mockResolvedValue({ total: 0, monthCount: 0, monthAvg: null })
    vi.mocked(api.generateRecs).mockResolvedValue({ recs: [] })

    renderRecs()

    const artistInput = await screen.findByPlaceholderText('Artist (optional)')
    fireEvent.change(artistInput, { target: { value: 'Boards of Canada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get recommendations' }))

    await waitFor(() => {
      expect(api.generateRecs).toHaveBeenCalledWith({ artist: 'Boards of Canada' })
    })
  })
})

describe('Recs — P300 teletext carousel (theme-blind markup)', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('renders every rec in the DOM regardless of theme — CSS, not markup, does the switching', async () => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 20, monthCount: 2, monthAvg: 4 })
    vi.mocked(api.getRecs).mockResolvedValue({
      recs: [makeRec({ id: 1, title: 'Geogaddi' }), makeRec({ id: 2, title: 'Selected Ambient Works' })],
    })

    const { container } = renderRecs()

    await screen.findByText('Geogaddi')
    expect(container.querySelectorAll('.recs__card')).toHaveLength(2)
  })

  test('the first card starts active and carries the 1/2 subpage indicator', async () => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 20, monthCount: 2, monthAvg: 4 })
    vi.mocked(api.getRecs).mockResolvedValue({
      recs: [makeRec({ id: 1, title: 'Geogaddi' }), makeRec({ id: 2, title: 'Selected Ambient Works' })],
    })

    const { container } = renderRecs()
    await screen.findByText('Geogaddi')

    const cards = container.querySelectorAll('.recs__card')
    expect(cards[0]).toHaveAttribute('data-active', 'true')
    expect(cards[1]).not.toHaveAttribute('data-active')
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  test('clicking Next advances the active card to the next subpage and wraps around', async () => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 20, monthCount: 2, monthAvg: 4 })
    vi.mocked(api.getRecs).mockResolvedValue({
      recs: [makeRec({ id: 1, title: 'Geogaddi' }), makeRec({ id: 2, title: 'Selected Ambient Works' })],
    })

    const { container } = renderRecs()
    await screen.findByText('Geogaddi')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    let cards = container.querySelectorAll('.recs__card')
    expect(cards[1]).toHaveAttribute('data-active', 'true')
    expect(cards[0]).not.toHaveAttribute('data-active')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    cards = container.querySelectorAll('.recs__card')
    expect(cards[0]).toHaveAttribute('data-active', 'true')
  })

  test('the NOW TUNE TO header and LOG IT/PASS labels are always present in the DOM', async () => {
    vi.mocked(api.getStats).mockResolvedValue({ total: 20, monthCount: 2, monthAvg: 4 })
    vi.mocked(api.getRecs).mockResolvedValue({ recs: [makeRec()] })

    renderRecs()
    await screen.findByText('Geogaddi')

    expect(screen.getByText('NOW TUNE TO…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log it' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })
})
