import { useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { nextCourseColor } from '../../model/courseColor.ts'
import { matchingCourses } from '../../model/list.ts'
import { swatch } from '../../model/palette.ts'
import { addCourse, closeCourses, findCourseByName, trimName } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import styles from './CoursesMenu.module.css'

export function CoursesMenu() {
  const courses = useStore((s) => s.courses)
  const saved = useMemo(() => matchingCourses(Object.values(courses), ''), [courses])
  const next = swatch(nextCourseColor(saved))
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  useLayoutEffect(() => {
    nameRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (formRef.current?.contains(target)) return
      if (document.getElementById('b11-courses')?.contains(target)) return
      closeCourses()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeCourses()
      document.getElementById('b11-courses')?.focus()
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = trimName(name)
    if (!trimmed) {
      setHint('Add a name')
      nameRef.current?.focus()
      return
    }
    if (findCourseByName(trimmed)) {
      setHint('That course is already saved')
      nameRef.current?.focus()
      return
    }
    if (!addCourse(trimmed)) {
      setHint('Add a name')
      return
    }
    setName('')
    setHint(null)
    nameRef.current?.focus()
  }

  return (
    <form
      ref={formRef}
      id="b11-courses-menu"
      className={styles.menu}
      role="dialog"
      aria-label="Courses"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
    >
      <label className={styles.field}>
        Course
        <input
          ref={nameRef}
          className={hint ? 'field invalid' : 'field'}
          placeholder="Course name"
          aria-label="Course name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setHint(null)
          }}
        />
      </label>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <div className={styles.next}>
        <span className={styles.nextLabel}>Next color</span>
        <i aria-hidden="true" style={{ background: next.fill }} />
        <span>{next.name}</span>
      </div>
      <div className={styles.row}>
        <button className="btn btn-primary" type="submit">
          Add course
        </button>
      </div>
      {saved.length === 0 ? (
        <p className={styles.empty}>No courses yet.</p>
      ) : (
        <ul className={styles.saved} aria-label="Saved courses">
          {saved.map((course) => (
            <li key={course.id} className={styles.course}>
              <i aria-hidden="true" style={{ background: swatch(course.color).fill }} />
              <span>{course.name}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
