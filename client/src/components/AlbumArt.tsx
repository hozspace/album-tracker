import { useEffect, useState } from 'react'
import './AlbumArt.css'

interface AlbumArtProps {
  src: string | null
  alt: string
  /** Album title, used to show an initial-letter placeholder when there's no artwork. */
  title?: string
  className?: string
}

export function AlbumArt({ src, alt, title, className }: AlbumArtProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const classes = ['album-art', className].filter(Boolean).join(' ')

  if (!src || failed) {
    const initial = (title ?? alt).trim().charAt(0).toUpperCase()
    return (
      <div className={`${classes} album-art--placeholder`} role="img" aria-label={alt}>
        {initial && (
          <span className="album-art__initial" aria-hidden="true">
            {initial}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      className={classes}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
