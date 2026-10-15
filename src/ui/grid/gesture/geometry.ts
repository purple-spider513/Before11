export const PX_PER_MIN = 64 / 60

export function minuteToPx(minute: number): number {
  return Math.round(minute * PX_PER_MIN)
}

export function blockHeight(top: number, bottom: number): number {
  return Math.max(1, minuteToPx(bottom) - minuteToPx(top) - 1)
}

export function blockBox(colW: number, col: 0 | 1, cols: 1 | 2): { left: number; width: number } {
  if (cols === 1) return { left: 2, width: Math.max(0, Math.floor(colW - 8)) }
  const w = Math.floor((colW - 8 - 2) / 2)
  return { left: col === 0 ? 2 : 2 + w + 2, width: Math.max(0, w) }
}

export function fullBox(colW: number): { left: number; width: number } {
  return { left: 2, width: Math.max(0, Math.floor(colW - 8)) }
}

export function minuteFromPointer(clientY: number, scrollerTop: number, scrollTop: number): number {
  return (clientY - scrollerTop + scrollTop) / PX_PER_MIN
}

export function dayIndexFromPointer(clientX: number, columnsLeft: number, colW: number, count: number): number {
  if (colW <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.floor((clientX - columnsLeft) / colW)))
}

export function handleInner(heightPx: number): number {
  return Math.min(4, Math.floor((heightPx - 8) / 2))
}
