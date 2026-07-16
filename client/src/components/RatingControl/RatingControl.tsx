import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  BLOCK_COUNT,
  MAX_RATING,
  MIN_RATING,
  RATING_STEP,
  STAR_COUNT,
  filledBlockCount,
  starFillRatio,
  valueFromPointerX,
} from './ratingMath'
import { StarIcon } from './StarIcon'
import './RatingControl.css'

const READ_ONLY_STAR_SIZE = 16
const INTERACTIVE_STAR_SIZE = 28

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
  const starSize = readOnly ? READ_ONLY_STAR_SIZE : INTERACTIVE_STAR_SIZE

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
      className={readOnly ? 'rating rating--readonly' : 'rating rating--interactive'}
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
        <span className="rating__star" key={index}>
          <StarIcon fillRatio={starFillRatio(displayValue, index)} size={starSize} />
        </span>
      ))}
      <span className="rating__blocks" aria-hidden="true">
        {Array.from({ length: BLOCK_COUNT }, (_, index) => (
          <span
            key={index}
            className={
              index < filledBlockCount(displayValue) ? 'rating__block rating__block--filled' : 'rating__block'
            }
          />
        ))}
      </span>
      <span className="rating__value" aria-hidden="true">
        {displayValue.toFixed(1)}
      </span>
    </div>
  )
}
