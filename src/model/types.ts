export type DateStr = string
export const WORK_KINDS = ['homework', 'exam', 'task'] as const
export type WorkKind = (typeof WORK_KINDS)[number]
/** Set only when the person marks the work. Unset stays null. */
export type Importance = 'low' | 'high'
export type PaletteKey =
  | 'violet'
  | 'blue'
  | 'teal'
  | 'green'
  | 'gold'
  | 'orange'
  | 'indigo'
  | 'pink'
export type BlockColor = PaletteKey | 'slate'
export type View = 'day' | '3day' | 'week' | 'month'

export interface Meta {
  createdAt: number
  updatedAt: number
  updatedBy: string
}

export interface Course extends Meta {
  id: string
  name: string
  color: PaletteKey
}

export interface WorkItem extends Meta {
  id: string
  /** Null only for a task. Homework and exams always have a course. */
  courseId: string | null
  kind: WorkKind
  title: string
  /** Calendar date (`YYYY-MM-DD`), or null when a task has no due date. Homework and exams always have one. */
  date: DateStr | null
  completedAt: DateStr | null
  estimateMinutes: number | null
  importance: Importance | null
}

export function courseById(
  courses: Readonly<Record<string, Course>>,
  id: string | null | undefined,
): Course | undefined {
  return id ? courses[id] : undefined
}

export interface Session extends Meta {
  id: string
  date: DateStr
  start: number | null
  end: number | null
  workItemId: string | null
  title: string | null
  color: BlockColor | null
  repeat: 'none' | 'daily' | 'weekdays'
  tz: string
}

export interface Profile {
  tz: string
  createdAt: number
}
