import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { MAX_RATING, MIN_RATING, RATING_STEP, STAR_COUNT, starFillRatio, valueFromPointerX } from './ratingMath'
import './RatingControl.css'

interface RatingControlProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  label?: string
}

export function RatingControl({ value, onChange, readOnly = false, label = 'Rating' }: RatingControlProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)
  const displayValue = dragValue ?? value

  function valueAtClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    return valueFromPointerX(clientX, rect.left, rect.width)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragValue(valueAtClientX(event.clientX))
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly || dragValue === null) return
    setDragValue(valueAtClientX(event.clientX))
  }

  function commitDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly || dragValue === null) return
    const finalValue = valueAtClientX(event.clientX)
    onChange?.(finalValue)
    setDragValue(null)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (readOnly || !onChange) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange(Math.min(MAX_RATING, value + RATING_STEP))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange(Math.max(MIN_RATING, value - RATING_STEP))
    }
  }

  return (
    <div
      ref={trackRef}
      className="rating"
      role={readOnly ? 'img' : 'slider'}
      aria-label={readOnly ? `${label}: ${displayValue} out of 5 stars` : label}
      aria-valuemin={readOnly ? undefined : MIN_RATING}
      aria-valuemax={readOnly ? undefined : MAX_RATING}
      aria-valuenow={readOnly ? undefined : displayValue}
      aria-valuetext={readOnly ? undefined : `${displayValue} out of 5 stars`}
      tabIndex={readOnly ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitDrag}
      onPointerCancel={commitDrag}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <span className="rating__star" key={index} aria-hidden="true">
          <span className="rating__star-bg">★</span>
          <span
            className="rating__star-fg"
            style={{ width: `${starFillRatio(displayValue, index) * 100}%` }}
          >
            ★
          </span>
        </span>
      ))}
    </div>
  )
}
