import { describe, expect, it } from 'vitest'
import type { Course, Session, WorkItem } from '../model/types.ts'
import { courseFromDb, courseToDb, sessionFromDb, sessionToDb, workItemFromDb, workItemToDb } from './rows.ts'

const course: Course = {
  id: 'c1',
  name: 'Math',
  color: 'blue',
  createdAt: 10,
  updatedAt: 20,
  updatedBy: 'dev',
}

const item: WorkItem = {
  id: 'w1',
  courseId: 'c1',
  kind: 'homework',
  title: 'Worksheet 4',
  date: '2026-09-25',
  completedAt: null,
  estimateMinutes: 60,
  createdAt: 10,
  updatedAt: 20,
  updatedBy: 'dev',
}

const session: Session = {
  id: 's1',
  date: '2026-09-24',
  start: 960,
  end: 1020,
  workItemId: 'w1',
  title: null,
  color: null,
  repeat: 'none',
  tz: 'America/Chicago',
  createdAt: 10,
  updatedAt: 20,
  updatedBy: 'dev',
}

describe('rows', () => {
  it('round-trips courses, work items, and sessions', () => {
    expect(courseFromDb(courseToDb(course, 'user'))).toEqual(course)
    expect(courseToDb(course, 'user').user_id).toBe('user')
    expect(workItemFromDb(workItemToDb(item, 'user'))).toEqual(item)
    expect(workItemToDb(item, 'user').completed_at).toBeNull()
    const task: WorkItem = { ...item, id: 'w2', kind: 'task', courseId: null, title: 'Email teacher', estimateMinutes: null }
    expect(workItemToDb(task, 'user').course_id).toBeNull()
    expect(workItemFromDb(workItemToDb(task, 'user'))).toEqual(task)
    expect(workItemFromDb({ ...workItemToDb(item, 'user'), kind: 'task', course_id: 'c1' }).courseId).toBeNull()
    expect(workItemFromDb({ ...workItemToDb(item, 'user'), kind: 'note' }).kind).toBe('homework')
    expect(sessionFromDb(sessionToDb(session, 'user'))).toEqual(session)
    expect(sessionToDb(session, 'user').start_min).toBe(960)
    expect(sessionToDb(session, 'user').end_min).toBe(1020)
  })
})
