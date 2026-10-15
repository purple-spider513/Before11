import { monthTimedLabel } from './labels.ts'
import { segmentsForDate } from '../../model/instances.ts'
import { swatch } from '../../model/palette.ts'
import type { Course, DateStr, Session, WorkItem } from '../../model/types.ts'

export interface Mark {
  id: string
  kind: 'exam' | 'chip'
  label: string
  tip: string
  fill: string
  outline: string | null
  workItemId: string | null
  sessionId: string | null
}

function byName(a: { course: string; title: string }, b: { course: string; title: string }): number {
  const name = a.course.localeCompare(b.course, undefined, { sensitivity: 'base' })
  if (name !== 0) return name
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

export function dayMarks(
  date: DateStr,
  workItems: Record<string, WorkItem>,
  sessions: Record<string, Session>,
  courses: Record<string, Course>,
): Mark[] {
  const exams = Object.values(workItems)
    .filter((item) => item.kind === 'exam' && item.date === date)
    .map((item) => {
      const course = courses[item.courseId]
      const courseName = course?.name ?? ''
      const paint = swatch(course?.color ?? 'violet')
      return {
        id: `exam-${item.id}`,
        kind: 'exam' as const,
        label: `Exam · ${courseName} · ${item.title}`,
        tip: `Exam · ${courseName} · ${item.title}`,
        fill: paint.fill,
        outline: null,
        workItemId: item.id,
        sessionId: null,
        course: courseName,
        title: item.title,
      }
    })
    .sort(byName)
  const chips = Object.values(sessions)
    .filter((session) => session.workItemId && session.start == null && session.date === date)
    .map((session) => {
      const item = session.workItemId ? workItems[session.workItemId] : undefined
      const course = item ? courses[item.courseId] : undefined
      const courseName = course?.name ?? ''
      const title = item?.title ?? ''
      const paint = swatch(course?.color ?? 'violet')
      return {
        id: session.id,
        kind: 'chip' as const,
        label: `${courseName} · ${title}`,
        tip: `${courseName} · ${title}`,
        fill: paint.fill,
        outline: paint.text,
        workItemId: item?.id ?? null,
        sessionId: session.id,
        course: courseName,
        title,
      }
    })
    .sort(byName)
  return [...exams, ...chips].map(({ course: _course, title: _title, ...mark }) => mark)
}

export interface MonthChip {
  id: string
  kind: 'exam' | 'chip' | 'timed'
  label: string
  tip: string
  fill: string
  outline: string | null
  workItemId: string | null
  sessionId: string | null
}

export function monthChips(
  date: DateStr,
  workItems: Record<string, WorkItem>,
  sessions: Record<string, Session>,
  courses: Record<string, Course>,
): MonthChip[] {
  const marks: MonthChip[] = dayMarks(date, workItems, sessions, courses).map((mark) => ({
    ...mark,
    kind: mark.kind,
    label: mark.kind === 'exam' ? examShort(mark.label) : mark.label,
  }))
  const segments = segmentsForDate(date, sessions)
  const timed = segments
    .map((seg) => {
      const session = sessions[seg.sessionId]
      if (!session) return null
      if (!session.workItemId && session.repeat !== 'none') return null
      const item = session.workItemId ? workItems[session.workItemId] : undefined
      const course = item ? courses[item.courseId] : undefined
      const title = item?.title ?? session.title ?? 'Busy'
      const paint = swatch(course?.color ?? session.color ?? 'slate')
      const courseName = course?.name ?? null
      const label = monthTimedLabel({
        start: session.start,
        end: seg.isContinuation ? seg.bottom : (session.end ?? seg.bottom),
        continuation: seg.isContinuation,
        course: courseName,
        title,
      })
      const tip = courseName ? `${courseName} · ${title}` : title
      return {
        id: `${session.id}@${date}`,
        kind: 'timed' as const,
        label,
        tip,
        fill: paint.fill,
        outline: null,
        workItemId: item?.id ?? null,
        sessionId: session.id,
        top: seg.top,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.top - b.top || (a.sessionId < b.sessionId ? -1 : 1))
    .map(({ top: _top, ...row }) => row)
  return [...marks, ...timed]
}

function examShort(label: string): string {
  const parts = label.split(' · ')
  if (parts.length < 2) return label
  return `Exam · ${parts[1]}`
}
