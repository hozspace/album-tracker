import { useEffect, useState } from 'react'
import type { ArtMode } from '../lib/artMode'
import { ditherToTeletextPalette } from '../lib/teletextDither'

// Raw canvas resolution per treatment. Deliberately small and fixed
// (independent of the element's rendered CSS size) so `image-rendering:
// pixelated` reads as chunky blocks regardless of where the art is placed,
// and so we never need to measure a possibly-hidden container. Dither needs
// a little more resolution than the chunky photo-insert treatment for the
// error-diffusion pattern to still read as the album.
const RAW_SIZE: Record<ArtMode, number> = { photo: 48, dither: 64 }

// Cache treated results per (url, mode) so re-mounting the same album's art
// (list scroll, back navigation) doesn't re-run canvas work.
const treatedArtCache = new Map<string, string>()

interface TeletextAlbumArtProps {
  src: string
  alt: string
  mode: ArtMode
  className: string
  onError: () => void
}

export function TeletextAlbumArt({ src, alt, mode, className, onError }: TeletextAlbumArtProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [useUntreatedFallback, setUseUntreatedFallback] = useState(false)

  useEffect(() => {
    const cacheKey = `${mode}:${src}`
    const cached = treatedArtCache.get(cacheKey)
    if (cached) {
      setDataUrl(cached)
      setUseUntreatedFallback(false)
      return
    }

    let cancelled = false
    setDataUrl(null)
    setUseUntreatedFallback(false)

    const image = new Image()
    image.crossOrigin = 'anonymous'

    image.onload = () => {
      if (cancelled) return
      const treated = renderTreatedArt(image, mode)
      if (!treated) {
        setUseUntreatedFallback(true)
        return
      }
      treatedArtCache.set(cacheKey, treated)
      setDataUrl(treated)
    }

    image.onerror = () => {
      if (!cancelled) onError()
    }

    image.src = src

    return () => {
      cancelled = true
    }
  }, [src, mode, onError])

  const pixelatedStyle = { imageRendering: 'pixelated' as const }

  if (useUntreatedFallback) {
    // Canvas unavailable or tainted by CORS: fall back to a plain
    // pixelated-scale image, matching the mockup's "photo insert" fallback.
    return <img className={className} src={src} alt={alt} style={pixelatedStyle} onError={onError} />
  }

  if (!dataUrl) {
    return <div className={className} aria-hidden="true" />
  }

  return <img className={className} src={dataUrl} alt={alt} style={pixelatedStyle} />
}

function renderTreatedArt(image: HTMLImageElement, mode: ArtMode): string | null {
  const size = RAW_SIZE[mode]
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  try {
    ctx.drawImage(image, 0, 0, size, size)

    if (mode === 'dither') {
      const imageData = ctx.getImageData(0, 0, size, size)
      const treated = ditherToTeletextPalette(imageData.data, size, size)
      ctx.putImageData(new ImageData(new Uint8ClampedArray(treated), size, size), 0, 0)
    }

    return canvas.toDataURL()
  } catch {
    // CORS-tainted canvas: caller falls back to a plain pixelated <img>.
    return null
  }
}
