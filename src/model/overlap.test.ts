import { describe, expect, it } from 'vitest'
import type { Segment } from './instances.ts'
import { layoutDay } from './overlap.ts'

function seg(id: string, top: number, bottom: number): Segment {
  return { sessionId: id, instanceDate: '2026-09-24', top, bottom, isContinuation: false }
}

describe('layoutDay', () => {
  it('gives a single block the full column', () => {
    const layout = layoutDay([seg('a', 600, 660)])
    expect(layout.byId.a).toEqual({ col: 0, cols: 1, hidden: false })
    expect(layout.overflow).toEqual([])
  })

  it('puts a pair side by side', () => {
    const layout = layoutDay([seg('a', 600, 720), seg('b', 630, 700)])
    expect(layout.byId.a).toMatchObject({ col: 0, cols: 2, hidden: false })
    expect(layout.byId.b).toMatchObject({ col: 1, cols: 2, hidden: false })
    expect(layout.overflow).toEqual([])
  })

  it('hides a third block as +1 on the col-1 pair', () => {
    const layout = layoutDay([seg('a', 600, 720), seg('b', 600, 720), seg('c', 600, 720)])
    expect(layout.byId.a.hidden).toBe(false)
    expect(layout.byId.b).toMatchObject({ col: 1, hidden: false })
    expect(layout.byId.c.hidden).toBe(true)
    expect(layout.overflow).toEqual([{ anchorId: 'b', hiddenIds: ['c'] }])
  })

  it('keeps a chain in two columns when each new block finds a free column', () => {
    const layout = layoutDay([seg('a', 540, 600), seg('b', 570, 660), seg('c', 630, 720)])
    expect(layout.byId.a).toMatchObject({ col: 0, cols: 2, hidden: false })
    expect(layout.byId.b).toMatchObject({ col: 1, cols: 2, hidden: false })
    expect(layout.byId.c).toMatchObject({ col: 0, cols: 2, hidden: false })
    expect(layout.overflow).toEqual([])
  })
})
