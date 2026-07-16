import { useEffect, useState } from 'react'
import { useArtMode } from '../lib/artMode'
import { useTheme } from '../lib/useTheme'
import { TeletextAlbumArt } from './TeletextAlbumArt'
import './AlbumArt.css'

interface AlbumArtProps {
  src: string | null
  alt: string
  /** Album title, used to show an initial-letter placeholder when there's no artwork. */
  title?: string
  className?: string
  /**
   * Whether to apply the teletext canvas treatment (photo-insert
   * pixelation / dither) when the teletext theme is active. Defaults to
   * true; small thumbnail contexts (diary rows, search results) pass
   * false since an authentic teletext index page is text-only. Has no
   * effect under theme-minimal, which always renders the plain image.
   */
  treat?: boolean
}

export function AlbumArt({ src, alt, title, className, treat = true }: AlbumArtProps) {
  const [failed, setFailed] = useState(false)
  const theme = useTheme()
  const artMode = useArtMode()

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

  if (theme === 'teletext' && treat) {
    return (
      <TeletextAlbumArt
        src={src}
        alt={alt}
        mode={artMode}
        className={classes}
        onError={() => setFailed(true)}
      />
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
