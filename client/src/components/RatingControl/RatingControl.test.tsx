import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RatingControl } from './RatingControl'

function mockTrackRect(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20, x: 0, y: 0, toJSON() {} }) as DOMRect
}

describe('RatingControl', () => {
  test('renders five stars with the correct half-fill for a fractional value', () => {
    render(<RatingControl value={2.5} onChange={vi.fn()} />)

    const svgs = document.querySelectorAll('.rating__star-svg')
    expect(svgs).toHaveLength(5)

    const fillWidths = Array.from(svgs).map((svg) => {
      const rect = svg.querySelector('clipPath rect')
      return rect ? Number(rect.getAttribute('width')) : 0
    })
    expect(fillWidths).toEqual([24, 24, 12, 0, 0])
  })

  test('renders stars as crisp vector paths, not font glyphs', () => {
    render(<RatingControl value={3} readOnly />)

    expect(document.querySelectorAll('.rating__star-svg')).toHaveLength(5)
    expect(document.querySelectorAll('.rating__star-bg')).toHaveLength(5)
    expect(document.body.textContent).not.toContain('★')
  })

  test('uses a larger touch target for the interactive control than for read-only display', () => {
    const { unmount } = render(<RatingControl value={3} onChange={vi.fn()} />)
    const interactiveSvg = document.querySelector('.rating__star-svg') as SVGElement
    expect(interactiveSvg.getAttribute('width')).toBe('28')
    unmount()

    render(<RatingControl value={3} readOnly />)
    const readOnlySvg = document.querySelector('.rating__star-svg') as SVGElement
    expect(readOnlySvg.getAttribute('width')).toBe('16')
  })

  test('reports a value on pointer down without requiring a drag', () => {
    const onChange = vi.fn()
    render(<RatingControl value={0.5} onChange={onChange} />)
    const track = screen.getByRole('slider')
    mockTrackRect(track)

    fireEvent.pointerDown(track, { clientX: 190, pointerId: 1 })
    fireEvent.pointerUp(track, { clientX: 190, pointerId: 1 })

    expect(onChange).toHaveBeenCalledWith(5)
  })

  test('tracks a continuous drag and commits the final value on pointer up', () => {
    const onChange = vi.fn()
    render(<RatingControl value={0.5} onChange={onChange} />)
    const track = screen.getByRole('slider')
    mockTrackRect(track)

    fireEvent.pointerDown(track, { clientX: 20, pointerId: 1 })
    fireEvent.pointerMove(track, { clientX: 80, pointerId: 1 })
    fireEvent.pointerMove(track, { clientX: 120, pointerId: 1 })
    fireEvent.pointerUp(track, { clientX: 120, pointerId: 1 })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  test('does not respond to pointer interaction in read-only mode', () => {
    const onChange = vi.fn()
    render(<RatingControl value={3} onChange={onChange} readOnly />)
    const track = screen.getByRole('img')
    mockTrackRect(track)

    fireEvent.pointerDown(track, { clientX: 190, pointerId: 1 })
    fireEvent.pointerUp(track, { clientX: 190, pointerId: 1 })

    expect(onChange).not.toHaveBeenCalled()
  })

  test('supports arrow-key adjustment in half-step increments', () => {
    const onChange = vi.fn()
    render(<RatingControl value={3} onChange={onChange} />)
    const track = screen.getByRole('slider')

    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(3.5)

    fireEvent.keyDown(track, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(2.5)
  })
})
