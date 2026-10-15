import { addDays, isWeekday } from './dates.ts'
import type { DateStr, Session } from './types.ts'

export interface Segment {
  sessionId: string
  instanceDate: DateStr
  top: number
  bottom: number
  isContinuation: boolean
}

const EMPTY: Segment[] = []

function ruleMatches(session: Session, date: DateStr): boolean {
  if (date < session.date) return false
  if (session.repeat === 'daily') return true
  if (session.repeat === 'weekdays') return isWeekday(date)
  return false
}

function pushTimed(out: Segment[], session: Session, date: DateStr): void {
  if (session.start == null || session.end == null) return
  if (session.repeat === 'none') {
    if (session.date === date) {
      out.push({
        sessionId: session.id,
        instanceDate: date,
        top: session.start,
        bottom: Math.min(session.end, 1440),
        isContinuation: false,
      })
    }
    if (session.end > 1440 && addDays(session.date, 1) === date) {
      out.push({
        sessionId: session.id,
        instanceDate: date,
        top: 0,
        bottom: session.end - 1440,
        isContinuation: true,
      })
    }
    return
  }
  if (ruleMatches(session, date)) {
    out.push({
      sessionId: session.id,
      instanceDate: date,
      top: session.start,
      bottom: Math.min(session.end, 1440),
      isContinuation: false,
    })
  }
  const prev = addDays(date, -1)
  if (session.end > 1440 && ruleMatches(session, prev)) {
    out.push({
      sessionId: session.id,
      instanceDate: date,
      top: 0,
      bottom: session.end - 1440,
      isContinuation: true,
    })
  }
}

export function computeSegments(date: DateStr, sessions: readonly Session[]): Segment[] {
  const out: Segment[] = []
  for (const session of sessions) pushTimed(out, session, date)
  return out
}

let active: Record<string, Session> | null = null
let activeMap = new Map<DateStr, Segment[]>()
let previousMap = new Map<DateStr, Segment[]>()

function sameSegments(a: Segment[], b: Segment[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (
      x.sessionId !== y.sessionId ||
      x.top !== y.top ||
      x.bottom !== y.bottom ||
      x.isContinuation !== y.isContinuation ||
      x.instanceDate !== y.instanceDate
    ) {
      return false
    }
  }
  return true
}

/** Stable per date while `sessions` is the same object, and across updates that do not change that day. */
export function segmentsForDate(date: DateStr, sessions: Record<string, Session>): Segment[] {
  if (sessions !== active) {
    previousMap = activeMap
    activeMap = new Map()
    active = sessions
  }
  const cached = activeMap.get(date)
  if (cached) return cached
  const built = computeSegments(date, Object.values(sessions))
  const prev = previousMap.get(date)
  const use = built.length === 0 ? EMPTY : prev && sameSegments(prev, built) ? prev : built
  activeMap.set(date, use)
  return use
}
