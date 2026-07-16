const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Formats a Date as CEEFAX's row-0 clock string, e.g. "TUE 14 JUL 21:13/21". */
export function formatCeefaxClock(date: Date): string {
  const day = DAY_NAMES[date.getDay()]
  const month = MONTH_NAMES[date.getMonth()]
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}/${pad2(date.getSeconds())}`
  return `${day} ${pad2(date.getDate())} ${month} ${time}`
}
