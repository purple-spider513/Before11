import type { Course, Session, WorkItem } from '../model/types.ts'
import { courseToDb, sessionToDb, workItemToDb } from '../supabase/rows.ts'
import { holdWrites } from '../supabase/outbox.ts'
import { enqueueWrite, scheduleWrite } from '../supabase/write.ts'
import { deviceId } from './device.ts'
import { useStore } from './store.ts'

export type UndoCol = 'courses' | 'workItems' | 'sessions'

export interface UndoOp {
  col: UndoCol
  id: string
  before: Course | WorkItem | Session | null
  after: Course | WorkItem | Session | null
}

export interface UndoEntry {
  label: string
  ops: UndoOp[]
}

const stack: UndoEntry[] = []
const MAX = 50

export function pushUndo(entry: UndoEntry): void {
  stack.push(entry)
  if (stack.length > MAX) stack.shift()
}

export function dropEntriesFor(id: string): void {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].ops.some((op) => op.id === id)) stack.splice(i, 1)
  }
}

function bump<T extends { updatedAt: number; updatedBy: string }>(row: T): T {
  return { ...row, updatedAt: Date.now(), updatedBy: deviceId() }
}

export function undo(): void {
  const entry = stack.pop()
  if (!entry) return
  const state = useStore.getState()
  const userId = state.user?.id
  const courses = { ...state.courses }
  const workItems = { ...state.workItems }
  const sessions = { ...state.sessions }
  const upserts: {
    table: 'courses' | 'work_items' | 'sessions'
    id: string
    model: unknown
    row: Record<string, unknown>
  }[] = []
  const deletes: { table: 'courses' | 'work_items' | 'sessions'; ids: string[] }[] = []
  const deleted = { courses: [] as string[], work_items: [] as string[], sessions: [] as string[] }

  for (const op of entry.ops) {
    if (op.before === null) {
      if (op.col === 'courses') delete courses[op.id]
      else if (op.col === 'workItems') delete workItems[op.id]
      else delete sessions[op.id]
      const table = op.col === 'workItems' ? 'work_items' : op.col
      deleted[table].push(op.id)
    } else {
      const restored = bump(op.before as Course)
      if (op.col === 'courses') {
        courses[op.id] = restored as Course
        if (userId) {
          upserts.push({
            table: 'courses',
            id: op.id,
            model: restored,
            row: courseToDb(restored as Course, userId),
          })
        }
      } else if (op.col === 'workItems') {
        const row = bump(op.before as WorkItem)
        workItems[op.id] = row
        if (userId) {
          upserts.push({ table: 'work_items', id: op.id, model: row, row: workItemToDb(row, userId) })
        }
      } else {
        const row = bump(op.before as Session)
        sessions[op.id] = row
        if (userId) {
          upserts.push({ table: 'sessions', id: op.id, model: row, row: sessionToDb(row, userId) })
        }
      }
    }
  }
  if (deleted.courses.length) deletes.push({ table: 'courses', ids: deleted.courses })
  if (deleted.work_items.length) deletes.push({ table: 'work_items', ids: deleted.work_items })
  if (deleted.sessions.length) deletes.push({ table: 'sessions', ids: deleted.sessions })

  const change = { upserts, deletes }
  if (userId && (upserts.length > 0 || deletes.length > 0)) holdWrites(change)
  useStore.setState({
    courses,
    workItems,
    sessions,
    toast: null,
  })
  if (!userId) return
  if (upserts.length === 0 && deletes.length === 0) return
  scheduleWrite(() => enqueueWrite(change))
}
