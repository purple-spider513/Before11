import { nextCourseColor } from '../model/courseColor.ts'
import { clamp, snap5 } from '../model/minutes.ts'
import { stepAnchor } from '../model/range.ts'
import type { BlockColor, Course, DateStr, Session, View, WorkItem } from '../model/types.ts'
import { courseToDb, sessionToDb, workItemToDb } from '../supabase/rows.ts'
import { enqueueWrite, scheduleWrite } from '../supabase/write.ts'
import { holdWrites, type Change, type UpsertChange } from '../supabase/outbox.ts'
import { deviceId, deviceTz, saveLastCourseId, saveListCollapsed, saveView } from './device.ts'
import { useStore, type State } from './store.ts'
import { pushUndo, undo as undoStack, type UndoOp } from './undo.ts'

function uid(): string | null {
  return useStore.getState().user?.id ?? null
}

function meta(existing?: { createdAt: number }): { createdAt: number; updatedAt: number; updatedBy: string } {
  return {
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    updatedBy: deviceId(),
  }
}

function commit(change: Change, patch: Partial<State>, entry?: { label: string; ops: UndoOp[] }): void {
  const authed = uid() != null
  const hasChange = (change.upserts?.length ?? 0) > 0 || (change.deletes?.length ?? 0) > 0
  if (authed && hasChange) holdWrites(change)
  useStore.setState(patch)
  if (entry && entry.ops.length) pushUndo(entry)
  if (!authed || !hasChange) return
  scheduleWrite(() => enqueueWrite(change))
}

function courseUpsert(course: Course, userId: string): UpsertChange {
  return { table: 'courses', id: course.id, model: course, row: courseToDb(course, userId) }
}

function itemUpsert(item: WorkItem, userId: string): UpsertChange {
  return { table: 'work_items', id: item.id, model: item, row: workItemToDb(item, userId) }
}

function sessionUpsert(session: Session, userId: string): UpsertChange {
  return { table: 'sessions', id: session.id, model: session, row: sessionToDb(session, userId) }
}

export function trimName(name: string): string {
  return name.trim().slice(0, 40)
}

export function trimTitle(title: string): string {
  return title.trim().slice(0, 120)
}

export function parseEstimate(raw: string): number | null {
  const text = raw.trim()
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  return clamp(Math.round(n / 5) * 5, 5, 1440)
}

export function findCourseByName(name: string): Course | null {
  const trimmed = trimName(name)
  if (!trimmed) return null
  const courses = Object.values(useStore.getState().courses)
  return (
    courses.find((course) => course.name.localeCompare(trimmed, undefined, { sensitivity: 'base' }) === 0) ?? null
  )
}

let toastSeq = 0
let toastTimer: number | undefined

export function showToast(text: string): void {
  const id = ++toastSeq
  useStore.setState({ toast: { id, text } })
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (useStore.getState().toast?.id === id) useStore.setState({ toast: null })
  }, 5_000)
}

export function dismissToast(): void {
  window.clearTimeout(toastTimer)
  useStore.setState({ toast: null })
}

export function undo(): void {
  undoStack()
}

export function setView(view: View): void {
  saveView(view)
  useStore.setState({ view })
}

export function goToday(): void {
  useStore.setState({ anchor: useStore.getState().today, firstClick: null })
}

export function stepRange(dir: -1 | 1): void {
  const { view, anchor } = useStore.getState()
  useStore.setState({ anchor: stepAnchor(view, anchor, dir), firstClick: null })
}

export function toggleList(): void {
  const next = !useStore.getState().listCollapsed
  saveListCollapsed(next)
  useStore.setState({ listCollapsed: next })
}

export function openAdd(): void {
  useStore.setState({ addOpen: true, editingWorkItemId: null, selection: null, firstClick: null })
}

export function closeAdd(): void {
  useStore.setState({ addOpen: false })
}

export function closeEditor(): void {
  const armed = useStore.getState().armed
  useStore.setState({
    editingWorkItemId: null,
    armed: armed?.kind === 'workItem' ? null : armed,
  })
}

export function submitAdd(input: {
  kind: 'homework' | 'exam'
  title: string
  date: DateStr
  course: Course | null
  createName: string | null
}): void {
  const userId = uid()
  const state = useStore.getState()
  const title = trimTitle(input.title)
  if (!title || !userId) return
  let course = input.course
  let created: Course | null = null
  if (!course && input.createName) {
    const name = trimName(input.createName)
    course = findCourseByName(name)
    if (!course && name) {
      created = {
        id: crypto.randomUUID(),
        name,
        color: nextCourseColor(Object.values(state.courses)),
        ...meta(),
      }
      course = created
    }
  }
  if (!course) return
  const item: WorkItem = {
    id: crypto.randomUUID(),
    courseId: course.id,
    kind: input.kind,
    title,
    date: input.date,
    completedAt: null,
    estimateMinutes: null,
    ...meta(),
  }
  saveLastCourseId(course.id)
  const ops: UndoOp[] = []
  const upserts: UpsertChange[] = []
  if (created) {
    ops.push({ col: 'courses', id: created.id, before: null, after: created })
    upserts.push(courseUpsert(created, userId))
  }
  ops.push({ col: 'workItems', id: item.id, before: null, after: item })
  upserts.push(itemUpsert(item, userId))
  commit(
    { upserts },
    {
      courses: created ? { ...state.courses, [created.id]: created } : state.courses,
      workItems: { ...state.workItems, [item.id]: item },
      addOpen: false,
    },
    { label: `Add ${title}`, ops },
  )
}

export function toggleRow(id: string): void {
  const state = useStore.getState()
  const armed = state.armed
  if (state.editingWorkItemId === id && armed?.kind === 'workItem' && armed.workItemId === id) {
    useStore.setState({ editingWorkItemId: null, armed: null, selection: null })
    return
  }
  useStore.setState({
    editingWorkItemId: id,
    armed: { kind: 'workItem', workItemId: id },
    addOpen: false,
    selection: null,
    firstClick: null,
    popover: null,
  })
}

export function openWorkItem(id: string): void {
  const item = useStore.getState().workItems[id]
  if (!item || item.completedAt) return
  useStore.setState({
    listCollapsed: false,
    editingWorkItemId: id,
    armed: { kind: 'workItem', workItemId: id },
    addOpen: false,
    popover: null,
    firstClick: null,
  })
  saveListCollapsed(false)
}

export function saveEdit(input: {
  id: string
  kind: 'homework' | 'exam'
  title: string
  date: DateStr
  course: Course | null
  createName: string | null
  color: Course['color']
  estimate: number | null
}): boolean {
  const userId = uid()
  const state = useStore.getState()
  const existing = state.workItems[input.id]
  const title = trimTitle(input.title)
  if (!existing || !title || !userId) return false
  let course = input.course
  let created: Course | null = null
  if (!course && input.createName) {
    const name = trimName(input.createName)
    course = findCourseByName(name)
    if (!course && name) {
      created = { id: crypto.randomUUID(), name, color: input.color, ...meta() }
      course = created
    }
  }
  if (!course) return false
  const ops: UndoOp[] = []
  const upserts: UpsertChange[] = []
  let courses = state.courses
  if (created) {
    ops.push({ col: 'courses', id: created.id, before: null, after: created })
    upserts.push(courseUpsert(created, userId))
    courses = { ...courses, [created.id]: created }
  } else if (course.color !== input.color) {
    const next: Course = { ...course, color: input.color, ...meta(course) }
    ops.push({ col: 'courses', id: course.id, before: course, after: next })
    upserts.push(courseUpsert(next, userId))
    courses = { ...courses, [course.id]: next }
    course = next
  }
  const item: WorkItem = {
    ...existing,
    courseId: course.id,
    kind: input.kind,
    title,
    date: input.date,
    estimateMinutes: input.estimate,
    ...meta(existing),
  }
  const changed =
    created !== null ||
    item.courseId !== existing.courseId ||
    item.kind !== existing.kind ||
    item.title !== existing.title ||
    item.date !== existing.date ||
    item.estimateMinutes !== existing.estimateMinutes ||
    ops.length > 0
  if (!changed) {
    useStore.setState({ editingWorkItemId: null, armed: null })
    return true
  }
  ops.push({ col: 'workItems', id: item.id, before: existing, after: item })
  upserts.push(itemUpsert(item, userId))
  saveLastCourseId(course.id)
  commit(
    { upserts },
    {
      courses,
      workItems: { ...state.workItems, [item.id]: item },
      editingWorkItemId: null,
      armed: null,
    },
    { label: `Edit ${title}`, ops },
  )
  return true
}

export function deleteWorkItem(id: string): void {
  const userId = uid()
  const state = useStore.getState()
  const item = state.workItems[id]
  if (!item || !userId) return
  const sessions = Object.values(state.sessions).filter((session) => session.workItemId === id)
  const nextSessions = { ...state.sessions }
  const ops: UndoOp[] = [{ col: 'workItems', id, before: item, after: null }]
  for (const session of sessions) {
    delete nextSessions[session.id]
    ops.push({ col: 'sessions', id: session.id, before: session, after: null })
  }
  const nextItems = { ...state.workItems }
  delete nextItems[id]
  const deletes: Change['deletes'] = []
  if (sessions.length) deletes.push({ table: 'sessions', ids: sessions.map((session) => session.id) })
  deletes.push({ table: 'work_items', ids: [id] })
  const text =
    sessions.length > 0
      ? `Deleted ${item.title} and ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`
      : `Deleted ${item.title}`
  commit({ deletes }, { workItems: nextItems, sessions: nextSessions, editingWorkItemId: null, armed: null }, {
    label: text,
    ops,
  })
  showToast(text)
}

export function completeWorkItem(id: string): void {
  const userId = uid()
  const state = useStore.getState()
  const item = state.workItems[id]
  if (!item || item.completedAt || !userId) return
  const next: WorkItem = { ...item, completedAt: state.today, ...meta(item) }
  commit(
    { upserts: [itemUpsert(next, userId)] },
    {
      workItems: { ...state.workItems, [id]: next },
      editingWorkItemId: state.editingWorkItemId === id ? null : state.editingWorkItemId,
      armed: state.armed?.kind === 'workItem' && state.armed.workItemId === id ? null : state.armed,
    },
    { label: `Done: ${item.title}`, ops: [{ col: 'workItems', id, before: item, after: next }] },
  )
  showToast(`Done: ${item.title}`)
}

function enforceRange(start: number, end: number): { start: number; end: number } {
  let s = clamp(snap5(start), 0, 1435)
  let e = snap5(end)
  if (e < s + 15) e = s + 15
  if (e > 2880) e = 2880
  if (e - s < 15) s = Math.max(0, e - 15)
  return { start: s, end: e }
}

function plainBase(date: DateStr, start: number, end: number, title: string, color: BlockColor): Session {
  const range = enforceRange(start, end)
  return {
    id: crypto.randomUUID(),
    date,
    start: range.start,
    end: range.end,
    workItemId: null,
    title: title.trim() ? trimTitle(title) : 'Busy',
    color,
    repeat: 'none',
    tz: deviceTz(),
    ...meta(),
  }
}

export function createPlain(input: { date: DateStr; start: number; end: number }): void {
  const session = plainBase(input.date, input.start, input.end, 'Busy', 'slate')
  const state = useStore.getState()
  useStore.setState({
    sessions: { ...state.sessions, [session.id]: session },
    selection: { kind: 'session', sessionId: session.id, date: input.date },
    popover: { kind: 'plain', sessionId: session.id, date: input.date, isNew: true },
    firstClick: null,
    armed: null,
    editingWorkItemId: null,
  })
}

export function patchPlain(id: string, patch: Partial<Pick<Session, 'title' | 'color' | 'repeat'>>): void {
  const state = useStore.getState()
  const session = state.sessions[id]
  if (!session || session.workItemId) return
  useStore.setState({
    sessions: {
      ...state.sessions,
      [id]: { ...session, ...patch },
    },
  })
}

export function setPlainLink(
  id: string,
  workItemId: string | null,
  plain: { title: string; color: BlockColor; repeat: Session['repeat'] },
): void {
  const state = useStore.getState()
  const session = state.sessions[id]
  if (!session) return
  const next: Session = workItemId
    ? state.workItems[workItemId]
      ? { ...session, workItemId, title: null, color: null, repeat: 'none' }
      : session
    : {
        ...session,
        workItemId: null,
        title: trimTitle(plain.title) || 'Busy',
        color: plain.color,
        repeat: plain.repeat,
      }
  if (
    next.workItemId === session.workItemId &&
    next.title === session.title &&
    next.color === session.color &&
    next.repeat === session.repeat
  ) {
    return
  }
  useStore.setState({ sessions: { ...state.sessions, [id]: next } })
}

export function commitPlainClose(id: string, before: Session | null): void {
  const userId = uid()
  const state = useStore.getState()
  const current = state.sessions[id]
  useStore.setState({ popover: null })
  if (!current || !userId) return
  const next: Session = current.workItemId
    ? { ...current, title: null, color: null, repeat: 'none', ...meta(current) }
    : {
        ...current,
        workItemId: null,
        title: current.title?.trim() ? trimTitle(current.title) : 'Busy',
        color: current.color ?? 'slate',
        ...meta(current),
      }
  const same =
    before &&
    before.title === next.title &&
    before.color === next.color &&
    before.repeat === next.repeat &&
    before.workItemId === next.workItemId &&
    before.start === next.start &&
    before.end === next.end &&
    before.date === next.date
  const change: Change = { upserts: [sessionUpsert(next, userId)] }
  if (!same) holdWrites(change)
  useStore.setState({ sessions: { ...useStore.getState().sessions, [id]: next } })
  if (same) return
  pushUndo({
    label: `${before ? 'Edit' : 'Add'} ${sessionLabel(next)}`,
    ops: [{ col: 'sessions', id, before, after: next }],
  })
  scheduleWrite(() => enqueueWrite(change))
}

export function moveSession(id: string, date: DateStr, start: number): void {
  const userId = uid()
  const state = useStore.getState()
  const session = state.sessions[id]
  if (!session || session.start == null || session.end == null || !userId) return
  const duration = session.end - session.start
  const repeating = session.repeat !== 'none'
  const nextDate = repeating ? session.date : date
  const maxStart = Math.min(1435, 2880 - duration)
  const nextStart = clamp(snap5(start), 0, maxStart)
  const next: Session = { ...session, date: nextDate, start: nextStart, end: nextStart + duration, tz: deviceTz(), ...meta(session) }
  if (next.date === session.date && next.start === session.start && next.end === session.end) {
    useStore.setState({ selection: { kind: 'session', sessionId: id, date: nextDate } })
    return
  }
  commit(
    { upserts: [sessionUpsert(next, userId)] },
    {
      sessions: { ...state.sessions, [id]: next },
      selection: { kind: 'session', sessionId: id, date: repeating ? state.selection?.date ?? nextDate : nextDate },
    },
    { label: `Move ${sessionLabel(session)}`, ops: [{ col: 'sessions', id, before: session, after: next }] },
  )
}

export function resizeSession(id: string, start: number, end: number): void {
  const userId = uid()
  const state = useStore.getState()
  const session = state.sessions[id]
  if (!session || session.start == null || session.end == null || !userId) return
  const range = enforceRange(start, end)
  const next: Session = { ...session, start: range.start, end: range.end, tz: deviceTz(), ...meta(session) }
  if (next.start === session.start && next.end === session.end) return
  commit(
    { upserts: [sessionUpsert(next, userId)] },
    { sessions: { ...state.sessions, [id]: next } },
    { label: `Resize ${sessionLabel(session)}`, ops: [{ col: 'sessions', id, before: session, after: next }] },
  )
}

export function createLinked(input: {
  workItemId: string
  date: DateStr
  start: number | null
  end: number | null
  disarm: boolean
}): void {
  const userId = uid()
  const state = useStore.getState()
  const item = state.workItems[input.workItemId]
  if (!item || !userId) return
  let start = input.start
  let end = input.end
  if (start != null && end != null) {
    const range = enforceRange(start, end)
    start = range.start
    end = range.end
  }
  const session: Session = {
    id: crypto.randomUUID(),
    date: input.date,
    start,
    end,
    workItemId: item.id,
    title: null,
    color: null,
    repeat: 'none',
    tz: deviceTz(),
    ...meta(),
  }
  commit(
    { upserts: [sessionUpsert(session, userId)] },
    {
      sessions: { ...state.sessions, [session.id]: session },
      selection: start == null ? state.selection : { kind: 'session', sessionId: session.id, date: input.date },
      armed: input.disarm ? null : state.armed,
      firstClick: null,
    },
    { label: `Add ${item.title}`, ops: [{ col: 'sessions', id: session.id, before: null, after: session }] },
  )
}

export function placeChip(sessionId: string, date: DateStr, minute: number): void {
  const userId = uid()
  const state = useStore.getState()
  const session = state.sessions[sessionId]
  if (!session || !userId) return
  const start = clamp(snap5(minute), 0, 1380)
  const next: Session = { ...session, date, start, end: start + 60, tz: deviceTz(), ...meta(session) }
  commit(
    { upserts: [sessionUpsert(next, userId)] },
    {
      sessions: { ...state.sessions, [sessionId]: next },
      selection: { kind: 'session', sessionId, date },
      armed: null,
    },
    { label: `Move ${sessionLabel(session)}`, ops: [{ col: 'sessions', id: sessionId, before: session, after: next }] },
  )
}

export function deleteSession(id: string): void {
  const userId = uid()
  const state = useStore.getState()
  const session = state.sessions[id]
  if (!session || !userId) return
  const next = { ...state.sessions }
  delete next[id]
  const text = deleteLabel(session)
  commit(
    { deletes: [{ table: 'sessions', ids: [id] }] },
    {
      sessions: next,
      selection: state.selection?.sessionId === id ? null : state.selection,
      popover: state.popover && 'sessionId' in state.popover && state.popover.sessionId === id ? null : state.popover,
      armed: state.armed?.kind === 'chip' && state.armed.sessionId === id ? null : state.armed,
    },
    { label: text, ops: [{ col: 'sessions', id, before: session, after: null }] },
  )
  showToast(text)
}

export function deleteSelected(): void {
  const selected = useStore.getState().selection
  if (selected) deleteSession(selected.sessionId)
}

export function selectSession(sessionId: string, date: DateStr): void {
  useStore.setState({ selection: { kind: 'session', sessionId, date } })
}

export function clearSelection(): void {
  useStore.setState({ selection: null })
}

export function setFirstClick(date: DateStr, minute: number): void {
  useStore.setState({
    firstClick: { date, minute: snap5(minute) },
    selection: null,
  })
}

export function clearFirstClick(): void {
  useStore.setState({ firstClick: null })
}

export function openPlainPopover(sessionId: string, date: DateStr, isNew: boolean): void {
  useStore.setState({
    popover: { kind: 'plain', sessionId, date, isNew },
    selection: { kind: 'session', sessionId, date },
  })
}

export function openOverflow(date: DateStr, ids: string[]): void {
  useStore.setState({ popover: { kind: 'overflow', date, ids } })
}

export function closePopover(): void {
  useStore.setState({ popover: null })
}

export function armChip(sessionId: string): void {
  useStore.setState({
    armed: { kind: 'chip', sessionId },
    firstClick: null,
    selection: null,
    editingWorkItemId: null,
  })
}

export function disarm(): void {
  const state = useStore.getState()
  useStore.setState({
    armed: null,
    editingWorkItemId: state.armed?.kind === 'workItem' ? null : state.editingWorkItemId,
  })
}

export function openMonth(date: DateStr): void {
  useStore.setState({ monthOverlayDate: date })
}

export function closeMonth(): void {
  useStore.setState({ monthOverlayDate: null })
}

export function sessionLabel(session: Session): string {
  const state = useStore.getState()
  if (session.workItemId) {
    const item = state.workItems[session.workItemId]
    const course = item ? state.courses[item.courseId] : undefined
    if (item) return `${course?.name ?? 'Course'} · ${item.title}`
  }
  return session.title?.trim() || 'Busy'
}

function deleteLabel(session: Session): string {
  if (session.repeat === 'daily') return `Deleted ${session.title?.trim() || 'Busy'} (every day)`
  if (session.repeat === 'weekdays') return `Deleted ${session.title?.trim() || 'Busy'} (weekdays)`
  if (session.workItemId) return `Deleted ${sessionLabel(session)}`
  return `Deleted ${session.title?.trim() || 'Busy'}`
}

export function focusReturnAdd(): void {
  document.getElementById('b11-add')?.focus()
}
