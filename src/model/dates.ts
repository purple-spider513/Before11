import type { DateStr } from './types.ts'

const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function ymd(year: number, month: number, day: number): DateStr {
  return `${year}-${pad(month)}-${pad(day)}`
}

function parts(date: DateStr): { y: number; m: number; d: number } {
  return {
    y: Number(date.slice(0, 4)),
    m: Number(date.slice(5, 7)),
    d: Number(date.slice(8, 10)),
  }
}

function utcMs(date: DateStr): number {
  const p = parts(date)
  return Date.UTC(p.y, p.m - 1, p.d)
}

function fromUtc(ms: number): DateStr {
  const dt = new Date(ms)
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function todayStr(now: Date = new Date()): DateStr {
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function nowMinute(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function addDays(date: DateStr, n: number): DateStr {
  return fromUtc(utcMs(date) + n * 86_400_000)
}

export function diffDays(from: DateStr, to: DateStr): number {
  return Math.round((utcMs(to) - utcMs(from)) / 86_400_000)
}

export function yearOf(date: DateStr): number {
  return parts(date).y
}

export function monthOf(date: DateStr): number {
  return parts(date).m
}

export function dayOf(date: DateStr): number {
  return parts(date).d
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(date: DateStr): number {
  return new Date(utcMs(date)).getUTCDay()
}

export function isWeekday(date: DateStr): boolean {
  const w = weekdayIndex(date)
  return w >= 1 && w <= 5
}

export function startOfWeek(date: DateStr): DateStr {
  return addDays(date, -weekdayIndex(date))
}

export function startOfMonth(date: DateStr): DateStr {
  const p = parts(date)
  return ymd(p.y, p.m, 1)
}

/** Month steps land on the 1st of the target month. */
export function addMonths(date: DateStr, n: number): DateStr {
  const p = parts(date)
  const index = p.y * 12 + (p.m - 1) + n
  const y = Math.floor(index / 12)
  const m = index - y * 12 + 1
  return ymd(y, m, 1)
}

/** Sunday on or before the 1st of the anchor's month. */
export function monthGridStart(anchor: DateStr): DateStr {
  return startOfWeek(startOfMonth(anchor))
}

export function weekdayLong(date: DateStr): string {
  return WEEKDAYS_LONG[weekdayIndex(date)]
}

export function weekdayShort(date: DateStr): string {
  return WEEKDAYS_SHORT[weekdayIndex(date)]
}

export function monthLong(date: DateStr): string {
  return MONTHS_LONG[monthOf(date) - 1]
}

export function monthShort(date: DateStr): string {
  return MONTHS_SHORT[monthOf(date) - 1]
}

export function formatDayTitle(date: DateStr): string {
  return `${weekdayLong(date)}, ${monthLong(date)} ${dayOf(date)}, ${yearOf(date)}`
}

export function formatMonthTitle(date: DateStr): string {
  return `${monthLong(date)} ${yearOf(date)}`
}

export function formatOverlayTitle(date: DateStr): string {
  return `${weekdayLong(date)}, ${monthLong(date)} ${dayOf(date)}`
}

export function formatDoneDate(date: DateStr, today: DateStr): string {
  const base = `${monthShort(date)} ${dayOf(date)}`
  return yearOf(date) === yearOf(today) ? base : `${base}, ${yearOf(date)}`
}
