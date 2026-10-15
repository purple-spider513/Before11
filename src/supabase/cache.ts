import type { Course, Profile, Session, WorkItem } from '../model/types.ts'
import { courseFromDb, profileFromDb, sessionFromDb, workItemFromDb, type Table } from './rows.ts'

const PREFIX = 'b11.row.'

export interface CacheSnapshot {
  courses: Record<string, Course>
  workItems: Record<string, WorkItem>
  sessions: Record<string, Session>
  profile: Profile | null
}

function storage(): Storage {
  return window.localStorage
}

export function cacheKey(table: Table, id: string): string {
  return `${PREFIX}${table}.${id}`
}

export function isCacheFilled(): boolean {
  try {
    return storage().getItem('b11.cacheFilled') === '1'
  } catch {
    return false
  }
}

export function markCacheFilled(): void {
  try {
    storage().setItem('b11.cacheFilled', '1')
  } catch {
    // The sync banner covers a broken cache. The in-memory store still works.
  }
}

export function putModel(table: Table, id: string, model: unknown): void {
  try {
    storage().setItem(cacheKey(table, id), JSON.stringify(model))
  } catch {
    // same as above
  }
}

export function removeModels(table: Table, ids: readonly string[]): void {
  try {
    const ls = storage()
    for (const id of ids) ls.removeItem(cacheKey(table, id))
  } catch {
    // same as above
  }
}

export function loadAll(): CacheSnapshot {
  const snapshot: CacheSnapshot = { courses: {}, workItems: {}, sessions: {}, profile: null }
  let ls: Storage
  try {
    ls = storage()
  } catch {
    return snapshot
  }
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i)
    if (!key || !key.startsWith(PREFIX)) continue
    const rest = key.slice(PREFIX.length)
    const dot = rest.indexOf('.')
    if (dot < 0) continue
    const table = rest.slice(0, dot)
    const raw = ls.getItem(key)
    if (!raw) continue
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }
    if (table === 'courses') snapshot.courses[String(parsed.id)] = parsed as unknown as Course
    else if (table === 'work_items') snapshot.workItems[String(parsed.id)] = workItemFromDb(modelRow(parsed))
    else if (table === 'sessions') snapshot.sessions[String(parsed.id)] = parsed as unknown as Session
    else if (table === 'profiles') snapshot.profile = parsed as unknown as Profile
  }
  return snapshot
}

/** Cache stores the app model. Map it back through the row reader so older rows gain new fields. */
function modelRow(parsed: Record<string, unknown>): Record<string, unknown> {
  return {
    id: parsed.id,
    course_id: parsed.courseId ?? null,
    kind: parsed.kind,
    title: parsed.title,
    date: parsed.date ?? null,
    completed_at: parsed.completedAt ?? null,
    estimate_minutes: parsed.estimateMinutes ?? null,
    importance: parsed.importance ?? null,
    created_at: parsed.createdAt,
    updated_at: parsed.updatedAt,
    updated_by: parsed.updatedBy,
  }
}

export function modelFromRemote(table: Table, row: Record<string, unknown>): Course | WorkItem | Session | Profile {
  if (table === 'courses') return courseFromDb(row)
  if (table === 'work_items') return workItemFromDb(row)
  if (table === 'sessions') return sessionFromDb(row)
  return profileFromDb(row)
}
