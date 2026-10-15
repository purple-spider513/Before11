import { describe, expect, it } from 'vitest'
import { headerLabel, stepAnchor, visibleDates } from './range.ts'

describe('range', () => {
  it('builds day, 3 days, week, and the 42-cell month', () => {
    expect(visibleDates('day', '2026-09-24')).toEqual(['2026-09-24'])
    expect(visibleDates('3day', '2026-09-24')).toEqual(['2026-09-24', '2026-09-25', '2026-09-26'])
    expect(visibleDates('week', '2026-09-24')[0]).toBe('2026-09-20')
    expect(visibleDates('week', '2026-09-24')).toHaveLength(7)
    expect(visibleDates('month', '2026-09-24')).toHaveLength(42)
    expect(visibleDates('month', '2026-09-24')[0]).toBe('2026-08-30')
  })

  it('steps and labels the header', () => {
    expect(stepAnchor('week', '2026-09-24', 1)).toBe('2026-10-01')
    expect(stepAnchor('month', '2026-09-24', -1)).toBe('2026-08-01')
    expect(headerLabel('day', '2026-09-24')).toBe('Thursday, September 24, 2026')
    expect(headerLabel('week', '2026-09-24')).toBe('September 2026')
    expect(headerLabel('week', '2026-11-29')).toBe('Nov – Dec 2026')
    expect(headerLabel('week', '2026-12-27')).toBe('Dec 2026 – Jan 2027')
    expect(headerLabel('month', '2026-09-01')).toBe('September 2026')
  })
})
