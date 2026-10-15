import { useImperativeHandle, useMemo, useState, type KeyboardEvent, type Ref } from 'react'
import { swatch } from '../../model/palette.ts'
import type { Course } from '../../model/types.ts'
import { findCourseByName, trimName } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import styles from './CourseField.module.css'

export type CourseResolve =
  | { kind: 'course'; course: Course }
  | { kind: 'create'; name: string }
  | { kind: 'empty' }

export interface CourseFieldHandle {
  resolve: () => CourseResolve
  focus: () => void
}

export function CourseField({
  value,
  onChange,
  inputRef,
  invalid,
  handleRef,
}: {
  value: string
  onChange: (value: string) => void
  inputRef: Ref<HTMLInputElement>
  invalid?: boolean
  handleRef: Ref<CourseFieldHandle>
}) {
  const courses = useStore((s) => s.courses)
  const list = useMemo(
    () => Object.values(courses).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [courses],
  )
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const typed = trimName(value)
  const matches = list.filter((course) => course.name.toLowerCase().includes(typed.toLowerCase())).slice(0, 6)
  const exact = typed
    ? list.find((course) => course.name.localeCompare(typed, undefined, { sensitivity: 'base' }) === 0)
    : undefined
  const showCreate = typed.length > 0 && !exact
  const rows = matches.length + (showCreate ? 1 : 0)

  useImperativeHandle(handleRef, () => ({
    focus() {
      if (typeof inputRef === 'object' && inputRef && 'current' in inputRef) inputRef.current?.focus()
    },
    resolve(): CourseResolve {
      if (open && rows > 0) {
        if (showCreate && hi === matches.length) return { kind: 'create', name: typed }
        const picked = matches[hi]
        if (picked) return { kind: 'course', course: picked }
      }
      const found = findCourseByName(value)
      if (found) return { kind: 'course', course: found }
      if (typed) return { kind: 'create', name: typed }
      return { kind: 'empty' }
    },
  }))

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || rows === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((n) => (n + 1) % rows)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((n) => (n - 1 + rows) % rows)
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={invalid ? 'field invalid' : 'field'}
        placeholder="Course"
        aria-label="Course"
        value={value}
        onFocus={() => {
          setOpen(true)
          setHi(showCreate ? matches.length : 0)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 0)
        }}
        onChange={(e) => {
          const next = e.target.value
          onChange(next)
          const name = trimName(next)
          const nextMatches = list
            .filter((course) => course.name.toLowerCase().includes(name.toLowerCase()))
            .slice(0, 6)
          const nextExact = name
            ? list.some((course) => course.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0)
            : false
          setOpen(true)
          setHi(!nextExact && name ? nextMatches.length : 0)
        }}
        onKeyDown={onKey}
      />
      {open && list.length > 0 ? (
        <div className={styles.menu}>
          {matches.map((course, index) => (
            <button
              key={course.id}
              type="button"
              className={index === hi ? styles.on : styles.row}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(course.name)
                setHi(index)
                setOpen(false)
              }}
            >
              <i style={{ background: swatch(course.color).fill }} />
              {course.name}
            </button>
          ))}
          {showCreate ? (
            <button
              type="button"
              className={hi === matches.length ? styles.on : styles.row}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Create "{typed}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
