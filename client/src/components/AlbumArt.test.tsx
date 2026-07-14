import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { AlbumArt } from './AlbumArt'

describe('AlbumArt', () => {
  test('renders the image when a src is provided', () => {
    render(<AlbumArt src="https://example.com/art.jpg" alt="OK Computer cover art" title="OK Computer" />)

    const img = screen.getByRole('img', { name: 'OK Computer cover art' })
    expect(img.tagName).toBe('IMG')
  })

  test('renders a quiet placeholder with the album\'s initial letter when there is no artwork', () => {
    render(<AlbumArt src={null} alt="OK Computer cover art" title="OK Computer" />)

    const placeholder = screen.getByRole('img', { name: 'OK Computer cover art' })
    expect(placeholder.tagName).toBe('DIV')
    expect(placeholder).toHaveTextContent('O')
  })

  test('falls back to the alt text for the initial letter when no title is given', () => {
    render(<AlbumArt src={null} alt="Kid A cover art" />)

    expect(screen.getByRole('img', { name: 'Kid A cover art' })).toHaveTextContent('K')
  })
})
