import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { monthOf, weekdayShort } from '../../model/dates.ts'
import { visibleDates } from '../../model/range.ts'
import { closeMonth } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { gestureActive } from '../grid/gesture/controller.ts'
import { MonthCell } from './MonthCell.tsx'
import { MonthOverlay } from './MonthOverlay.tsx'
import { monthMove, setMonthGeom, type MonthGeom } from './rest.ts'
import styles from './MonthView.module.css'

const HEADS = [0, 1, 2, 3, 4, 5, 6]

export function MonthView() {
  const anchor = useStore((s) => s.anchor)
  const open = useStore((s) => s.monthOverlayDate)
  const dates = useMemo(() => visibleDates('month', anchor), [anchor])
  const gridRef = useRef<HTMLDivElement>(null)
  const [geom, setGeom] = useState<MonthGeom | null>(null)
  const month = monthOf(anchor)

  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const next = {
        left: rect.left,
        top: rect.top,
        cellW: rect.width / 7,
        cellH: rect.height / 6,
        dates,
      }
      setGeom(next)
      setMonthGeom(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      setMonthGeom(null)
    }
  }, [dates])

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (gestureActive()) return
      if (!useStore.getState().monthOverlayDate) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (document.getElementById('b11-overlay')?.contains(target)) return
      closeMonth()
    }
    window.addEventListener('pointerdown', down)
    return () => window.removeEventListener('pointerdown', down)
  }, [])

  useEffect(() => {
    return () => closeMonth()
  }, [])

  return (
    <div className={styles.month}>
      <div className={styles.heads}>
        {HEADS.map((index) => (
          <div key={index}>{weekdayShort(dates[index] ?? dates[0])}</div>
        ))}
      </div>
      <div
        className={styles.grid}
        ref={gridRef}
        onPointerMove={(e) => {
          if (gestureActive()) return
          monthMove(e.clientX, e.clientY, false)
        }}
      >
        {dates.map((date) => (
          <MonthCell key={date} date={date} cellH={geom?.cellH ?? 0} inMonth={monthOf(date) === month} />
        ))}
      </div>
      {open ? <MonthOverlay date={open} geom={geom} /> : null}
    </div>
  )
}
