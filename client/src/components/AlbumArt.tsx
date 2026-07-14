import { useEffect, useState } from 'react'
import './AlbumArt.css'

interface AlbumArtProps {
  src: string | null
  alt: string
  className?: string
}

export function AlbumArt({ src, alt, className }: AlbumArtProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const classes = ['album-art', className].filter(Boolean).join(' ')

  if (!src || failed) {
    return <div className={`${classes} album-art--placeholder`} role="img" aria-label={alt} />
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
