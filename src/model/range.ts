import {
  addDays,
  addMonths,
  formatDayTitle,
  formatMonthTitle,
  monthGridStart,
  monthOf,
  monthShort,
  startOfWeek,
  yearOf,
} from './dates.ts'
import type { DateStr, View } from './types.ts'

export function visibleDates(view: View, anchor: DateStr): DateStr[] {
  if (view === 'day') return [anchor]
  if (view === '3day') return [anchor, addDays(anchor, 1), addDays(anchor, 2)]
  if (view === 'week') {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }
  const start = monthGridStart(anchor)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function rangeStep(view: View): number {
  if (view === 'day') return 1
  if (view === '3day') return 3
  if (view === 'week') return 7
  return 1
}

export function stepAnchor(view: View, anchor: DateStr, dir: -1 | 1): DateStr {
  if (view === 'month') return addMonths(anchor, dir)
  return addDays(anchor, dir * rangeStep(view))
}

export function headerLabel(view: View, anchor: DateStr): string {
  if (view === 'day') return formatDayTitle(anchor)
  if (view === 'month') return formatMonthTitle(anchor)
  const dates = visibleDates(view, anchor)
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (yearOf(first) !== yearOf(last)) {
    return `${monthShort(first)} ${yearOf(first)} – ${monthShort(last)} ${yearOf(last)}`
  }
  if (monthOf(first) !== monthOf(last)) return `${monthShort(first)} – ${monthShort(last)} ${yearOf(last)}`
  return formatMonthTitle(first)
}

export function stepWord(view: View): string {
  if (view === 'day') return 'day'
  if (view === '3day') return '3 days'
  if (view === 'week') return 'week'
  return 'month'
}
