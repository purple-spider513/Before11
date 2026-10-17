import { addDays, diffDays } from '../../../model/dates.ts'
import { computeSegments, type Segment } from '../../../model/instances.ts'
import { formatTime } from '../../../model/minutes.ts'
import { swatch } from '../../../model/palette.ts'
import type { Session, View } from '../../../model/types.ts'
import {
  armChip,
  clearSelection,
  createLinked,
  createPlain,
  moveSession,
  openPlainPopover,
  placeChip,
  resizeSession,
  selectSession,
  setFirstClick,
  toggleRow,
} from '../../../store/actions.ts'
import { hideTooltip } from '../../Tooltip.tsx'
import { motionOn, setHeldId, subscribeMotion } from '../../motion.ts'
import { useStore } from '../../../store/store.ts'
import { linkedParts, plainParts, type LabelPart } from '../labels.ts'
import { edgeSpeed } from './autoscroll.ts'
import { blockHeight, dayIndexFromPointer, minuteFromPointer, minuteToPx } from './geometry.ts'
import { applyLive, clearDragHidden, hideBlock, restoreDay } from './liveLayout.ts'
import { cellAt, chipHit, monthLeave, monthMove } from '../../month/rest.ts'

export interface GridHost {
  scroller: HTMLElement
  columns: HTMLElement
  drag: HTMLElement
  guideA: HTMLElement
  guideB: HTMLElement
  preview: HTMLElement
  getDates: () => string[]
  getColW: () => number
  view: View
}

interface Measure {
  top: number
  bottom: number
  columnsLeft: number
  colW: number
  dates: string[]
  scrollTop: number
}

interface Press {
  pointerId: number
  x: number
  y: number
  el: HTMLElement
  kind: 'block' | 'empty' | 'list' | 'chip' | 'allday'
  handle: 'body' | 'top' | 'bottom'
  sessionId: string | null
  workItemId: string | null
  date: string
  wasSelected: boolean
  measure: Measure | null
}

let host: GridHost | null = null
let ghostEl: HTMLElement | null = null
let press: Press | null = null
let dragKind: 'move' | 'resizeTop' | 'resizeBottom' | 'draw' | 'list' | 'chip' | null = null
let measure: Measure | null = null
let allDayRects: { date: string; left: number; right: number; top: number; bottom: number }[] = []
let scrollRaf = 0
let lastX = 0
let lastY = 0
let lastDate = ''
let grab = 0
let originStart = 0
let originEnd = 0
let span = 60
let moved = false
let ghostDX = 8
let ghostDY = 8
let measuredHost: GridHost | null = null
let liveDate = ''

const allDayEls = new Map<string, HTMLElement>()

export function registerAllDay(date: string, el: HTMLElement | null): void {
  if (el) allDayEls.set(date, el)
  else allDayEls.delete(date)
}

export function bindGrid(next: GridHost | null): void {
  host = next
}

export function bindGhost(el: HTMLElement | null): void {
  ghostEl = el
}

export function gestureActive(): boolean {
  return press !== null || dragKind !== null
}

function dist(x: number, y: number): number {
  if (!press) return 0
  return Math.hypot(x - press.x, y - press.y)
}

function readMeasure(): Measure | null {
  if (!host) return null
  const scroller = host.scroller.getBoundingClientRect()
  const columns = host.columns.getBoundingClientRect()
  const dates = host.getDates()
  const colW = dates.length ? columns.width / dates.length : host.getColW()
  return {
    top: scroller.top,
    bottom: scroller.bottom,
    columnsLeft: columns.left,
    colW,
    dates,
    scrollTop: host.scroller.scrollTop,
  }
}

function minuteAt(clientY: number): number {
  if (!measure || !host) return 0
  return minuteFromPointer(clientY, measure.top, host.scroller.scrollTop)
}

function indexAt(clientX: number): number {
  if (!measure) return 0
  return dayIndexFromPointer(clientX, measure.columnsLeft, measure.colW, measure.dates.length)
}

function capture(e: GestureEvent, el: HTMLElement): void {
  el.setPointerCapture(e.pointerId)
  e.preventDefault()
  document.body.style.userSelect = 'none'
}

function releaseChrome(): void {
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  window.cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
}

function clearLift(): void {
  if (host) {
    host.drag.style.scale = ''
    host.drag.style.boxShadow = ''
    host.drag.style.transition = ''
    host.drag.style.animation = ''
  }
  if (ghostEl) {
    ghostEl.style.scale = ''
    ghostEl.style.boxShadow = ''
    ghostEl.style.transition = ''
    ghostEl.style.animation = ''
  }
}

function hideFloats(): void {
  if (host) {
    host.drag.hidden = true
    host.preview.hidden = true
    host.guideA.hidden = true
    host.guideB.hidden = true
  }
  if (ghostEl) ghostEl.hidden = true
  clearLift()
  setHeldId(null)
}

function applyLift(el: HTMLElement): void {
  const lift = motionOn() && (dragKind === 'move' || dragKind === 'list' || dragKind === 'chip')
  el.style.scale = lift ? '1.02' : ''
  el.style.boxShadow = lift ? 'var(--float-shadow)' : ''
  el.style.transition = 'none'
  el.style.animation = 'none'
}

export function cancelGesture(): boolean {
  if (!press && !dragKind) return false
  const el = press?.el
  if (el?.hasPointerCapture(press!.pointerId)) el.releasePointerCapture(press!.pointerId)
  if (liveDate) restoreDay(liveDate)
  clearDragHidden()
  hideFloats()
  releaseChrome()
  monthLeave()
  press = null
  dragKind = null
  moved = false
  liveDate = ''
  return true
}

function onMove(e: PointerEvent): void {
  if (!press || e.pointerId !== press.pointerId) return
  lastX = e.clientX
  lastY = e.clientY
  if (!dragKind && dist(e.clientX, e.clientY) >= 4) beginDrag()
  if (!dragKind) return
  moved = true
  updateDrag(e.clientX, e.clientY)
  kickScroll()
}

function onUp(e: PointerEvent): void {
  if (!press || e.pointerId !== press.pointerId) return
  const el = press.el
  el.removeEventListener('pointermove', onMove)
  el.removeEventListener('pointerup', onUp)
  el.removeEventListener('pointercancel', onCancel)
  if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  const wasDrag = dragKind !== null && moved
  if (wasDrag) commitDrag(e.clientX, e.clientY)
  else click()
  if (liveDate) restoreDay(liveDate)
  clearDragHidden()
  hideFloats()
  releaseChrome()
  monthLeave()
  press = null
  dragKind = null
  moved = false
  liveDate = ''
}

function onCancel(e: PointerEvent): void {
  if (!press || e.pointerId !== press.pointerId) return
  cancelGesture()
}

function track(e: GestureEvent, el: HTMLElement): void {
  capture(e, el)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
}

function begin(e: GestureEvent, partial: Omit<Press, 'pointerId' | 'x' | 'y' | 'el' | 'measure'>): void {
  if (press) cancelGesture()
  const el = e.currentTarget as HTMLElement
  press = {
    ...partial,
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    el,
    measure: null,
  }
  lastX = e.clientX
  lastY = e.clientY
  hideTooltip()
  track(e, el)
}

export interface GestureEvent {
  pointerId: number
  clientX: number
  clientY: number
  currentTarget: EventTarget | null
  preventDefault(): void
}

export function downBlock(e: GestureEvent, sessionId: string, date: string, handle: 'body' | 'top' | 'bottom'): void {
  const state = useStore.getState()
  const wasSelected = state.selection?.sessionId === sessionId && state.selection.date === date
  selectSession(sessionId, date)
  begin(e, { kind: 'block', handle, sessionId, workItemId: null, date, wasSelected })
}

export function downEmpty(e: GestureEvent, date: string): void {
  const armed = useStore.getState().armed
  if (!armed) clearSelection()
  begin(e, { kind: 'empty', handle: 'body', sessionId: null, workItemId: null, date, wasSelected: false })
}

export function downList(e: GestureEvent, workItemId: string): void {
  clearSelection()
  begin(e, { kind: 'list', handle: 'body', sessionId: null, workItemId, date: '', wasSelected: false })
}

export function downChip(e: GestureEvent, sessionId: string): void {
  begin(e, { kind: 'chip', handle: 'body', sessionId, workItemId: null, date: '', wasSelected: false })
}

export function downAllDay(e: GestureEvent, date: string): void {
  begin(e, { kind: 'allday', handle: 'body', sessionId: null, workItemId: null, date, wasSelected: false })
}

function beginDrag(): void {
  if (!press) return
  measure = readMeasure()
  allDayRects = [...allDayEls.entries()].map(([date, el]) => {
    const r = el.getBoundingClientRect()
    return { date, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
  })
  const session = press.sessionId ? useStore.getState().sessions[press.sessionId] : undefined
  if (press.kind === 'block' && session && session.start != null && session.end != null && measure) {
    originStart = session.start
    originEnd = session.end
    span = session.end - session.start
    const pointerMinute = minuteAt(press.y)
    const downDelta = diffDays(session.date, press.date)
    grab = pointerMinute + downDelta * 1440 - session.start
    dragKind = press.handle === 'top' ? 'resizeTop' : press.handle === 'bottom' ? 'resizeBottom' : 'move'
    document.body.style.cursor = dragKind === 'move' ? 'grabbing' : 'ns-resize'
    hideBlock(session.id, press.date)
  } else if (press.kind === 'empty') {
    dragKind = 'draw'
  } else if (press.kind === 'list') {
    dragKind = 'list'
    setHeldId(press.workItemId)
    const row = press.el.getBoundingClientRect()
    ghostDX = Math.min(240, Math.max(0, press.x - row.left))
    ghostDY = Math.min(24, Math.max(0, press.y - row.top))
  } else if (press.kind === 'chip') {
    dragKind = 'chip'
    document.body.style.cursor = 'grabbing'
  }
}

function sessionView(): View {
  return host?.view === 'month' ? 'day' : (host?.view ?? 'week')
}

function paint(el: HTMLElement, fill: string, rows: LabelPart[][], width: number, topMin: number, bottomMin: number, x: number): void {
  el.hidden = false
  el.style.width = `${width}px`
  el.style.height = `${blockHeight(topMin, bottomMin)}px`
  el.style.background = fill
  el.style.transform = `translate(${x}px, ${minuteToPx(topMin)}px)`
  el.replaceChildren()
  const short = blockHeight(topMin, bottomMin) < 24
  el.style.padding = short ? '1px 6px' : '3px 6px'
  for (const parts of rows) {
    const line = document.createElement('div')
    line.style.whiteSpace = 'nowrap'
    line.style.overflow = 'hidden'
    line.style.textOverflow = 'ellipsis'
    line.style.fontSize = short ? '11px' : '12px'
    line.style.lineHeight = '14px'
    line.style.color = '#FFFFFF'
    for (const part of parts) {
      const span = document.createElement('span')
      span.style.fontWeight = String(part.weight)
      span.textContent = part.text
      line.appendChild(span)
    }
    el.appendChild(line)
  }
  applyLift(el)
}

function showGuide(minute: number, second: number | null): void {
  if (!host) return
  const place = (el: HTMLElement, value: number) => {
    el.hidden = false
    el.textContent = formatTime(value)
    el.style.top = `${minuteToPx(value)}px`
  }
  place(host.guideA, minute)
  if (second == null) host.guideB.hidden = true
  else place(host.guideB, second)
}

function layoutTarget(date: string, seg: Segment | null, exclude: string): void {
  if (!measure) return
  if (liveDate && liveDate !== date) restoreDay(liveDate)
  const base = computeSegments(date, Object.values(useStore.getState().sessions)).filter((item) => item.sessionId !== exclude)
  if (seg) base.push(seg)
  applyLive(date, base, measure.colW)
  liveDate = date
}

function updateDrag(x: number, y: number): void {
  if (!press || !dragKind) return
  ensureMeasure()
  if (dragKind === 'list' || dragKind === 'chip') {
    updateGhost(x, y)
    return
  }
  if (!host || !measure) return
  const minute = minuteAt(y)
  const index = indexAt(x)
  const date = measure.dates[index] ?? press.date
  if (dragKind === 'draw') {
    const a = Math.round(minuteAt(press.y) / 5) * 5
    const b = Math.round(minute / 5) * 5
    let start = Math.min(a, b)
    let end = Math.max(a, b)
    if (end - start < 15) {
      if (b >= a) end = Math.min(1440, start + 15)
      else start = Math.max(0, end - 15)
    }
    start = Math.max(0, Math.min(start, 1440))
    end = Math.max(start, Math.min(end, 1440))
    const colIndex = Math.max(0, measure.dates.indexOf(press.date))
    host.preview.hidden = false
    host.preview.style.transform = `translate(${colIndex * measure.colW + 2}px, ${minuteToPx(start)}px)`
    host.preview.style.width = `${Math.max(0, measure.colW - 8)}px`
    host.preview.style.height = `${blockHeight(start, end)}px`
    host.preview.textContent = formatTime(start) + '–' + formatTime(end)
    showGuide(start, end)
    lastDate = press.date
    originStart = start
    originEnd = end
    return
  }
  const session = press.sessionId ? useStore.getState().sessions[press.sessionId] : undefined
  if (!session || session.start == null || session.end == null) return
  const repeating = session.repeat !== 'none'
  if (dragKind === 'move') {
    const targetDate = repeating ? session.date : date
    const dayDelta = repeating ? 0 : diffDays(session.date, targetDate)
    const raw = minute + dayDelta * 1440 - grab
    const maxStart = Math.min(1435, 2880 - span)
    const start = Math.max(0, Math.min(maxStart, Math.round(raw / 5) * 5))
    const col = repeating ? Math.max(0, measure.dates.indexOf(press.date)) : index
    paintBlock(session, start, start + span, col)
    showGuide(((start % 1440) + 1440) % 1440, null)
    const top = start >= 1440 ? start - 1440 : start
    const bottom = Math.min(top + span, 1440)
    layoutTarget(
      targetDate,
      { sessionId: session.id, instanceDate: targetDate, top, bottom, isContinuation: false },
      session.id,
    )
    lastDate = targetDate
    originStart = start
  } else if (dragKind === 'resizeTop') {
    const start = Math.max(0, Math.min(Math.min(1435, originEnd - 15), Math.round(minute / 5) * 5))
    const col = Math.max(0, measure.dates.indexOf(session.date))
    paintBlock(session, start, originEnd, col)
    showGuide(start, originEnd > 1440 ? 1440 : originEnd)
    layoutTarget(
      session.date,
      { sessionId: session.id, instanceDate: session.date, top: start, bottom: Math.min(originEnd, 1440), isContinuation: false },
      session.id,
    )
    originStart = start
    lastDate = session.date
  } else if (dragKind === 'resizeBottom') {
    const columnDate = measure.dates[index] ?? session.date
    let absEnd = diffDays(session.date, columnDate) * 1440 + Math.round(minute / 5) * 5
    const nextVisible = measure.dates.includes(addDays(session.date, 1))
    const cap = nextVisible ? 2880 : Math.max(1440, session.end)
    absEnd = Math.max(originStart + 15, Math.min(cap, absEnd))
    const col = Math.max(0, measure.dates.indexOf(session.date))
    paintBlock(session, originStart, absEnd, col)
    showGuide(originStart, absEnd > 1440 ? 1440 : absEnd)
    layoutTarget(
      session.date,
      { sessionId: session.id, instanceDate: session.date, top: originStart, bottom: Math.min(absEnd, 1440), isContinuation: false },
      session.id,
    )
    originEnd = absEnd
    lastDate = session.date
  }
}

function paintBlock(session: Session, start: number, end: number, col: number): void {
  if (!host || !measure) return
  const width = Math.max(0, measure.colW - 8)
  const height = blockHeight(start > 1440 ? 0 : start, Math.min(end, 1440))
  const state = useStore.getState()
  let fill = swatch('slate').fill
  let rows: LabelPart[][]
  if (session.workItemId) {
    const item = state.workItems[session.workItemId]
    const course = item?.courseId ? state.courses[item.courseId] : undefined
    fill = swatch(course?.color ?? 'slate').fill
    rows = linkedParts({
      course: course?.name ?? '',
      title: item?.title ?? '',
      start,
      end,
      heightPx: height,
      widthPx: width,
      view: sessionView(),
    })
  } else {
    fill = swatch(session.color ?? 'slate').fill
    rows = plainParts({ title: session.title || 'Busy', start, end, heightPx: height, widthPx: width })
  }
  const visualStart = start >= 1440 ? start - 1440 : start
  const visualEnd = end > 1440 && start < 1440 ? 1440 : end >= 1440 ? end - 1440 : end
  paint(host.drag, fill, rows, width, visualStart, visualEnd, col * measure.colW + 2)
}

function ensureMeasure(): void {
  if (!host || (measure && measuredHost === host)) return
  const next = readMeasure()
  if (!next) return
  measure = next
  measuredHost = host
}

function updateGhost(x: number, y: number): void {
    monthMove(x, y, dragKind === 'list')
  const over = columnHit(x, y)
  if (over && host && measure && dragKind === 'list' && press?.workItemId) {
    if (ghostEl) ghostEl.hidden = true
    const minute = Math.max(0, Math.min(1380, Math.round(minuteAt(y) / 5) * 5))
    const state = useStore.getState()
    const item = state.workItems[press.workItemId]
    const course = item?.courseId ? state.courses[item.courseId] : undefined
    const width = Math.max(0, measure.colW - 8)
    const rows = linkedParts({
      course: course?.name ?? '',
      title: item?.title ?? '',
      start: minute,
      end: minute + 60,
      heightPx: blockHeight(minute, minute + 60),
      widthPx: width,
      view: sessionView(),
      forceTime: true,
    })
    paint(host.drag, swatch(course?.color ?? 'violet').fill, rows, width, minute, minute + 60, over.index * measure.colW + 2)
    showGuide(minute, null)
    layoutTarget(over.date, { sessionId: 'ghost', instanceDate: over.date, top: minute, bottom: minute + 60, isContinuation: false }, 'ghost')
    lastDate = over.date
    originStart = minute
    return
  }
  if (host) host.drag.hidden = true
  if (liveDate) {
    restoreDay(liveDate)
    liveDate = ''
  }
  if (ghostEl && dragKind === 'list' && press?.workItemId) {
    const state = useStore.getState()
    const item = state.workItems[press.workItemId]
    const course = item?.courseId ? state.courses[item.courseId] : undefined
    ghostEl.hidden = false
    ghostEl.style.background = swatch(course?.color ?? 'violet').fill
    ghostEl.textContent = course?.name ? `${course.name} · ${item?.title ?? ''}` : (item?.title ?? '')
    ghostEl.style.transform = `translate(${x - ghostDX}px, ${y - ghostDY}px)`
    applyLift(ghostEl)
  }
  if (dragKind === 'chip') positionChip(x, y)
}

function positionChip(x: number, y: number): void {
  const over = columnHit(x, y)
  if (!over || !host || !measure || !press?.sessionId) return
  const session = useStore.getState().sessions[press.sessionId]
  if (!session) return
  const minute = Math.max(0, Math.min(1380, Math.round(minuteAt(y) / 5) * 5))
  if (ghostEl) ghostEl.hidden = true
  paintBlock({ ...session, start: minute, end: minute + 60 }, minute, minute + 60, over.index)
  showGuide(minute, null)
  originStart = minute
  lastDate = over.date
}

function columnHit(x: number, y: number): { date: string; index: number } | null {
  if (!measure || !host) return null
  if (y < measure.top || y > measure.bottom) return null
  if (x < measure.columnsLeft || x > measure.columnsLeft + measure.colW * measure.dates.length) return null
  const index = indexAt(x)
  const date = measure.dates[index]
  return date ? { date, index } : null
}

function allDayHit(x: number, y: number): string | null {
  for (const rect of allDayRects) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return rect.date
  }
  return null
}

function kickScroll(): void {
  if (scrollRaf || !host || !measure) return
  const step = () => {
    scrollRaf = 0
    if (!host || !measure || !dragKind) return
    const speed = edgeSpeed(lastY, measure.top, measure.bottom)
    if (!speed) return
    host.scroller.scrollTop += speed
    updateDrag(lastX, lastY)
    scrollRaf = window.requestAnimationFrame(step)
  }
  if (edgeSpeed(lastY, measure.top, measure.bottom)) scrollRaf = window.requestAnimationFrame(step)
}

function commitDrag(x: number, y: number): void {
  if (!press || !dragKind) return
  if (dragKind === 'move' && press.sessionId) {
    moveSession(press.sessionId, lastDate || press.date, originStart)
    return
  }
  if ((dragKind === 'resizeTop' || dragKind === 'resizeBottom') && press.sessionId) {
    resizeSession(press.sessionId, originStart, originEnd)
    return
  }
  if (dragKind === 'draw') {
    createPlain({ date: press.date, start: originStart, end: originEnd })
    return
  }
  if (dragKind === 'list' && press.workItemId) {
    const column = columnHit(x, y)
    if (column) {
      createLinked({ workItemId: press.workItemId, date: column.date, start: originStart, end: originStart + 60, disarm: false })
      return
    }
    const strip = allDayHit(x, y)
    if (strip) {
      createLinked({ workItemId: press.workItemId, date: strip, start: null, end: null, disarm: false })
      return
    }
    if (chipHit(x, y)) {
      const date = useStore.getState().monthOverlayDate
      if (date) createLinked({ workItemId: press.workItemId, date, start: null, end: null, disarm: false })
      return
    }
    const month = cellAt(x, y)
    if (month) createLinked({ workItemId: press.workItemId, date: month, start: null, end: null, disarm: false })
    return
  }
  if (dragKind === 'chip' && press.sessionId) {
    const column = columnHit(x, y)
    if (column) placeChip(press.sessionId, column.date, originStart)
  }
}

function click(): void {
  if (!press) return
  if (!measure) measure = readMeasure()
  const state = useStore.getState()
  if (press.kind === 'allday') {
    const armed = state.armed
    if (armed?.kind === 'workItem') {
      createLinked({ workItemId: armed.workItemId, date: press.date, start: null, end: null, disarm: true })
    }
    return
  }
  if (press.kind === 'list' && press.workItemId) {
    toggleRow(press.workItemId)
    return
  }
  if (press.kind === 'chip' && press.sessionId) {
    armChip(press.sessionId)
    return
  }
  if (press.kind === 'block' && press.sessionId) {
    if (!press.wasSelected) return
    const session = state.sessions[press.sessionId]
    if (!session) return
    openPlainPopover(session.id, press.date, false)
    return
  }
  if (press.kind === 'empty') {
    const minute = measure ? minuteAt(press.y) : minuteAt(lastY)
    if (!measure) measure = readMeasure()
    const armed = state.armed
    if (armed?.kind === 'workItem') {
      const snapped = Math.max(0, Math.min(1435, Math.round(minute / 5) * 5))
      const onStrip = allDayHit(press.x, press.y)
      if (onStrip) {
        createLinked({ workItemId: armed.workItemId, date: onStrip, start: null, end: null, disarm: true })
      } else {
        createLinked({
          workItemId: armed.workItemId,
          date: press.date,
          start: snapped,
          end: Math.min(2880, snapped + 60),
          disarm: true,
        })
      }
      return
    }
    if (armed?.kind === 'chip') {
      placeChip(armed.sessionId, press.date, minute)
      return
    }
    if (state.firstClick) {
      const a = state.firstClick.minute
      const b = Math.round(minute / 5) * 5
      if (Math.abs(b - a) < 15) createPlain({ date: state.firstClick.date, start: a, end: Math.min(a + 60, 1440) })
      else createPlain({ date: state.firstClick.date, start: Math.min(a, b), end: Math.max(a, b) })
      return
    }
    setFirstClick(press.date, minute)
  }
}

export function hoverGrid(x: number, y: number): void {
  if (dragKind || !host) return
  const first = useStore.getState().firstClick
  if (!first) {
    host.preview.hidden = true
    return
  }
  const current = readMeasure()
  if (!current) return
  measure = current
  const minute = Math.round(minuteAt(y) / 5) * 5
  const start = Math.min(first.minute, minute)
  const end = Math.max(first.minute, minute)
  const index = Math.max(0, current.dates.indexOf(first.date))
  host.preview.hidden = false
  host.preview.style.transform = `translate(${index * current.colW + 2}px, ${minuteToPx(start)}px)`
  host.preview.style.width = `${Math.max(0, current.colW - 8)}px`
  host.preview.style.height = `${Math.max(8, blockHeight(start, Math.max(end, start + 15)))}px`
  host.preview.textContent = formatTime(start) + '–' + formatTime(end)
  monthMove(x, y, false)
}

subscribeMotion(() => {
  if (!motionOn()) clearLift()
})
