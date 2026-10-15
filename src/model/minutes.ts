export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function snap5(m: number): number {
  return Math.round(m / 5) * 5
}

interface ClockParts {
  hour12: number
  minute: number
  meridiem: 'AM' | 'PM'
}

export function clockParts(minute: number): ClockParts {
  const wrapped = ((minute % 1440) + 1440) % 1440
  const hour24 = Math.floor(wrapped / 60)
  const minutePart = wrapped % 60
  const meridiem: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour12, minute: minutePart, meridiem }
}

function clock(minute: number): string {
  const p = clockParts(minute)
  return `${p.hour12}:${String(p.minute).padStart(2, '0')}`
}

export function formatTime(minute: number): string {
  const p = clockParts(minute)
  return `${clock(minute)} ${p.meridiem}`
}

export function formatRange(start: number, end: number): string {
  const a = clockParts(start)
  const b = clockParts(end)
  if (a.meridiem === b.meridiem) return `${clock(start)}–${clock(end)} ${b.meridiem}`
  return `${formatTime(start)}–${formatTime(end)}`
}

export function formatSpokenRange(start: number, end: number): string {
  const a = clockParts(start)
  const b = clockParts(end)
  if (a.meridiem === b.meridiem) return `${clock(start)} to ${clock(end)} ${b.meridiem}`
  return `${formatTime(start)} to ${formatTime(end)}`
}

export function formatCompact(minute: number): string {
  const p = clockParts(minute)
  const mer = p.meridiem.toLowerCase()
  if (p.minute === 0) return `${p.hour12}${mer}`
  return `${p.hour12}:${String(p.minute).padStart(2, '0')}${mer}`
}

/** Hour label for the gutter. `hour` is 1–23. */
export function formatGutterHour(hour: number): string {
  const p = clockParts(hour * 60)
  return `${p.hour12} ${p.meridiem}`
}
