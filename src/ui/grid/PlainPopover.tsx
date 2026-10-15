import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { swatch, plainSwatches } from '../../model/palette.ts'
import type { BlockColor, Session, WorkItem } from '../../model/types.ts'
import { commitPlainClose, deleteSession, patchPlain, setPlainLink } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { blockEls, segKey } from './gesture/liveLayout.ts'
import styles from './PlainPopover.module.css'

let requestClose: (() => void) | null = null

export function closePlainFromKeys(): boolean {
  if (!requestClose) return false
  requestClose()
  return true
}

export function PlainPopover({ sessionId, date, isNew }: { sessionId: string; date: string; isNew: boolean }) {
  const session = useStore((s) => s.sessions[sessionId])
  const workItems = useStore((s) => s.workItems)
  const courses = useStore((s) => s.courses)
  const before = useRef<Session | null | undefined>(undefined)
  if (before.current === undefined) before.current = isNew || !session ? null : { ...session }
  const [title, setTitle] = useState(isNew ? '' : session?.title ?? '')
  const [plainColor, setPlainColor] = useState<BlockColor>(session?.color ?? 'slate')
  const [plainRepeat, setPlainRepeat] = useState<Session['repeat']>(session?.repeat ?? 'none')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closed = useRef(false)
  const [pos, setPos] = useState({ left: 8, top: 52 })
  const closeRef = useRef<() => void>(() => {})

  function close() {
    if (closed.current) return
    closed.current = true
    commitPlainClose(sessionId, before.current ?? null)
    document.getElementById(`b11-b-${sessionId}-${date}`)?.focus()
  }
  closeRef.current = close

  useLayoutEffect(() => {
    const linkedId = useStore.getState().sessions[sessionId]?.workItemId
    if (linkedId) rootRef.current?.querySelector<HTMLButtonElement>(`[data-work="${linkedId}"]`)?.focus()
    else inputRef.current?.focus()
    requestClose = () => closeRef.current()
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      closeRef.current()
    }
    window.addEventListener('pointerdown', onDown)
    const pop = rootRef.current
    const block = blockEls.get(segKey(sessionId, date))
    if (pop) {
      const height = pop.offsetHeight
      const width = 272
      let left = 8
      let top = 52
      if (block) {
        const rect = block.getBoundingClientRect()
        left = rect.right + 8 + width <= window.innerWidth - 8 ? rect.right + 8 : rect.left - 8 - width
        top = rect.top
      }
      top = Math.min(Math.max(52, top), Math.max(52, window.innerHeight - 8 - height))
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - 8 - width))
      setPos({ left, top })
    }
    return () => {
      requestClose = null
      window.removeEventListener('pointerdown', onDown)
    }
  }, [sessionId, date])

  const choices = useMemo(() => {
    const linkedId = session?.workItemId
    const items = Object.values(workItems).filter((item) => item.completedAt == null || item.id === linkedId)
    items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      const course = (courses[a.courseId]?.name ?? '').localeCompare(courses[b.courseId]?.name ?? '', undefined, {
        sensitivity: 'base',
      })
      if (course !== 0) return course
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
    return items
  }, [workItems, courses, session?.workItemId])

  if (!session) return null
  const linkedItem = session.workItemId ? workItems[session.workItemId] : undefined
  const linkedCourse = linkedItem ? courses[linkedItem.courseId] : undefined
  const linked = session.workItemId != null && linkedItem != null
  const shownTitle =
    linked && linkedItem ? `${linkedCourse?.name ? `${linkedCourse.name} · ` : ''}${linkedItem.title}` : title
  const shownColor: BlockColor = linked && linkedCourse ? linkedCourse.color : (session.color ?? 'slate')
  const shownRepeat = linked ? 'none' : session.repeat
  const plain = { title, color: plainColor, repeat: plainRepeat }

  function pick(workItemId: string | null) {
    setPlainLink(sessionId, workItemId, plain)
  }

  return (
    <div
      ref={rootRef}
      className={styles.pop}
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-label="Block"
      data-plain-popover=""
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          close()
          return
        }
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
      }}
    >
      <fieldset className={styles.fields} disabled={session.workItemId != null}>
        <input
          ref={inputRef}
          className="field"
          placeholder="Busy"
          aria-label="Title"
          value={shownTitle}
          onChange={(e) => {
            setTitle(e.target.value)
            patchPlain(sessionId, { title: e.target.value })
          }}
        />
        <div>
          <div className={styles.label}>Color</div>
          <div className={styles.swatches} role="group" aria-label="Color">
            {plainSwatches().map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-label={entry.name}
                aria-pressed={shownColor === entry.key}
                className={shownColor === entry.key ? styles.on : styles.swatch}
                style={{ background: swatch(entry.key).fill }}
                onClick={() => {
                  setPlainColor(entry.key)
                  patchPlain(sessionId, { color: entry.key as BlockColor })
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className={styles.label}>Repeat</div>
          <div className="seg" role="group" aria-label="Repeat">
            <button
              type="button"
              aria-pressed={shownRepeat === 'none'}
              onClick={() => {
                setPlainRepeat('none')
                patchPlain(sessionId, { repeat: 'none' })
              }}
            >
              Once
            </button>
            <button
              type="button"
              aria-pressed={shownRepeat === 'daily'}
              onClick={() => {
                setPlainRepeat('daily')
                patchPlain(sessionId, { repeat: 'daily' })
              }}
            >
              Every day
            </button>
            <button
              type="button"
              aria-pressed={shownRepeat === 'weekdays'}
              onClick={() => {
                setPlainRepeat('weekdays')
                patchPlain(sessionId, { repeat: 'weekdays' })
              }}
            >
              Weekdays
            </button>
          </div>
        </div>
      </fieldset>
      <div>
        <div className={styles.label}>Assignment</div>
        <div className={styles.list} role="group" aria-label="Assignment">
          <button
            type="button"
            className={session.workItemId ? styles.choice : styles.choiceOn}
            aria-pressed={session.workItemId == null}
            onClick={() => pick(null)}
          >
            <i style={{ background: swatch('slate').fill }} />
            <span>None</span>
          </button>
          {choices.length === 0 ? <p className={styles.empty}>No assignments yet.</p> : null}
          {choices.map((item) => (
            <Choice
              key={item.id}
              item={item}
              courseName={courses[item.courseId]?.name ?? ''}
              fill={swatch(courses[item.courseId]?.color ?? 'slate').fill}
              pressed={session.workItemId === item.id}
              onPick={() => pick(item.id)}
            />
          ))}
        </div>
      </div>
      <div className={styles.row}>
        <button type="button" className="btn btn-text" onClick={() => deleteSession(sessionId)}>
          Delete block
        </button>
        <span className={styles.hint}>Enter or Esc to close</span>
      </div>
    </div>
  )
}

function Choice({
  item,
  courseName,
  fill,
  pressed,
  onPick,
}: {
  item: WorkItem
  courseName: string
  fill: string
  pressed: boolean
  onPick: () => void
}) {
  const label = courseName ? `${courseName} · ${item.title}` : item.title
  return (
    <button
      type="button"
      data-work={item.id}
      className={pressed ? styles.choiceOn : styles.choice}
      aria-pressed={pressed}
      onClick={onPick}
    >
      <i style={{ background: fill }} />
      <span>{label}</span>
    </button>
  )
}
