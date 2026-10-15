import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { visibleDates } from '../../model/range.ts'
import { useStore } from '../../store/store.ts'
import { AllDayStrip } from './AllDayStrip.tsx'
import { DayColumn } from './DayColumn.tsx'
import { DayHeaderRow } from './DayHeaderRow.tsx'
import { TimeGutter } from './TimeGutter.tsx'
import { bindGrid, hoverGrid } from './gesture/controller.ts'
import styles from './TimeGrid.module.css'

export function TimeGrid() {
  const view = useStore((s) => s.view)
  const anchor = useStore((s) => s.anchor)
  const dates = useMemo(() => visibleDates(view === 'month' ? 'week' : view, anchor), [view, anchor])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const guideARef = useRef<HTMLDivElement>(null)
  const guideBRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [colW, setColW] = useState(0)
  const [pad, setPad] = useState(0)
  const datesRef = useRef(dates)
  datesRef.current = dates
  const colWRef = useRef(colW)
  colWRef.current = colW

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollTop = 448
  }, [])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const columns = columnsRef.current
    const drag = dragRef.current
    const guideA = guideARef.current
    const guideB = guideBRef.current
    const preview = previewRef.current
    if (!scroller || !columns || !drag || !guideA || !guideB || !preview) return
    const measure = () => {
      const width = columns.getBoundingClientRect().width
      const count = Math.max(1, datesRef.current.length)
      setColW(width / count)
      setPad(scroller.offsetWidth - scroller.clientWidth)
    }
    drag.hidden = true
    guideA.hidden = true
    guideB.hidden = true
    preview.hidden = true
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(columns)
    observer.observe(scroller)
    bindGrid({
      scroller,
      columns,
      drag,
      guideA,
      guideB,
      preview,
      getDates: () => datesRef.current,
      getColW: () => colWRef.current,
      view: view === 'month' ? 'week' : view,
    })
    return () => {
      observer.disconnect()
      bindGrid(null)
    }
  }, [view])

  const timeView = view === 'month' ? 'week' : view

  return (
    <div className={styles.grid}>
      <DayHeaderRow dates={dates} view={timeView} pad={pad} />
      <AllDayStrip dates={dates} pad={pad} />
      <div
        className={styles.scroller}
        ref={scrollerRef}
        onPointerMove={(e) => hoverGrid(e.clientX, e.clientY)}
      >
        <div className={styles.plane}>
          <div className={styles.gutter}>
            <TimeGutter />
            <div ref={guideARef} className={styles.guide} />
            <div ref={guideBRef} className={styles.guide} />
          </div>
          <div className={styles.columns} ref={columnsRef}>
            {dates.map((date) => (
              <DayColumn key={date} date={date} view={timeView} colW={colW} />
            ))}
            <div ref={dragRef} className={styles.drag} />
            <div ref={previewRef} className={styles.preview} />
          </div>
        </div>
      </div>
    </div>
  )
}
