import { closeMonth, openMonth } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'

export interface MonthGeom {
  left: number
  top: number
  cellW: number
  cellH: number
  dates: string[]
}

let geom: MonthGeom | null = null
let overlayRect: { left: number; right: number; top: number; bottom: number } | null = null
let chipRect: { left: number; right: number; top: number; bottom: number } | null = null
let timer: number | undefined
let cell: string | null = null
let originX = 0
let originY = 0
const cellEls = new Map<string, HTMLElement>()

export function setMonthGeom(next: MonthGeom | null): void {
  geom = next
}

export function setOverlayRect(rect: { left: number; right: number; top: number; bottom: number } | null): void {
  overlayRect = rect
}

export function setChipRect(rect: { left: number; right: number; top: number; bottom: number } | null): void {
  chipRect = rect
}

export function overlayHit(x: number, y: number): boolean {
  if (!overlayRect) return false
  return x >= overlayRect.left && x <= overlayRect.right && y >= overlayRect.top && y <= overlayRect.bottom
}

export function chipHit(x: number, y: number): boolean {
  if (!chipRect) return false
  return x >= chipRect.left && x <= chipRect.right && y >= chipRect.top && y <= chipRect.bottom
}

export function registerCell(date: string, el: HTMLElement | null): void {
  if (el) cellEls.set(date, el)
  else cellEls.delete(date)
}

export function cellAt(x: number, y: number): string | null {
  if (overlayRect && x >= overlayRect.left && x <= overlayRect.right && y >= overlayRect.top && y <= overlayRect.bottom) {
    return null
  }
  if (!geom || geom.cellW <= 0 || geom.cellH <= 0) return null
  const col = Math.floor((x - geom.left) / geom.cellW)
  const row = Math.floor((y - geom.top) / geom.cellH)
  if (col < 0 || col > 6 || row < 0 || row > 5) return null
  return geom.dates[row * 7 + col] ?? null
}

function highlight(date: string | null): void {
  for (const [key, el] of cellEls) {
    const on = key === date
    el.style.background = on ? 'var(--accent-soft)' : ''
    el.style.boxShadow = on ? 'inset 0 0 0 1px var(--accent)' : ''
  }
}

function arm(date: string, x: number, y: number): void {
  cell = date
  originX = x
  originY = y
  window.clearTimeout(timer)
  const open = useStore.getState().monthOverlayDate
  if (open && open !== date) closeMonth()
  timer = window.setTimeout(() => openMonth(date), 400)
}

/** `assignmentDrag` is a drag of a row from the unfinished list. Nothing else opens a day. */
export function monthMove(x: number, y: number, assignmentDrag: boolean): void {
  if (!assignmentDrag) {
    window.clearTimeout(timer)
    timer = undefined
    return
  }
  const date = cellAt(x, y)
  highlight(date)
  if (!date) {
    window.clearTimeout(timer)
    timer = undefined
    cell = null
    if (!overlayHit(x, y) && useStore.getState().monthOverlayDate) closeMonth()
    return
  }
  if (date !== cell) {
    arm(date, x, y)
    return
  }
  if (Math.hypot(x - originX, y - originY) >= 3) arm(date, x, y)
}

export function monthLeave(): void {
  window.clearTimeout(timer)
  timer = undefined
  cell = null
  highlight(null)
  if (useStore.getState().monthOverlayDate) closeMonth()
}
