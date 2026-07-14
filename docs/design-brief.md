# Album Tracker — UI Direction Brief: Two Switchable Themes

> App display name is TBD (James deciding). Use the `APP_NAME` constant everywhere; placeholder value `ALBUMS`.
> Hard constraints across both themes: no "AI-isms" — no gradients, no explainer micro-copy, no emoji decoration, no rounded-corner-everything. Adult-tone, utility-shaped design.

## Research notes (what the incumbents actually do)

- **Letterboxd**: poster grid is the whole interface — artwork is navigation, not decoration. Diary = calendar-anchored poster rows (date rail on the left, poster + title + stars per row). Log flow is a single modal: date, star slider, "like" heart, review, tags — nothing else. Ratings: 0.5–5 stars in half steps, set by tap-drag on one control; on phone it's a thumb-swipe across the stars, which is the fastest rating input in any tracker. Their restraint (no follower counts, everything anchored to a work) is a taste lesson.
- **Apple Music**: neutral base (pure white / near-black), SF Pro, artwork does all colour. Album detail = big square art, title, artist as link, minimal metadata line (genre · year), then tracklist as plain rows. No ratings, no clutter. The tell: generous padding and a strict two-level text hierarchy (primary label + grey secondary).
- **Musicboard**: 0.5–5 stars, dark-only UI, logs albums *and* songs. Works, but per-screen density is high and reviews compete with artwork — feels busier than Letterboxd. Lesson: don't put review text in the grid view.
- **Album of the Year**: 0–100 user scores. Precise but slow to input and encourages false precision; useful for aggregate display, bad as an entry control. Pages are cluttered — ads, critic score boxes, sidebars.
- **Rate Your Music**: 0.5–5 stars, deep catalogue, but the UI is dense table-era HTML — proof that data-rich doesn't need to mean readable.
- **Teletext/CEEFAX** (Channel 26 design guide, Teletext Wiki): fixed grid of **40 columns × 24 rows** (rows 0 and 24 are metadata: page number + service name + clock on row 0, coloured Fastext key row at the bottom). Strict 8-colour, 3-bit palette on black. Mosaic "sixel" graphics (2×3 blocks per character cell) form chunky page headers above text. Colour-change codes occupy a cell, so authentic pages have visible one-space gaps before colour changes. Navigation = 3-digit page numbers plus a coloured index row (red/green/yellow/cyan link labels).

---

## THEME A — "Modern minimal" (Apple-Music-adjacent)

### Layout per screen

**Diary/history feed**
- *Phone (primary)*: Letterboxd-style diary rows, not a grid. Left rail: month/day stamp. Row: ~64px artwork square, album title (primary), artist (secondary grey), star rating, relisten mark. Month name as sticky section header. One tap → detail.
- *Desktop*: same list at a comfortable max-width (~680px) centred, OR a toggleable artwork grid (5–6 columns, square art, hover reveals title/rating). Default to list — this is a diary, chronology matters.

**Log form**
- *Phone*: full-screen sheet. Step 1: search field at top, results as art + title + artist + year rows (autofill from MusicBrainz). Step 2: selected album pinned at top (art + title), then in order: star control, favourite song (picker from tracklist), date (defaults today), would-relisten toggle, one plain-text note field. Single "Log" button. No labels-above-everything — use placeholder-weight labels and let spacing do the grouping.
- *Desktop*: same as a centred modal, two-column inside (art left, fields right).

**Album detail**
- *Phone*: full-bleed square artwork at top (edge to edge, no card frame), then title / artist / year·genre line, then *your* data block: rating, date(s) listened, favourite song, relisten, note. Tracklist below as plain numbered rows, favourite song marked. Re-log button.
- *Desktop*: art fixed left (~40%), everything else right column.

**Recommendations**
- *Phone*: vertical stack of large artwork cards (one per viewport-ish), title + artist + a single one-line "because" fact (e.g. "3 logs from this artist"), actions: log it / dismiss. Artwork sells the rec.
- *Desktop*: 3–4 column art grid with the same one-liner underneath.

### Typography
System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (SF Pro on the iPhone PWA). If a webfont is wanted for consistency: **Inter** (Google Fonts, OFL). Two sizes + two weights only: title 17/600, body 15/400, secondary 13/400 grey. Album titles on detail: 28/700 tight tracking.

### Palette (neutral base, artwork carries colour)
- Background: `#FFFFFF` light / `#0D0D0D` dark
- Surface (rows, sheets): `#F5F5F4` / `#1A1A1A`
- Primary text: `#111111` / `#F2F2F2`
- Secondary text: `#6E6E73` / `#8E8E93` (Apple's greys — proven)
- Hairline dividers: `#E5E5E5` / `#2C2C2E`
- Single accent for stars/actions: `#FF453A` (or pull dominant colour from current artwork via canvas — one accent, never a gradient)

### Rating input
**0.5–5 stars, half steps, Letterboxd-style tap-drag slider.** Verified fastest on phone: one continuous thumb gesture, no keyboard, no picker. Display as ★★★½. Skip 0–100 (AOTY): slow entry, false precision. Would-relisten is the second axis (Letterboxd's "heart") — keep it a separate toggle, don't fold it into the score.

### Authenticity details (not-skinned tells)
1. **Artwork is never framed**: no card borders, no drop shadows, no rounded corners on art — square, edge-to-edge, exactly as Apple Music treats it.
2. **Dominant-colour text tint on detail pages**: sample the artwork's dominant colour for the album title only. Solid colour, no gradient.
3. **Diary density option**: a compact/comfortable toggle (Letterboxd has this).

---

## THEME B — "Teletext" (CEEFAX)

### Layout per screen

Everything lives on a **fixed 40-column character grid**, black background, page furniture on every screen:
- **Row 0 header**: `P101   <APP_NAME>   ` + live clock right-aligned (yellow on black) — exactly CEEFAX's magazine row.
- **Bottom Fastext row**: four coloured labels = the app nav: `DIARY` (red) `LOG` (green) `RECS` (yellow) `SETUP` (cyan). This *is* the tab bar — teletext solved bottom navigation in 1974.
- Assign page numbers: Diary **P101**, Log **P102**, album detail **P2xx**, Recs **P300**, Settings **P400**. Show them; they're the theme.

**Diary feed (P101)**: chunky double-height mosaic page header in sixel block lettering, then a list table — teletext's native idiom: date in cyan, title in white, artist in green, rating in yellow, one album per row (two rows on phone: title line + meta line). Thumbnail art optional here — an authentic index page can be text-only with art saved for detail pages.
- *Phone*: the 40-col grid maps almost perfectly to a 390px viewport at ~9–10px per cell. Scale the character cell to viewport width (`font-size: 2.5vw` capped) so the page is always exactly 40 columns — this is what keeps the illusion.
- *Desktop*: render the 40×N grid at fixed size, centred on black, like a TV capture. Optionally faint scanlines *outside* the page area only.

**Log form (P102)**: search field as a white-on-blue input row (Prestel style). Results as numbered rows — `1 OK COMPUTER      RADIOHEAD  1997` — selectable by tapping or typing the number. Form fields as label-in-cyan, value-in-white rows; toggles render as `RELISTEN: YES/NO` with the active word in green. Submit = green Fastext key.

**Album detail (P2xx)**: header row with page number, then artwork (treated, below) occupying roughly a 16×8-cell region top-left with title/artist/year in double-height yellow beside/below it, your rating as a row of block characters, favourite track in magenta, note in white. Tracklist as numbered cyan rows.

**Recommendations (P300)**: play it as a broadcast page — "NOW TUNE TO…" header, one rec per "subpage" with the authentic rotation indicator `1/5` top right; advance by swipe (phone) or the yellow key. The subpage carousel is a real teletext convention and turns recs into a slot-machine moment.

### Album art inside the illusion — pick one default, ship one alternate
1. **Default — dithered to the 8-colour palette**: canvas resample to ~80×80px, ordered/Bayer dither quantised to the 8 teletext colours, rendered chunky (`image-rendering: pixelated`). Reads unmistakably as the album *and* as teletext. Do it client-side once and cache.
2. **Alternate — "photo insert" mode**: full-colour art, pixelated-scaled, inside a 1-cell sixel mosaic border, as the single colour pop per page. Offered as a setting.
- Avoid true sixel-mosaic conversion (64 mosaic chars) for art — at 16 cells wide it's illegible mush for most covers. Dithered pixels beat authentic mosaics here.

### Typography
- **Bedstead** — self-hosted, **public domain**, OTF from bjh21.me.uk/bedstead (convert to woff2). Faithful vector rendering of the SAA5050 MODE 7 character generator, with Extra/Ultra Condensed variants that simulate double-height. (**VT323** on Google Fonts is the closest hosted fallback but it's DEC-terminal, not teletext — loading fallback only.)
- Render at multiples of the native cell (20px base) where possible. One size. Double-height headings via the condensed variants or `scaleY(2)` on a half-height line — the latter is how teletext actually did it (two rows, top/bottom halves).

### Palette — the 3-bit palette, no exceptions
`#000000` (background, always) · `#FFFFFF` · `#FFFF00` yellow · `#00FFFF` cyan · `#00FF00` green · `#FF00FF` magenta · `#FF0000` red · `#0000FF` blue.
Role mapping: yellow = headings/ratings, cyan = labels/secondary, white = body, green = affirmative/actions, magenta = favourites, red/blue = Fastext + alerts/background blocks. **No greys, no opacity, no antialiased colour mixing** — any 9th colour breaks it. (Full-saturation blue text on black fails legibility — use blue only as fill/background blocks, per real CEEFAX practice.)

### Rating input
Same underlying 0.5–5 half-step value as Theme A (one data model), rendered as a **10-segment block bar**: `▮▮▮▮▮▮▮░░░ 3.5` in yellow, set by tap-drag across the row — same gesture as the star slider, teletext costume. Numeric display `3.5/5` beside it.

### Authenticity details
1. **Page-load "reveal"**: draw new pages top-to-bottom over ~150ms (rows appearing in sequence), mimicking broadcast page acquisition. Optionally a brief page-number counter flicker in the header while "searching".
2. **Live clock in row 0**, ticking seconds, yellow. Non-negotiable — it's the most recognisable CEEFAX element.
3. **Colour-code gaps**: leave the authentic one-character blank cell before each colour change in headers/tables (control codes occupied a cell).
4. Number-key navigation on desktop: type `300` to jump to recs.

---

## One structure, two themes

- **Semantic, theme-blind markup**: `<main data-screen="diary">`, `<article class="log-entry">`, `<button class="rating">`. No theme names in markup, ever. Theme = one class on `<html>` (`theme-minimal` / `theme-teletext`), persisted to localStorage.
- **Token layer** (custom properties): `--bg`, `--surface`, `--text`, `--text-2`, `--accent`, `--rating`, `--font-ui`, `--font-display`, `--radius` (0 in both themes as it happens), `--cell` (teletext grid unit; unused by minimal), `--divider`. Each theme is one `:root.theme-x { … }` block redefining tokens only.
- **Where tokens aren't enough** (layout genuinely differs — teletext's fixed 40-col grid vs minimal's fluid flex): keep the DOM identical and switch layout with theme-scoped rules, e.g. `.theme-teletext .diary { display: grid; grid-template-columns: repeat(40, var(--cell)); }`. Two CSS files loaded conditionally if size matters; never two component trees.
- **Behaviour identical across themes**: same rating gesture, same log flow, same routes. Theme changes rendering only — including the art treatment, which is a render-time canvas step keyed off the theme class.
- Page furniture (row 0 header, Fastext row) exists in the DOM always as `<header class="page-meta">` / `<nav class="primary-nav">`; minimal styles them as an ordinary top bar and iOS-style bottom tab bar, teletext styles them as rows 0/24. Same nav component, two costumes.

Sources: Channel 26 teletext design guide (channel26.uk/teletext-design), Teletext Wiki, Bedstead font (bjh21.me.uk/bedstead), Letterboxd/Apple Music/Musicboard/AOTY/RYM product analysis.
