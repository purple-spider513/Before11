import { addDays, dayOf, monthShort, weekdayShort, yearOf } from './dates.ts'
import type { Course, DateStr, Session, WorkItem } from './types.ts'

export interface Groups {
  overdue: WorkItem[]
  tonight: WorkItem[]
  tomorrow: WorkItem[]
  later: WorkItem[]
}

function courseName(courses: Readonly<Record<string, Course>>, id: string): string {
  return courses[id]?.name ?? ''
}

function byCourseTitle(
  courses: Readonly<Record<string, Course>>,
): (a: WorkItem, b: WorkItem) => number {
  return (a, b) => {
    const name = courseName(courses, a.courseId).localeCompare(courseName(courses, b.courseId), undefined, {
      sensitivity: 'base',
    })
    if (name !== 0) return name
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  }
}

function byDateCourseTitle(
  courses: Readonly<Record<string, Course>>,
): (a: WorkItem, b: WorkItem) => number {
  return (a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return byCourseTitle(courses)(a, b)
  }
}

export function groupUnfinished(
  items: readonly WorkItem[],
  courses: Readonly<Record<string, Course>>,
  today: DateStr,
): Groups {
  const overdue: WorkItem[] = []
  const tonight: WorkItem[] = []
  const tomorrow: WorkItem[] = []
  const later: WorkItem[] = []
  const next = addDays(today, 1)
  for (const item of items) {
    if (item.completedAt !== null) continue
    if (item.date < today) overdue.push(item)
    else if (item.date === today) tonight.push(item)
    else if (item.date === next) tomorrow.push(item)
    else later.push(item)
  }
  overdue.sort(byDateCourseTitle(courses))
  tonight.sort(byCourseTitle(courses))
  tomorrow.sort(byCourseTitle(courses))
  later.sort(byDateCourseTitle(courses))
  return { overdue, tonight, tomorrow, later }
}

export function sessionCounts(session: Session, today: DateStr, now: number): boolean {
  if (session.start == null || session.end == null) return session.date >= today
  if (session.date > today) return true
  if (session.date === today && session.end > now) return true
  const yesterday = addDays(today, -1)
  if (session.date === yesterday && session.end > 1440 && session.end - 1440 > now) return true
  return false
}

export function noTime(
  item: WorkItem,
  sessions: readonly Session[],
  today: DateStr,
  now: number,
): boolean {
  for (const session of sessions) {
    if (session.workItemId === item.id && sessionCounts(session, today, now)) return false
  }
  return true
}

export function plannedMinutes(
  item: WorkItem,
  sessions: readonly Session[],
  today: DateStr,
  now: number,
): number {
  let total = 0
  for (const session of sessions) {
    if (session.workItemId !== item.id) continue
    if (session.start == null || session.end == null) continue
    if (!sessionCounts(session, today, now)) continue
    total += session.end - session.start
  }
  return total
}

export function tomorrowCount(items: readonly WorkItem[], today: DateStr): number {
  const next = addDays(today, 1)
  let n = 0
  for (const item of items) {
    if (item.completedAt === null && item.date === next) n += 1
  }
  return n
}

/** Date text on a row, including the exam prefix. Overdue includes " · overdue". */
export function rowDateText(item: WorkItem, today: DateStr): string {
  const prefix = item.kind === 'exam' ? 'Exam · ' : ''
  if (item.date < today) {
    return `${prefix}${weekdayShort(item.date)}, ${monthShort(item.date)} ${dayOf(item.date)} · overdue`
  }
  if (item.date === today) return `${prefix}Today`
  if (item.date === addDays(today, 1)) return `${prefix}Tomorrow`
  const base = `${weekdayShort(item.date)}, ${monthShort(item.date)} ${dayOf(item.date)}`
  if (yearOf(item.date) !== yearOf(today)) return `${prefix}${base}, ${yearOf(item.date)}`
  return `${prefix}${base}`
}
