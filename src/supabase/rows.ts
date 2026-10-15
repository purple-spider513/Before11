import { WORK_KINDS, type BlockColor, type Course, type PaletteKey, type Profile, type Session, type WorkItem, type WorkKind } from '../model/types.ts'

export type Table = 'courses' | 'work_items' | 'sessions' | 'profiles'

export function courseToDb(course: Course, userId: string): Record<string, unknown> {
  return {
    id: course.id,
    user_id: userId,
    name: course.name,
    color: course.color,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
    updated_by: course.updatedBy,
  }
}

export function courseFromDb(row: Record<string, unknown>): Course {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color) as PaletteKey,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    updatedBy: String(row.updated_by),
  }
}

export function workItemToDb(item: WorkItem, userId: string): Record<string, unknown> {
  return {
    id: item.id,
    user_id: userId,
    course_id: item.kind === 'task' ? null : item.courseId,
    kind: item.kind,
    title: item.title,
    date: item.date,
    completed_at: item.completedAt,
    estimate_minutes: item.estimateMinutes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    updated_by: item.updatedBy,
  }
}

function workKindFromDb(value: unknown): WorkKind {
  return WORK_KINDS.includes(value as WorkKind) ? (value as WorkKind) : 'homework'
}

export function workItemFromDb(row: Record<string, unknown>): WorkItem {
  const kind = workKindFromDb(row.kind)
  const courseId = row.course_id == null || row.course_id === '' ? null : String(row.course_id)
  return {
    id: String(row.id),
    courseId: kind === 'task' ? null : courseId,
    kind,
    title: String(row.title),
    date: String(row.date),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    estimateMinutes: row.estimate_minutes == null ? null : Number(row.estimate_minutes),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    updatedBy: String(row.updated_by),
  }
}

export function sessionToDb(session: Session, userId: string): Record<string, unknown> {
  return {
    id: session.id,
    user_id: userId,
    date: session.date,
    start_min: session.start,
    end_min: session.end,
    work_item_id: session.workItemId,
    title: session.title,
    color: session.color,
    repeat: session.repeat,
    tz: session.tz,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    updated_by: session.updatedBy,
  }
}

export function sessionFromDb(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    date: String(row.date),
    start: row.start_min == null ? null : Number(row.start_min),
    end: row.end_min == null ? null : Number(row.end_min),
    workItemId: row.work_item_id == null ? null : String(row.work_item_id),
    title: row.title == null ? null : String(row.title),
    color: row.color == null ? null : (String(row.color) as BlockColor),
    repeat: row.repeat === 'daily' || row.repeat === 'weekdays' ? row.repeat : 'none',
    tz: String(row.tz),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    updatedBy: String(row.updated_by),
  }
}

export function profileToDb(profile: Profile, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    tz: profile.tz,
    created_at: profile.createdAt,
  }
}

export function profileFromDb(row: Record<string, unknown>): Profile {
  return {
    tz: String(row.tz),
    createdAt: Number(row.created_at),
  }
}
