import { describe, expect, it } from 'vitest'
import { linkedParts } from './labels.ts'

describe('linkedParts', () => {
  it('omits the course segment when a task has none', () => {
    const rows = linkedParts({
      course: '',
      title: 'Email teacher',
      start: 600,
      end: 660,
      heightPx: 64,
      widthPx: 160,
      view: 'week',
    })
    expect(rows[0][0].text).toBe('Email teacher')
    expect(rows.flat().some((part) => part.text.includes('·'))).toBe(false)
  })

  it('keeps the course on a homework block', () => {
    const rows = linkedParts({
      course: 'Math',
      title: 'Worksheet',
      start: 600,
      end: 660,
      heightPx: 20,
      widthPx: 80,
      view: 'week',
    })
    expect(rows[0].map((part) => part.text).join('')).toBe('Math · Worksheet')
  })
})
