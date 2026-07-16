import { useState } from 'react'
import { useArtistSearch } from '../musicbrainz/useArtistSearch'
import './ArtistAutocomplete.css'

interface ArtistAutocompleteProps {
  value: string
  onChange: (value: string) => void
}

/** Free-text artist field with a MusicBrainz-backed suggestion dropdown.
 * Selecting a suggestion fills the field, but typed text is always valid —
 * the seed is just text passed to the recs engine. */
export function ArtistAutocomplete({ value, onChange }: ArtistAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const { results, status } = useArtistSearch(value)
  const showResults = open && status === 'idle' && results.length > 0

  return (
    <div className="artist-autocomplete">
      <input
        type="text"
        className="artist-autocomplete__input"
        placeholder="Artist (optional)"
        value={value}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {showResults && (
        <ul className="artist-autocomplete__results">
          {results.map((artist) => (
            <li key={artist.mbid}>
              <button
                type="button"
                className="artist-autocomplete__result"
                // Fires before the input's blur closes the list.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(artist.name)
                  setOpen(false)
                }}
              >
                {artist.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
