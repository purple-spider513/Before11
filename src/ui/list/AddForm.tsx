import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { addDays } from '../../model/dates.ts'
import { workKindLabel } from '../../model/list.ts'
import { WORK_KINDS, type Course, type Importance, type WorkKind } from '../../model/types.ts'
import { closeAdd, focusReturnAdd, parseEstimate, submitAdd, trimTitle } from '../../store/actions.ts'
import { loadLastCourseId } from '../../store/device.ts'
import { useStore } from '../../store/store.ts'
import { CourseField, type CourseFieldHandle } from './CourseField.tsx'
import { DueField, DurationField, ImportanceField } from './WorkFields.tsx'
import styles from './AddForm.module.css'

export function AddForm() {
  const today = useStore((s) => s.today)
  const courses = useStore((s) => s.courses)
  const courseCount = Object.keys(courses).length
  const last = loadLastCourseId()
  const initial = last ? courses[last] : undefined
  const [kind, setKind] = useState<WorkKind>('homework')
  const [courseText, setCourseText] = useState(initial?.name ?? '')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => addDays(today, 1))
  const [estimate, setEstimate] = useState('')
  const [importance, setImportance] = useState<Importance | null>(null)
  const [hint, setHint] = useState<'course' | 'title' | 'date' | null>(null)
  const courseRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const handleRef = useRef<CourseFieldHandle>(null)

  useLayoutEffect(() => {
    const hasCourse = Object.keys(useStore.getState().courses).length > 0
    if (initial || !hasCourse) titleRef.current?.focus()
    else courseRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (formRef.current?.contains(target)) return
      if (document.getElementById('b11-courses-root')?.contains(target)) return
      closeAdd()
      focusReturnAdd()
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
    if (kind !== 'task') {
      const resolved = handleRef.current?.resolve()
      if (!resolved || resolved.kind === 'empty') {
        setHint('course')
        courseRef.current?.focus()
        return
      }
      course = resolved.course
    }
    if (!trimTitle(title)) {
      setHint('title')
      titleRef.current?.focus()
      return
    }
    if (kind !== 'task' && !date) {
      setHint('date')
      dateRef.current?.focus()
      return
    }
    submitAdd({
      kind,
      title,
      date: date || null,
      course,
      estimate: kind === 'exam' ? null : parseEstimate(estimate),
      importance,
    })
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
      {kind === 'task' ? null : (
        <CourseField
          value={courseText}
          onChange={(value) => {
            setCourseText(value)
            setHint(null)
          }}
          inputRef={courseRef}
          handleRef={handleRef}
          invalid={hint === 'course' && courseCount > 0}
        />
      )}
      {kind !== 'task' && hint === 'course' && courseCount > 0 ? (
        <p className={styles.hint}>Pick a course</p>
      ) : null}
      <DueField
        kind={kind}
        value={date}
        inputRef={dateRef}
        onChange={(value) => {
          setDate(value)
          setHint(null)
        }}
      />
      {hint === 'date' ? (
        <p className={styles.hint}>{kind === 'exam' ? 'Add a test date' : 'Add a due date'}</p>
      ) : null}
      {kind === 'exam' ? null : <DurationField value={estimate} onChange={setEstimate} />}
      <ImportanceField value={importance} onChange={setImportance} />
      <div className={styles.row}>
        <button className="btn btn-primary" type="submit">
          Add
        </button>
        <span className={styles.keys}>Enter to add · Esc to close</span>
      </div>
    </form>
  )
}
