import { describe, expect, it } from 'vitest'
import { formatCompact, formatGutterHour, formatRange, formatTime, snap5 } from './minutes.ts'

describe('minutes', () => {
  it('snaps to 5 minutes', () => {
    expect(snap5(8)).toBe(10)
    expect(snap5(7)).toBe(5)
    expect(snap5(960)).toBe(960)
  })

  it('formats the spec examples', () => {
    expect(formatTime(17 * 60 + 30)).toBe('5:30 PM')
    expect(formatTime(12 * 60)).toBe('12:00 PM')
    expect(formatTime(0)).toBe('12:00 AM')
    expect(formatRange(16 * 60, 17 * 60)).toBe('4:00–5:00 PM')
    expect(formatRange(23 * 60, 31 * 60)).toBe('11:00 PM–7:00 AM')
    expect(formatRange(8 * 60 + 50, 15 * 60 + 30)).toBe('8:50 AM–3:30 PM')
    expect(formatCompact(16 * 60)).toBe('4pm')
    expect(formatCompact(16 * 60 + 30)).toBe('4:30pm')
    expect(formatCompact(0)).toBe('12am')
    expect(formatGutterHour(7)).toBe('7 AM')
    expect(formatGutterHour(12)).toBe('12 PM')
    expect(formatGutterHour(13)).toBe('1 PM')
  })
})
