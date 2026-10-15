import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { addDays } from '../../model/dates.ts'
import { dateFieldLabel, workKindLabel } from '../../model/list.ts'
import { WORK_KINDS, type Course, type WorkKind } from '../../model/types.ts'
import { closeAdd, findCourseByName, focusReturnAdd, submitAdd, trimTitle } from '../../store/actions.ts'
import { loadLastCourseId } from '../../store/device.ts'
import { useStore } from '../../store/store.ts'
import { CourseField, type CourseFieldHandle } from './CourseField.tsx'
import styles from './AddForm.module.css'

export function AddForm() {
  const today = useStore((s) => s.today)
  const courses = useStore((s) => s.courses)
  const last = loadLastCourseId()
  const initial = last ? courses[last] : undefined
  const [kind, setKind] = useState<WorkKind>('homework')
  const [courseText, setCourseText] = useState(initial?.name ?? '')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => addDays(today, 1))
  const [hint, setHint] = useState<'course' | 'title' | null>(null)
  const courseRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const handleRef = useRef<CourseFieldHandle>(null)

  useLayoutEffect(() => {
    if (initial) titleRef.current?.focus()
    else courseRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) {
        closeAdd()
        focusReturnAdd()
      }
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [initial])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeAdd()
      focusReturnAdd()
      return
    }
    if (e.key !== 'Tab' || !formRef.current) return
    const nodes = [...formRef.current.querySelectorAll<HTMLElement>('button, input')].filter(
      (node) => node.tabIndex !== -1,
    )
    if (nodes.length === 0) return
    const first = nodes[0]
    const lastNode = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      lastNode.focus()
    } else if (!e.shiftKey && document.activeElement === lastNode) {
      e.preventDefault()
      first.focus()
    }
  }

  function pickKind(next: WorkKind) {
    setKind(next)
    if (next === 'task') {
      setHint((current) => (current === 'course' ? null : current))
      titleRef.current?.focus()
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    let course: Course | null = null
    let createName: string | null = null
    if (kind !== 'task') {
      const resolved = handleRef.current?.resolve()
      if (!resolved || resolved.kind === 'empty') {
        setHint('course')
        courseRef.current?.focus()
        return
      }
      if (resolved.kind === 'course') course = resolved.course
      else {
        course = findCourseByName(resolved.name)
        createName = course ? null : resolved.name
      }
    }
    if (!trimTitle(title)) {
      setHint('title')
      titleRef.current?.focus()
      return
    }
    submitAdd({ kind, title, date, course, createName })
    focusReturnAdd()
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      role="dialog"
      aria-label="Add homework, exam, or task"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
    >
      <div className="seg kinds" role="group" aria-label="Kind">
        {WORK_KINDS.map((id) => (
          <button key={id} type="button" aria-pressed={kind === id} onClick={() => pickKind(id)}>
            {workKindLabel(id)}
          </button>
        ))}
      </div>
      {kind === 'task' ? null : (
        <CourseField
          value={courseText}
          onChange={(value) => {
            setCourseText(value)
            setHint(null)
          }}
          inputRef={courseRef}
          handleRef={handleRef}
          invalid={hint === 'course'}
        />
      )}
      {kind !== 'task' && hint === 'course' ? <p className={styles.hint}>Pick or type a course</p> : null}
      <input
        ref={titleRef}
        className={hint === 'title' ? 'field invalid' : 'field'}
        placeholder="What's due"
        aria-label="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setHint(null)
        }}
      />
      {hint === 'title' ? <p className={styles.hint}>Add a title</p> : null}
      <label className={styles.dateLabel}>
        {dateFieldLabel(kind)}
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className={styles.row}>
        <button className="btn btn-primary" type="submit">
          Add
        </button>
        <span className={styles.keys}>Enter to add · Esc to close</span>
      </div>
    </form>
  )
}
