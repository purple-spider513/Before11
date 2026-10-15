import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatDayTitle,
  isWeekday,
  monthGridStart,
  nowMinute,
  startOfWeek,
  todayStr,
  weekdayIndex,
} from './dates.ts'

describe('dates', () => {
  it('reads today and now from a local Date', () => {
    expect(todayStr(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24')
    expect(nowMinute(new Date(2026, 8, 24, 16, 5))).toBe(16 * 60 + 5)
  })

  it('adds days in UTC so a DST boundary does not skip', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-09-24', -1)).toBe('2026-09-23')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('knows weekdays and the Sunday week start', () => {
    expect(weekdayIndex('2026-09-24')).toBe(4)
    expect(startOfWeek('2026-09-24')).toBe('2026-09-20')
    expect(isWeekday('2026-09-24')).toBe(true)
    expect(isWeekday('2026-09-20')).toBe(false)
    expect(isWeekday('2026-09-26')).toBe(false)
  })

  it('steps months onto the 1st and starts the month grid on Sunday', () => {
    expect(addMonths('2026-09-24', 1)).toBe('2026-10-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
    expect(monthGridStart('2026-09-24')).toBe('2026-08-30')
  })

  it('formats the day title used in the header', () => {
    expect(formatDayTitle('2026-09-24')).toBe('Thursday, September 24, 2026')
  })
})
