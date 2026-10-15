import type { Course, Profile, Session, WorkItem } from '../model/types.ts'
import { putModel, removeModels } from '../supabase/cache.ts'
import { outboxHas } from '../supabase/outbox.ts'
import type { Table } from '../supabase/rows.ts'
import { deviceId } from './device.ts'
import { dropEntriesFor } from './undo.ts'
import { useStore } from './store.ts'

type Row = Course | WorkItem | Session

function mapKey(table: Table): 'courses' | 'workItems' | 'sessions' | 'profile' {
  if (table === 'courses') return 'courses'
  if (table === 'work_items') return 'workItems'
  if (table === 'sessions') return 'sessions'
  return 'profile'
}

export function applyRemoteUpsert(table: Table, model: Course | WorkItem | Session | Profile, id: string): void {
  if (outboxHas(table, id)) return
  const state = useStore.getState()
  if (table === 'profiles') {
    const incoming = model as Profile
    if (state.profile && state.profile.tz === incoming.tz && state.profile.createdAt === incoming.createdAt) return
    putModel('profiles', id, incoming)
    useStore.setState({ profile: incoming })
    return
  }
  const key = mapKey(table) as 'courses' | 'workItems' | 'sessions'
  const current = state[key][id] as Row | undefined
  const incoming = model as Row
  const me = deviceId()
  if (current && incoming.updatedBy === me && incoming.updatedAt < current.updatedAt) return
  if (current && incoming.updatedAt === current.updatedAt && incoming.updatedBy === current.updatedBy) return
  if (incoming.updatedBy !== me) dropEntriesFor(id)
  putModel(table, id, incoming)
  useStore.setState({ [key]: { ...state[key], [id]: incoming } })
}

export function applyRemoteRemove(table: Table, id: string): void {
  if (outboxHas(table, id)) return
  if (table === 'profiles') {
    removeModels('profiles', [id])
    useStore.setState({ profile: null })
    return
  }
  const key = mapKey(table) as 'courses' | 'workItems' | 'sessions'
  const state = useStore.getState()
  if (!state[key][id]) return
  const next = { ...state[key] }
  delete next[id]
  removeModels(table, [id])
  dropEntriesFor(id)
  useStore.setState({ [key]: next })
}

function mergeTable<T extends Course | WorkItem | Session>(
  table: Exclude<Table, 'profiles'>,
  current: Record<string, T>,
  models: T[],
): Record<string, T> {
  const next: Record<string, T> = { ...current }
  const seen = new Set<string>()
  const me = deviceId()
  for (const model of models) {
    seen.add(model.id)
    if (outboxHas(table, model.id)) continue
    const local = next[model.id]
    if (local && model.updatedBy === me && model.updatedAt < local.updatedAt) continue
    if (local && model.updatedAt === local.updatedAt && model.updatedBy === local.updatedBy) continue
    if (model.updatedBy !== me) dropEntriesFor(model.id)
    next[model.id] = model
    putModel(table, model.id, model)
  }
  for (const id of Object.keys(next)) {
    if (seen.has(id) || outboxHas(table, id)) continue
    delete next[id]
    removeModels(table, [id])
    dropEntriesFor(id)
  }
  return next
}

export function replaceFetched(input: {
  courses: Course[]
  workItems: WorkItem[]
  sessions: Session[]
  profile: Profile | null
  userId: string
}): void {
  const state = useStore.getState()
  let profile = state.profile
  if (input.profile && !outboxHas('profiles', input.userId)) {
    if (!profile || profile.tz !== input.profile.tz || profile.createdAt !== input.profile.createdAt) {
      profile = input.profile
      putModel('profiles', input.userId, profile)
    }
  }
  useStore.setState({
    courses: mergeTable('courses', state.courses, input.courses),
    workItems: mergeTable('work_items', state.workItems, input.workItems),
    sessions: mergeTable('sessions', state.sessions, input.sessions),
    profile,
    loaded: { courses: true, workItems: true, sessions: true },
  })
}

export function applyRemoteFull(
  table: Exclude<Table, 'profiles'>,
  models: (Course | WorkItem | Session)[],
): void {
  const key = mapKey(table) as 'courses' | 'workItems' | 'sessions'
  const state = useStore.getState()
  const next: Record<string, Course | WorkItem | Session> = { ...state[key] }
  const seen = new Set<string>()
  for (const model of models) {
    const id = model.id
    seen.add(id)
    if (outboxHas(table, id)) continue
    const current = next[id] as Row | undefined
    const me = deviceId()
    if (current && model.updatedBy === me && model.updatedAt < current.updatedAt) continue
    if (current && model.updatedAt === current.updatedAt && model.updatedBy === current.updatedBy) continue
    if (model.updatedBy !== me) dropEntriesFor(id)
    next[id] = model
    putModel(table, id, model)
  }
  for (const id of Object.keys(next)) {
    if (seen.has(id)) continue
    if (outboxHas(table, id)) continue
    delete next[id]
    removeModels(table, [id])
    dropEntriesFor(id)
  }
  const loaded = { ...state.loaded, [key]: true }
  useStore.setState({ [key]: next, loaded })
}

export function applyRemoteProfile(profile: Profile | null, userId: string): void {
  const state = useStore.getState()
  if (!profile) return
  if (outboxHas('profiles', userId)) return
  if (state.profile && state.profile.tz === profile.tz && state.profile.createdAt === profile.createdAt) return
  putModel('profiles', userId, profile)
  useStore.setState({ profile })
}
