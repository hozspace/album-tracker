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

    const stars = document.querySelectorAll('.rating__star-fg')
    expect(stars).toHaveLength(5)
    expect((stars[0] as HTMLElement).style.width).toBe('100%')
    expect((stars[1] as HTMLElement).style.width).toBe('100%')
    expect((stars[2] as HTMLElement).style.width).toBe('50%')
    expect((stars[3] as HTMLElement).style.width).toBe('0%')
    expect((stars[4] as HTMLElement).style.width).toBe('0%')
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
