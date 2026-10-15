import type { View } from '../model/types.ts'

const DEVICE = 'b11.deviceId'
const VIEW = 'b11.view'
const COLLAPSED = 'b11.listCollapsed'
const LAST_COURSE = 'b11.lastCourseId'

const VIEWS: readonly View[] = ['day', '3day', 'week', 'month']

let cachedId: string | null = null

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function set(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Settings stay in memory for this page load.
  }
}

export function deviceId(): string {
  if (cachedId) return cachedId
  const existing = get(DEVICE)
  if (existing) {
    cachedId = existing
    return existing
  }
  const created = crypto.randomUUID()
  set(DEVICE, created)
  cachedId = created
  return created
}

export function loadView(): View {
  const value = get(VIEW)
  return VIEWS.includes(value as View) ? (value as View) : 'week'
}

export function saveView(view: View): void {
  set(VIEW, view)
}

export function loadListCollapsed(): boolean {
  return get(COLLAPSED) === '1'
}

export function saveListCollapsed(collapsed: boolean): void {
  set(COLLAPSED, collapsed ? '1' : '0')
}

export function loadLastCourseId(): string | null {
  return get(LAST_COURSE)
}

export function saveLastCourseId(id: string): void {
  set(LAST_COURSE, id)
}

export function deviceTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
