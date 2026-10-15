import { COURSE_ORDER } from './palette.ts'
import type { Course, PaletteKey } from './types.ts'

export function nextCourseColor(courses: readonly Course[]): PaletteKey {
  const counts = new Map<PaletteKey, number>()
  for (const key of COURSE_ORDER) counts.set(key, 0)
  for (const course of courses) {
    counts.set(course.color, (counts.get(course.color) ?? 0) + 1)
  }
  for (const key of COURSE_ORDER) {
    if (counts.get(key) === 0) return key
  }
  let best: PaletteKey = COURSE_ORDER[0]
  let bestCount = Number.POSITIVE_INFINITY
  for (const key of COURSE_ORDER) {
    const count = counts.get(key) ?? 0
    if (count < bestCount) {
      best = key
      bestCount = count
    }
  }
  return best
}
