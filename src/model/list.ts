import { addDays, dayOf, monthShort, weekdayShort, yearOf } from './dates.ts'
import { courseById, type Course, type DateStr, type Session, type WorkItem, type WorkKind } from './types.ts'

export interface Groups {
  overdue: WorkItem[]
  tonight: WorkItem[]
  tomorrow: WorkItem[]
  later: WorkItem[]
  /** Unfinished items with no date. Rendered after every dated group. */
  undated: WorkItem[]
}

/** Dated items sort first. A missing date sorts after every real date. */
export function compareDueDate(a: DateStr | null, b: DateStr | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** Saved courses whose names contain the query, case-insensitive, sorted by name. */
export function matchingCourses(courses: readonly Course[], query: string): Course[] {
  const typed = query.trim().toLowerCase()
  return courses
    .filter((course) => course.name.toLowerCase().includes(typed))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

function courseName(courses: Readonly<Record<string, Course>>, id: string | null): string {
  return courseById(courses, id)?.name ?? ''
}

/** "Course · title" when there is a course, otherwise the title alone. */
export function withCourse(courseName: string | undefined, title: string): string {
  return courseName ? `${courseName} · ${title}` : title
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
    const date = compareDueDate(a.date, b.date)
    if (date !== 0) return date
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
  const undated: WorkItem[] = []
  const next = addDays(today, 1)
  for (const item of items) {
    if (item.completedAt !== null) continue
    if (item.date == null) {
      undated.push(item)
      continue
    }
    if (item.date < today) overdue.push(item)
    else if (item.date === today) tonight.push(item)
    else if (item.date === next) tomorrow.push(item)
    else later.push(item)
  }
  overdue.sort(byDateCourseTitle(courses))
  tonight.sort(byCourseTitle(courses))
  tomorrow.sort(byCourseTitle(courses))
  later.sort(byDateCourseTitle(courses))
  undated.sort(byCourseTitle(courses))
  return { overdue, tonight, tomorrow, later, undated }
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

export function workKindLabel(kind: WorkKind): string {
  switch (kind) {
    case 'homework':
      return 'Homework'
    case 'exam':
      return 'Exam'
    case 'task':
      return 'Task'
  }
}

/** Label above the date field. A task may leave it blank. */
export function dateFieldLabel(kind: WorkKind): string {
  switch (kind) {
    case 'exam':
      return 'Test date'
    case 'homework':
    case 'task':
      return 'Due'
  }
}

function kindPrefix(kind: WorkKind): string {
  switch (kind) {
    case 'exam':
      return 'Exam · '
    case 'task':
      return 'Task · '
    case 'homework':
      return ''
  }
}

/** Date text on a row. Exams and tasks carry a kind prefix. Overdue includes " · overdue". */
export function rowDateText(item: WorkItem, today: DateStr): string {
  const prefix = kindPrefix(item.kind)
  if (item.date == null) return `${prefix}No date`
  if (item.date < today) {
    return `${prefix}${weekdayShort(item.date)}, ${monthShort(item.date)} ${dayOf(item.date)} · overdue`
  }
  if (item.date === today) return `${prefix}Today`
  if (item.date === addDays(today, 1)) return `${prefix}Tomorrow`
  const base = `${weekdayShort(item.date)}, ${monthShort(item.date)} ${dayOf(item.date)}`
  if (yearOf(item.date) !== yearOf(today)) return `${prefix}${base}, ${yearOf(item.date)}`
  return `${prefix}${base}`
}
