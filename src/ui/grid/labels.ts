import { formatCompact, formatRange, formatTime } from '../../model/minutes.ts'
import type { View } from '../../model/types.ts'

export interface LabelPart {
  text: string
  weight: 600 | 400
}

export function lineCount(heightPx: number): number {
  return Math.floor((heightPx - 6) / 14)
}

export function linkedParts(input: {
  course: string
  title: string
  start: number
  end: number
  heightPx: number
  widthPx: number
  view: View
  forceTime?: boolean
}): LabelPart[][] {
  const lines = lineCount(input.heightPx)
  const range = formatRange(input.start, input.end)
  const stacked = lines >= 2 && (input.view === 'day' || input.widthPx >= 110)
  if (!input.course) {
    if (stacked) {
      const out: LabelPart[][] = [[{ text: input.title, weight: 600 }]]
      if (lines >= 3) out.push([{ text: range, weight: 400 }])
      return out
    }
    const parts: LabelPart[] = [{ text: input.title, weight: 600 }]
    if (input.forceTime) parts.push({ text: ` ${formatTime(input.start)}`, weight: 400 })
    return [parts]
  }
  if (stacked) {
    const out: LabelPart[][] = [
      [{ text: input.course, weight: 600 }],
      [{ text: input.title, weight: 400 }],
    ]
    if (lines >= 3) out.push([{ text: range, weight: 400 }])
    return out
  }
  const parts: LabelPart[] = [
    { text: input.course, weight: 600 },
    { text: ` · ${input.title}`, weight: 400 },
  ]
  if (input.forceTime) parts.push({ text: ` ${formatTime(input.start)}`, weight: 400 })
  return [parts]
}

export function plainParts(input: {
  title: string
  start: number
  end: number
  heightPx: number
  widthPx: number
}): LabelPart[][] {
  const lines = lineCount(input.heightPx)
  if (lines >= 2) {
    return [
      [{ text: input.title, weight: 600 }],
      [{ text: formatRange(input.start, input.end), weight: 400 }],
    ]
  }
  const parts: LabelPart[] = [{ text: input.title, weight: 600 }]
  if (input.widthPx >= 90) parts.push({ text: ` ${formatTime(input.start)}`, weight: 400 })
  return [parts]
}

export function monthTimedLabel(input: {
  start: number | null
  end: number
  continuation: boolean
  course: string | null
  title: string
}): string {
  if (input.continuation) return `–${formatCompact(input.end)} ${input.title}`
  const time = formatCompact(input.start ?? 0)
  return input.course ? `${time} ${input.course} · ${input.title}` : `${time} ${input.title}`
}
