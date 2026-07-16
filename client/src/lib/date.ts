const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const SHORT_MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, day ?? 1)
}

export function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dayOfMonth(isoDate: string): string {
  return String(parseIsoDate(isoDate).getDate())
}

export function weekdayLabel(isoDate: string): string {
  return WEEKDAY_FORMAT.format(parseIsoDate(isoDate))
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function monthLabel(isoDate: string): string {
  return MONTH_FORMAT.format(parseIsoDate(isoDate))
}

/** Formats an ISO date (e.g. "2026-07-12") as "12 July 2026" for user-facing display. */
export function formatDate(isoDate: string): string {
  return FULL_DATE_FORMAT.format(parseIsoDate(isoDate))
}

/** Formats an ISO date (e.g. "2026-07-12") as CEEFAX-style "12JUL" for the teletext diary row. */
export function compactDiaryDate(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}${SHORT_MONTH_NAMES[date.getMonth()]}`
}
