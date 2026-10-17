import { useLayoutEffect, useRef, useState } from 'react'
import { motionOn, placeToward } from '../motion.ts'
import { formatRange } from '../../model/minutes.ts'
import { swatch } from '../../model/palette.ts'
import { courseById } from '../../model/types.ts'
import { closePopover, selectSession, sessionLabel } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import styles from './OverflowPopover.module.css'

let anchorEl: HTMLElement | null = null

export function rememberAnchor(el: HTMLElement): void {
  anchorEl = el
}

export function OverflowPopover({ date, ids }: { date: string; ids: string[] }) {
  const sessions = useStore((s) => s.sessions)
  const rootRef = useRef<HTMLDivElement>(null)
  const [rise] = useState(() => motionOn())
  const [pos, setPos] = useState({ left: 8, top: 52 })

  useLayoutEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      closePopover()
    }
    window.addEventListener('pointerdown', onDown)
    const pop = rootRef.current
    if (pop) {
      const height = pop.offsetHeight
      const width = 240
      const rect = anchorEl?.getBoundingClientRect()
      let left = 8
      let top = 52
      if (rect) {
        left = rect.right + 8 + width <= window.innerWidth - 8 ? rect.right + 8 : rect.left - 8 - width
        top = rect.top
      }
      top = Math.min(Math.max(52, top), Math.max(52, window.innerHeight - 8 - height))
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - 8 - width))
      setPos({ left, top })
      placeToward(pop, rect ?? null, left, width)
    }
    return () => window.removeEventListener('pointerdown', onDown)
  }, [date, ids])

  return (
    <div
      ref={rootRef}
      className={rise ? `${styles.pop} ${styles.rise}` : styles.pop}
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-label="Also here"
      data-float-pop=""
    >
      {ids.map((id) => {
        const session = sessions[id]
        if (!session) return null
        const itemId = session.workItemId
        return <OverflowRow key={id} id={id} date={date} itemId={itemId} />
      })}
    </div>
  )
}

function OverflowRow({ id, date, itemId }: { id: string; date: string; itemId: string | null }) {
  const session = useStore((s) => s.sessions[id])
  const item = useStore((s) => (itemId ? s.workItems[itemId] : undefined))
  const course = useStore((s) => courseById(s.courses, item?.courseId))
  if (!session) return null
  const paint = swatch(course?.color ?? session.color ?? 'slate')
  const range = session.start != null && session.end != null ? formatRange(session.start, session.end) : ''
  return (
    <button
      type="button"
      className={styles.row}
      onClick={() => {
        selectSession(id, date)
        closePopover()
      }}
    >
      <i style={{ background: paint.fill }} />
      <span className={styles.label}>{sessionLabel(session)}</span>
      <span className={`${styles.time} nums`}>{range}</span>
    </button>
  )
}
