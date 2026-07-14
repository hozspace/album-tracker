// Simple, filled, geometric glyphs for the bottom tab bar — no icon library,
// no emoji. Each is a self-contained 24x24 SVG, coloured via `fill="currentColor"`
// so CSS controls active/inactive colour on the parent link.

export function DiaryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="4" height="4" fill="currentColor" />
      <rect x="10" y="4.5" width="11" height="3" fill="currentColor" />
      <rect x="3" y="10" width="4" height="4" fill="currentColor" />
      <rect x="10" y="10.5" width="11" height="3" fill="currentColor" />
      <rect x="3" y="16" width="4" height="4" fill="currentColor" />
      <rect x="10" y="16.5" width="11" height="3" fill="currentColor" />
    </svg>
  )
}

export function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3 H21 V21 H3 Z M5 5 V19 H19 V5 Z" fill="currentColor" />
      <rect x="11" y="8" width="2" height="8" fill="currentColor" />
      <rect x="8" y="11" width="8" height="2" fill="currentColor" />
    </svg>
  )
}

export function RecsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect x="4" y="14" width="4" height="7" fill="currentColor" />
      <rect x="10" y="9" width="4" height="12" fill="currentColor" />
      <rect x="16" y="4" width="4" height="17" fill="currentColor" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 9.93 4.07 L 10.77 1.57 L 13.23 1.57 L 14.07 4.07 L 16.15 4.93 L 18.5 3.75 L 20.25 5.5 L 19.07 7.85 L 19.93 9.93 L 22.43 10.77 L 22.43 13.23 L 19.93 14.07 L 19.07 16.15 L 20.25 18.5 L 18.5 20.25 L 16.15 19.07 L 14.07 19.93 L 13.23 22.43 L 10.77 22.43 L 9.93 19.93 L 7.85 19.07 L 5.5 20.25 L 3.75 18.5 L 4.93 16.15 L 4.07 14.07 L 1.57 13.23 L 1.57 10.77 L 4.07 9.93 L 4.93 7.85 L 3.75 5.5 L 5.5 3.75 L 7.85 4.93 Z
           M 7.8 12 A 4.2 4.2 0 1 0 16.2 12 A 4.2 4.2 0 1 0 7.8 12 Z"
        fill="currentColor"
      />
    </svg>
  )
}
