import type { Segment } from './instances.ts'

export interface SegmentLayout {
  col: 0 | 1
  cols: 1 | 2
  hidden: boolean
}

export interface OverflowPair {
  anchorId: string
  hiddenIds: string[]
}

export interface DayLayout {
  byId: Record<string, SegmentLayout>
  overflow: OverflowPair[]
}

export function layoutDay(segments: readonly Segment[]): DayLayout {
  const sorted = [...segments].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top
    if (a.bottom !== b.bottom) return b.bottom - a.bottom
    return a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0
  })
  const clusters: Segment[][] = []
  let current: Segment[] = []
  let clusterEnd = -1
  for (const seg of sorted) {
    if (current.length === 0 || seg.top < clusterEnd) {
      current.push(seg)
      clusterEnd = Math.max(clusterEnd, seg.bottom)
    } else {
      clusters.push(current)
      current = [seg]
      clusterEnd = seg.bottom
    }
  }
  if (current.length) clusters.push(current)

  const byId: Record<string, SegmentLayout> = {}
  const overflow: OverflowPair[] = []

  for (const cluster of clusters) {
    const colEnd: [number, number] = [-1, -1]
    let occupant1: string | null = null
    let used1 = false
    const hidden = new Map<string, string[]>()
    const placed: { id: string; col: 0 | 1 | 'hidden' }[] = []
    for (const seg of cluster) {
      if (colEnd[0] <= seg.top) {
        placed.push({ id: seg.sessionId, col: 0 })
        colEnd[0] = seg.bottom
      } else if (colEnd[1] <= seg.top) {
        placed.push({ id: seg.sessionId, col: 1 })
        colEnd[1] = seg.bottom
        occupant1 = seg.sessionId
        used1 = true
      } else {
        placed.push({ id: seg.sessionId, col: 'hidden' })
        if (occupant1) {
          const list = hidden.get(occupant1) ?? []
          list.push(seg.sessionId)
          hidden.set(occupant1, list)
        }
      }
    }
    for (const item of placed) {
      if (item.col === 'hidden') {
        byId[item.id] = { col: 1, cols: 2, hidden: true }
      } else {
        byId[item.id] = { col: item.col, cols: used1 ? 2 : 1, hidden: false }
      }
    }
    for (const [anchorId, hiddenIds] of hidden) overflow.push({ anchorId, hiddenIds })
  }

  return { byId, overflow }
}
