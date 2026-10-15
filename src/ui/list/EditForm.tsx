import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { workKindLabel } from '../../model/list.ts'
import { courseSwatches, swatch } from '../../model/palette.ts'
import { courseById, WORK_KINDS, type Course, type Importance, type PaletteKey, type WorkKind } from '../../model/types.ts'
import {
  closeEditor,
  deleteWorkItem,
  disarm,
  findCourseByName,
  parseEstimate,
  saveEdit,
  trimName,
  trimTitle,
} from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { CourseField, type CourseFieldHandle } from './CourseField.tsx'
import { DueField, DurationField, ImportanceField } from './WorkFields.tsx'
import styles from './EditForm.module.css'

export function EditForm({ id }: { id: string }) {
  const item = useStore((s) => s.workItems[id])
  const course = useStore((s) => courseById(s.courses, item?.courseId))
  const courseCount = useStore((s) => Object.keys(s.courses).length)
  const formRef = useRef<HTMLFormElement>(null)
  const courseRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<CourseFieldHandle>(null)
  const [kind, setKind] = useState<WorkKind>(item?.kind ?? 'homework')
  const [courseText, setCourseText] = useState(course?.name ?? '')
  const [title, setTitle] = useState(item?.title ?? '')
  const [date, setDate] = useState(item?.date ?? '')
  const [estimate, setEstimate] = useState(item?.estimateMinutes == null ? '' : String(item.estimateMinutes))
  const [importance, setImportance] = useState<Importance | null>(
    item?.importance === 'low' || item?.importance === 'high' ? item.importance : null,
  )
  const [color, setColor] = useState<PaletteKey>(course?.color ?? 'violet')
  const [hint, setHint] = useState<'course' | 'title' | 'date' | null>(null)

  useLayoutEffect(() => {
    formRef.current?.scrollIntoView({ block: 'nearest' })
    const onDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (formRef.current?.contains(target)) return
      if (document.getElementById('b11-courses-root')?.contains(target)) return
      close()
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

  function pickKind(next: WorkKind) {
    setKind(next)
    if (next === 'task') setHint((current) => (current === 'course' ? null : current))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    let picked: Course | null = null
    if (kind !== 'task') {
      const resolved = handleRef.current?.resolve()
      if (!resolved || resolved.kind === 'empty') {
        setHint('course')
        courseRef.current?.focus()
        return
      }
      picked = resolved.course
    }
    const exactCourse =
      picked != null &&
      picked.name.localeCompare(trimName(courseText), undefined, { sensitivity: 'base' }) === 0
    if (!trimTitle(title)) {
      setHint('title')
      return
    }
    if (kind !== 'task' && !date) {
      setHint('date')
      dateRef.current?.focus()
      return
    }
    const ok = saveEdit({
      id,
      kind,
      title,
      date: date || null,
      course: picked,
      color: picked && !exactCourse ? picked.color : color,
      estimate:
        kind === 'exam' ? (item.kind === 'exam' ? item.estimateMinutes : null) : parseEstimate(estimate),
      importance,
    })
    if (!ok) setHint(kind === 'task' ? 'title' : 'course')
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} onKeyDown={onKeyDown}>
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
            const found = findCourseByName(value)
            if (found) setColor(found.color)
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
      {kind === 'task' || courseCount === 0 ? null : (
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
      )}
      <div className={styles.row}>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
        <button type="button" className="btn btn-text" onClick={() => deleteWorkItem(id)}>
          Delete
        </button>
      </div>
    </form>
  )
}
