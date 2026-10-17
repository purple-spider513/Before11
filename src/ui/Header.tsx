import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { groupUnfinished } from '../model/list.ts'
import { headerLabel, stepWord } from '../model/range.ts'
import { closeCourses, goToday, setView, stepRange, toggleCourses, toggleList } from '../store/actions.ts'
import { useStore } from '../store/store.ts'
import { setMotion, useMotion } from './motion.ts'
import { hideTooltip, showTooltip } from './Tooltip.tsx'
import { StatusSlot } from './StatusSlot.tsx'
import { CoursesMenu } from './list/CoursesMenu.tsx'
import styles from './Header.module.css'
import type { View } from '../model/types.ts'

const VIEWS: { id: View; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: '3day', label: '3 days' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function Header() {
  const view = useStore((s) => s.view)
  const anchor = useStore((s) => s.anchor)
  const collapsed = useStore((s) => s.listCollapsed)
  const today = useStore((s) => s.today)
  const items = useStore((s) => s.workItems)
  const courses = useStore((s) => s.courses)
  const user = useStore((s) => s.user)
  const coursesOpen = useStore((s) => s.coursesOpen)
  const groups = groupUnfinished(Object.values(items), courses, today)
  const unfinished =
    groups.overdue.length +
    groups.tonight.length +
    groups.tomorrow.length +
    groups.later.length +
    groups.undated.length
  const overdue = groups.overdue.length
  const word = stepWord(view)
  const label = headerLabel(view, anchor)
  const motion = useMotion()
  const viewsRef = useRef<HTMLDivElement>(null)
  const viewButtons = useRef<Array<HTMLButtonElement | null>>([])
  const viewIndex = Math.max(0, VIEWS.findIndex((item) => item.id === view))
  const [thumb, setThumb] = useState({ x: 0, y: 0, w: 0, h: 0 })

  useLayoutEffect(() => {
    if (!motion.on) return
    const group = viewsRef.current
    const button = viewButtons.current[viewIndex]
    if (!group || !button) return
    const measure = () => {
      const next = { x: button.offsetLeft, y: button.offsetTop, w: button.offsetWidth, h: button.offsetHeight }
      setThumb((current) =>
        current.x === next.x && current.y === next.y && current.w === next.w && current.h === next.h ? current : next,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    return () => observer.disconnect()
  }, [motion.on, viewIndex])

  useEffect(() => {
    if (!user && coursesOpen) closeCourses()
  }, [user, coursesOpen])

  return (
    <header className={styles.header}>
      <button type="button" className="btn" aria-expanded={!collapsed} onClick={() => toggleList()}>
        {collapsed ? (
          <>
            Show list · <span className={overdue ? styles.overdue : undefined}>{unfinished}</span>
          </>
        ) : (
          'Hide list'
        )}
      </button>
      {user ? (
        <div id="b11-courses-root" className={styles.menuWrap}>
          <button
            id="b11-courses"
            type="button"
            className="btn"
            aria-expanded={coursesOpen}
            aria-haspopup="dialog"
            onClick={() => toggleCourses()}
          >
            Courses
          </button>
          {coursesOpen ? <CoursesMenu /> : null}
        </div>
      ) : null}
      <button type="button" className="btn" onClick={() => goToday()}>
        Today
      </button>
      <button
        type="button"
        className={styles.step}
        aria-label={`Previous ${word}`}
        onPointerEnter={(e) => showTooltip(e.currentTarget, `Previous ${word}`)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget, `Previous ${word}`)}
        onBlur={hideTooltip}
        onClick={() => stepRange(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.step}
        aria-label={`Next ${word}`}
        onPointerEnter={(e) => showTooltip(e.currentTarget, `Next ${word}`)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget, `Next ${word}`)}
        onBlur={hideTooltip}
        onClick={() => stepRange(1)}
      >
        ›
      </button>
      <div className={`${styles.range} nums`}>{label}</div>
      <div className={styles.spacer} />
      <StatusSlot />
      <div ref={viewsRef} className={`seg ${styles.views}`} role="group" aria-label="View">
        <span
          className={styles.thumb}
          aria-hidden="true"
          style={{ width: thumb.w, height: thumb.h, transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
        />
        {VIEWS.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              viewButtons.current[index] = el
            }}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.motion}>
        <span id="b11-motion-label">Motion</span>
        <div className="seg" role="group" aria-labelledby="b11-motion-label">
          <button type="button" aria-pressed={!motion.stored} disabled={motion.reduced} onClick={() => setMotion(false)}>
            Off
          </button>
          <button type="button" aria-pressed={motion.stored} disabled={motion.reduced} onClick={() => setMotion(true)}>
            On
          </button>
        </div>
      </div>
    </header>
  )
}
