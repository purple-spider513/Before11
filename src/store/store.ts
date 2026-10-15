import { create } from 'zustand'
import { nowMinute, todayStr } from '../model/dates.ts'
import type { Course, DateStr, Profile, Session, View, WorkItem } from '../model/types.ts'
import { loadListCollapsed, loadView } from './device.ts'

export interface AuthUser {
  id: string
  email: string
}

export interface State {
  courses: Record<string, Course>
  workItems: Record<string, WorkItem>
  sessions: Record<string, Session>
  profile: Profile | null
  loaded: { courses: boolean; workItems: boolean; sessions: boolean }
  pendingDeletes: Set<string>
  today: DateStr
  nowMinute: number
  view: View
  anchor: DateStr
  listCollapsed: boolean
  selection: { kind: 'session'; sessionId: string; date: DateStr } | null
  armed: { kind: 'workItem'; workItemId: string } | { kind: 'chip'; sessionId: string } | null
  firstClick: { date: DateStr; minute: number } | null
  editingWorkItemId: string | null
  addOpen: boolean
  coursesOpen: boolean
  popover:
    | { kind: 'plain'; sessionId: string; date: DateStr; isNew: boolean }
    | { kind: 'overflow'; date: DateStr; ids: string[] }
    | null
  monthOverlayDate: DateStr | null
  toast: { id: number; text: string } | null
  sync: { state: 'ok' | 'offline' | 'error'; code?: string }
  transport: 'realtime' | 'polling'
  user: AuthUser | null
}

const today = todayStr()

export const useStore = create<State>(() => ({
  courses: {},
  workItems: {},
  sessions: {},
  profile: null,
  loaded: { courses: false, workItems: false, sessions: false },
  pendingDeletes: new Set<string>(),
  today,
  nowMinute: nowMinute(),
  view: loadView(),
  anchor: today,
  listCollapsed: loadListCollapsed(),
  selection: null,
  armed: null,
  firstClick: null,
  editingWorkItemId: null,
  addOpen: false,
  coursesOpen: false,
  popover: null,
  monthOverlayDate: null,
  toast: null,
  sync: { state: 'ok' },
  transport: 'realtime',
  user: null,
}))
