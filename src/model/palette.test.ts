import { describe, expect, it } from 'vitest'
import { COURSE_ORDER, SWATCHES, courseSwatches, plainSwatches } from './palette.ts'

describe('palette', () => {
  it('keeps eight course colors and puts slate only on plain blocks', () => {
    expect(COURSE_ORDER).toHaveLength(8)
    expect(courseSwatches().map((s) => s.key)).toEqual([...COURSE_ORDER])
    expect(plainSwatches()[0].key).toBe('slate')
    expect(plainSwatches()).toHaveLength(9)
    expect(SWATCHES.find((s) => s.key === 'slate')?.fill).toBe('#4E4866')
  })
})
