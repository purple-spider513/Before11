import { describe, expect, it } from 'vitest'
import { nextCourseColor } from './courseColor.ts'
import { COURSE_ORDER } from './palette.ts'
import type { Course, PaletteKey } from './types.ts'

function course(color: PaletteKey, n: number): Course {
  return {
    id: `${color}-${n}`,
    name: color,
    color,
    createdAt: 0,
    updatedAt: 0,
    updatedBy: 'test',
  }
}

describe('nextCourseColor', () => {
  it('returns the first unused key', () => {
    expect(nextCourseColor([])).toBe('violet')
    expect(nextCourseColor([course('violet', 1)])).toBe('blue')
  })

  it('uses the lowest count and breaks ties toward the earlier key', () => {
    const all = COURSE_ORDER.map((key) => course(key, 1))
    expect(nextCourseColor(all)).toBe('violet')
    expect(nextCourseColor([...all, course('violet', 2)])).toBe('blue')
    expect(nextCourseColor([...all, course('violet', 2), course('blue', 2)])).toBe('teal')
  })
})
