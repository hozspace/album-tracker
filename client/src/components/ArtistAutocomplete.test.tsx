import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ArtistAutocomplete } from './ArtistAutocomplete'

vi.mock('../musicbrainz/useArtistSearch', () => ({
  useArtistSearch: vi.fn(() => ({ results: [], status: 'idle' })),
}))

describe('ArtistAutocomplete', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('renders the current value as free text', () => {
    render(<ArtistAutocomplete value="Radioh" onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('Artist (optional)')).toHaveValue('Radioh')
  })

  test('calls onChange as the user types, independent of any suggestions', () => {
    const onChange = vi.fn()
    render(<ArtistAutocomplete value="" onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('Artist (optional)'), { target: { value: 'Boa' } })

    expect(onChange).toHaveBeenCalledWith('Boa')
  })

  test('shows MusicBrainz suggestions once results and focus are present', async () => {
    const { useArtistSearch } = await import('../musicbrainz/useArtistSearch')
    vi.mocked(useArtistSearch).mockReturnValue({
      results: [{ mbid: 'a1', name: 'Radiohead' }],
      status: 'idle',
    })

    render(<ArtistAutocomplete value="Radio" onChange={vi.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Artist (optional)'))

    expect(screen.getByText('Radiohead')).toBeInTheDocument()
  })

  test('selecting a suggestion fills the field with the artist name', async () => {
    const { useArtistSearch } = await import('../musicbrainz/useArtistSearch')
    vi.mocked(useArtistSearch).mockReturnValue({
      results: [{ mbid: 'a1', name: 'Radiohead' }],
      status: 'idle',
    })
    const onChange = vi.fn()

    render(<ArtistAutocomplete value="Radio" onChange={onChange} />)
    fireEvent.focus(screen.getByPlaceholderText('Artist (optional)'))
    fireEvent.click(screen.getByText('Radiohead'))

    expect(onChange).toHaveBeenCalledWith('Radiohead')
  })

  test('does not show a suggestion dropdown when there are no results', () => {
    render(<ArtistAutocomplete value="zzz" onChange={vi.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Artist (optional)'))

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
