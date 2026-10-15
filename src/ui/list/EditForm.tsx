import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { courseSwatches, swatch } from '../../model/palette.ts'
import type { Course, PaletteKey } from '../../model/types.ts'
import {
  closeEditor,
  deleteWorkItem,
  disarm,
  findCourseByName,
  parseEstimate,
  saveEdit,
  trimTitle,
} from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { CourseField, type CourseFieldHandle } from './CourseField.tsx'
import styles from './EditForm.module.css'

export function EditForm({ id }: { id: string }) {
  const item = useStore((s) => s.workItems[id])
  const course = useStore((s) => (item ? s.courses[item.courseId] : undefined))
  const formRef = useRef<HTMLFormElement>(null)
  const courseRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<CourseFieldHandle>(null)
  const [kind, setKind] = useState(item?.kind ?? 'homework')
  const [courseText, setCourseText] = useState(course?.name ?? '')
  const [title, setTitle] = useState(item?.title ?? '')
  const [date, setDate] = useState(item?.date ?? '')
  const [estimate, setEstimate] = useState(item?.estimateMinutes == null ? '' : String(item.estimateMinutes))
  const [color, setColor] = useState<PaletteKey>(course?.color ?? 'violet')
  const [hint, setHint] = useState<'course' | 'title' | null>(null)

  useLayoutEffect(() => {
    formRef.current?.scrollIntoView({ block: 'nearest' })
    const onDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) close()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  if (!item) return null

  function close() {
    closeEditor()
    disarm()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const resolved = handleRef.current?.resolve()
    let picked: Course | null = null
    let createName: string | null = null
    if (!resolved || resolved.kind === 'empty') {
      setHint('course')
      courseRef.current?.focus()
      return
    }
    if (resolved.kind === 'course') picked = resolved.course
    else {
      picked = findCourseByName(resolved.name)
      createName = picked ? null : resolved.name
    }
    if (!trimTitle(title)) {
      setHint('title')
      return
    }
    const ok = saveEdit({
      id,
      kind,
      title,
      date,
      course: picked,
      createName,
      color,
      estimate: parseEstimate(estimate),
    })
    if (!ok) setHint('course')
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} onKeyDown={onKeyDown}>
      <div className="seg" role="group" aria-label="Kind">
        <button type="button" aria-pressed={kind === 'homework'} onClick={() => setKind('homework')}>
          Homework
        </button>
        <button type="button" aria-pressed={kind === 'exam'} onClick={() => setKind('exam')}>
          Exam
        </button>
      </div>
      <CourseField
        value={courseText}
        onChange={(value) => {
          setCourseText(value)
          const found = findCourseByName(value)
          if (found) setColor(found.color)
          setHint(null)
        }}
        inputRef={courseRef}
        handleRef={handleRef}
        invalid={hint === 'course'}
      />
      {hint === 'course' ? <p className={styles.hint}>Pick or type a course</p> : null}
      <input
        className={hint === 'title' ? 'field invalid' : 'field'}
        aria-label="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setHint(null)
        }}
      />
      {hint === 'title' ? <p className={styles.hint}>Add a title</p> : null}
      <label className={styles.dateLabel}>
        {kind === 'exam' ? 'Test date' : 'Due'}
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className={styles.estimate}>
        Estimate
        <span>
          <input
            className="field"
            type="number"
            min={5}
            max={1440}
            step={5}
            placeholder="min"
            aria-label="Estimate"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
          <span className={styles.min}>minutes</span>
        </span>
      </label>
      <div className={styles.colors} role="group" aria-label="Course color">
        {courseSwatches().map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-label={entry.name}
            aria-pressed={color === entry.key}
            className={color === entry.key ? styles.swatchOn : styles.swatch}
            style={{ background: swatch(entry.key).fill }}
            onClick={() => {
              if (entry.key !== 'slate') setColor(entry.key)
            }}
          />
        ))}
      </div>
      <div className={styles.row}>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
        <button
          type="button"
          className="btn btn-text"
          onClick={() => deleteWorkItem(id)}
        >
          Delete
        </button>
      </div>
    </form>
  )
}
