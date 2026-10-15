import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { formatOverlayTitle } from '../../model/dates.ts'
import type { DateStr } from '../../model/types.ts'
import { closeMonth, openWorkItem } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { DayColumn } from '../grid/DayColumn.tsx'
import { TimeGutter } from '../grid/TimeGutter.tsx'
import { dayMarks, type Mark } from '../grid/dayMarks.ts'
import { bindGrid, downChip, hoverGrid } from '../grid/gesture/controller.ts'
import { hideTooltip, showTooltip } from '../Tooltip.tsx'
import { setChipRect, setOverlayRect, type MonthGeom } from './rest.ts'
import styles from './MonthOverlay.module.css'

export function MonthOverlay({ date, geom }: { date: DateStr; geom: MonthGeom | null }) {
  const workItems = useStore((s) => s.workItems)
  const sessions = useStore((s) => s.sessions)
  const courses = useStore((s) => s.courses)
  const marks = dayMarks(date, workItems, sessions, courses)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const guideARef = useRef<HTMLDivElement>(null)
  const guideBRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const [colW, setColW] = useState(300)
  const place = geom ? placeOverlay(geom, date) : { left: 8, top: 52, height: Math.round(window.innerHeight * 0.85) }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollTop = 448
    const root = rootRef.current
    if (root) {
      const rect = root.getBoundingClientRect()
      setOverlayRect({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })
    }
    const chips = chipRef.current
    if (chips) {
      const rect = chips.getBoundingClientRect()
      setChipRect({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })
    } else setChipRect(null)
    const columns = columnsRef.current
    const drag = dragRef.current
    const guideA = guideARef.current
    const guideB = guideBRef.current
    const preview = previewRef.current
    if (!scroller || !columns || !drag || !guideA || !guideB || !preview) return
    const measure = () => setColW(columns.getBoundingClientRect().width)
    drag.hidden = true
    guideA.hidden = true
    guideB.hidden = true
    preview.hidden = true
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(columns)
    bindGrid({
      scroller,
      columns,
      drag,
      guideA,
      guideB,
      preview,
      getDates: () => [date],
      getColW: () => columns.getBoundingClientRect().width,
      view: 'day',
    })
    return () => {
      observer.disconnect()
      bindGrid(null)
      setOverlayRect(null)
      setChipRect(null)
    }
  }, [date, marks.length])

  return createPortal(
    <div ref={rootRef} id="b11-overlay" className={styles.overlay} style={{ left: place.left, top: place.top, height: place.height }}>
      <div className={styles.head}>
        <span className={styles.title}>{formatOverlayTitle(date)}</span>
        <button type="button" className={styles.close} onClick={() => closeMonth()}>
          Close
        </button>
      </div>
      {marks.length > 0 ? <ChipRow marks={marks} chipRef={chipRef} /> : null}
      <div className={styles.time} ref={scrollerRef} onPointerMove={(e) => hoverGrid(e.clientX, e.clientY)}>
        <div className={styles.plane}>
          <div className={styles.gutter}>
            <TimeGutter width={44} />
            <div ref={guideARef} className={styles.guide} />
            <div ref={guideBRef} className={styles.guide} />
          </div>
          <div className={styles.columns} ref={columnsRef}>
            <DayColumn date={date} view="day" colW={colW} />
            <div ref={dragRef} className={styles.drag} />
            <div ref={previewRef} className={styles.preview} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function placeOverlay(geom: MonthGeom, date: DateStr): { left: number; top: number; height: number } {
  const height = Math.round(window.innerHeight * 0.85)
  const index = Math.max(0, geom.dates.indexOf(date))
  const col = index % 7
  const row = Math.floor(index / 7)
  const cellLeft = geom.left + col * geom.cellW
  const cellTop = geom.top + row * geom.cellH
  const cellRight = cellLeft + geom.cellW
  const cellBottom = cellTop + geom.cellH
  const roomRight = window.innerWidth - cellRight - 8
  const roomLeft = cellLeft - 8
  let left = roomRight >= roomLeft ? cellRight + 4 : cellLeft - 4 - 360
  left = Math.min(Math.max(8, left), window.innerWidth - 368)
  let top = row === 5 ? cellBottom - height : cellTop
  top = Math.min(Math.max(52, top), window.innerHeight - 8 - height)
  return { left, top, height }
}

function ChipRow({ marks, chipRef }: { marks: Mark[]; chipRef: RefObject<HTMLDivElement | null> }) {
  const [cut, setCut] = useState(marks.length)
  const localRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = localRef.current
    if (!el) return
    const nodes = [...el.querySelectorAll<HTMLElement>('[data-chip]')]
    let fit = nodes.length
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].offsetTop >= 64) {
        fit = i
        break
      }
    }
    if (fit < nodes.length) setCut(Math.max(0, fit - 1))
  }, [marks, cut])
  const shown = marks.slice(0, cut)
  const hidden = marks.slice(cut)
  return (
    <div
      className={styles.chips}
      ref={(el) => {
        localRef.current = el
        chipRef.current = el
      }}
    >
      {shown.map((mark) => (
        <Chip key={mark.id} mark={mark} />
      ))}
      {hidden.length > 0 ? (
        <span
          className={styles.more}
          tabIndex={0}
          onPointerEnter={(e) => showTooltip(e.currentTarget, hidden.map((mark) => mark.tip).join('\n'))}
          onPointerLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget, hidden.map((mark) => mark.tip).join('\n'))}
          onBlur={hideTooltip}
        >
          +{hidden.length} more
        </span>
      ) : null}
    </div>
  )
}

function Chip({ mark }: { mark: Mark }) {
  const armed = useStore((s) => s.armed?.kind === 'chip' && s.armed.sessionId === mark.sessionId)
  if (mark.kind === 'exam') {
    return (
      <button
        type="button"
        data-chip=""
        className={styles.exam}
        style={{ background: mark.fill }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (mark.workItemId) openWorkItem(mark.workItemId)
        }}
      >
        {mark.label}
      </button>
    )
  }
  return (
    <div
      data-chip=""
      className={armed ? `${styles.chip} ${styles.chipOn}` : styles.chip}
      style={{ borderColor: mark.outline ?? undefined }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (mark.sessionId) downChip(e, mark.sessionId)
      }}
    >
      {mark.label}
    </div>
  )
}
