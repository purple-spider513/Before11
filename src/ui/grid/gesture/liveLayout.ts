import { layoutDay } from '../../../model/overlap.ts'
import type { Segment } from '../../../model/instances.ts'
import { blockBox } from './geometry.ts'

export const blockEls = new Map<string, HTMLElement>()

export function segKey(sessionId: string, date: string): string {
  return `${sessionId}@${date}`
}

export function registerBlock(key: string, el: HTMLElement | null): void {
  if (el) blockEls.set(key, el)
  else blockEls.delete(key)
}

export function applyLive(date: string, segments: Segment[], colW: number): void {
  const layout = layoutDay(segments)
  for (const seg of segments) {
    const el = blockEls.get(segKey(seg.sessionId, date))
    if (!el) continue
    const lay = layout.byId[seg.sessionId]
    if (!lay || lay.hidden) {
      el.style.visibility = 'hidden'
      continue
    }
    const box = blockBox(colW, lay.col, lay.cols)
    el.style.left = `${box.left}px`
    el.style.width = `${box.width}px`
    el.style.visibility = ''
  }
}

export function restoreDay(date: string): void {
  for (const [key, el] of blockEls) {
    if (!key.endsWith(`@${date}`)) continue
    if (el.dataset.left) el.style.left = `${el.dataset.left}px`
    if (el.dataset.width) el.style.width = `${el.dataset.width}px`
    el.style.visibility = el.dataset.dragHidden === '1' ? 'hidden' : ''
  }
}

export function hideBlock(sessionId: string, date: string): void {
  const el = blockEls.get(segKey(sessionId, date))
  if (!el) return
  el.dataset.dragHidden = '1'
  el.style.visibility = 'hidden'
}

export function clearDragHidden(): void {
  for (const el of blockEls.values()) {
    if (el.dataset.dragHidden === '1') {
      delete el.dataset.dragHidden
      el.style.visibility = ''
    }
  }
}
