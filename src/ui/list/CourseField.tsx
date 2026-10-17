import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { matchingCourses } from '../../model/list.ts'
import { swatch } from '../../model/palette.ts'
import type { Course } from '../../model/types.ts'
import { findCourseByName, trimName } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { motionOn, useMotion } from '../motion.ts'
import styles from './CourseField.module.css'

export type CourseResolve = { kind: 'course'; course: Course } | { kind: 'empty' }

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
  const list = useMemo(() => Object.values(courses), [courses])
  const matches = useMemo(() => matchingCourses(list, value), [list, value])
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [hi, setHi] = useState(0)
  const entered = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const motion = useMotion()

  useLayoutEffect(() => {
    if (motion.on || !leaving) return
    setOpen(false)
    setLeaving(false)
  }, [motion.on, leaving])

  useImperativeHandle(handleRef, () => ({
    focus() {
      if (typeof inputRef === 'object' && inputRef && 'current' in inputRef) inputRef.current?.focus()
    },
    resolve(): CourseResolve {
      if (matches.length === 0) return { kind: 'empty' }
      if (open && matches[hi]) return { kind: 'course', course: matches[hi] }
      const exact = findCourseByName(value)
      if (exact) return { kind: 'course', course: exact }
      if (matches.length === 1 && trimName(value)) return { kind: 'course', course: matches[0] }
      return { kind: 'empty' }
    },
  }))

  function show() {
    window.clearTimeout(closeTimer.current)
    if (!open || leaving) entered.current = motionOn()
    setLeaving(false)
    setOpen(true)
    setHi(0)
  }

  function hide() {
    if (!open) return
    if (!motionOn()) {
      setOpen(false)
      setLeaving(false)
      return
    }
    setLeaving(true)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || leaving || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((n) => (n + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((n) => (n - 1 + matches.length) % matches.length)
    }
  }

  if (list.length === 0) {
    return <p className={styles.none}>Add a course in the Courses menu.</p>
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={invalid ? 'field invalid' : 'field'}
        placeholder="Course"
        aria-label="Course"
        role="combobox"
        aria-expanded={open && !leaving && matches.length > 0}
        aria-autocomplete="list"
        value={value}
        onFocus={show}
        onBlur={() => {
          closeTimer.current = window.setTimeout(hide, 0)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          show()
        }}
        onKeyDown={onKey}
      />
      {open && matches.length > 0 ? (
        <div
          className={leaving ? `${styles.menu} ${styles.leave}` : entered.current ? `${styles.menu} ${styles.rise}` : styles.menu}
          role="listbox"
          aria-label="Courses"
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget || !leaving) return
            setOpen(false)
            setLeaving(false)
          }}
        >
          {matches.map((course, index) => (
            <button
              key={course.id}
              type="button"
              role="option"
              aria-selected={index === hi}
              className={index === hi ? styles.on : styles.row}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(course.name)
                setHi(index)
                hide()
              }}
            >
              <i style={{ background: swatch(course.color).fill }} />
              {course.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
