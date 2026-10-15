import { describe, expect, it } from 'vitest'
import { computeSegments } from './instances.ts'
import type { Session } from './types.ts'

function session(partial: Partial<Session> & Pick<Session, 'id' | 'date' | 'start' | 'end'>): Session {
  return {
    workItemId: null,
    title: 'Busy',
    color: 'slate',
    repeat: 'none',
    tz: 'America/Chicago',
    createdAt: 0,
    updatedAt: 0,
    updatedBy: 'test',
    ...partial,
  }
}

describe('segments', () => {
  it('splits a midnight crossing and skips hour-less sessions', () => {
    const sleep = session({ id: 'sleep', date: '2026-09-24', start: 23 * 60, end: 31 * 60, title: 'Sleep' })
    const hourless = session({ id: 'chip', date: '2026-09-24', start: null, end: null, title: null, color: null, workItemId: 'w' })
    const first = computeSegments('2026-09-24', [sleep, hourless])
    const second = computeSegments('2026-09-25', [sleep, hourless])
    expect(first).toEqual([
      { sessionId: 'sleep', instanceDate: '2026-09-24', top: 23 * 60, bottom: 1440, isContinuation: false },
    ])
    expect(second).toEqual([
      { sessionId: 'sleep', instanceDate: '2026-09-25', top: 0, bottom: 7 * 60, isContinuation: true },
    ])
  })

  it('paints weekdays and the continuation from the day before the range', () => {
    const school = session({
      id: 'school',
      date: '2026-09-21',
      start: 8 * 60 + 50,
      end: 15 * 60 + 30,
      repeat: 'weekdays',
      title: 'School',
    })
    const sleep = session({
      id: 'sleep',
      date: '2026-09-01',
      start: 23 * 60,
      end: 31 * 60,
      repeat: 'daily',
      title: 'Sleep',
    })
    expect(computeSegments('2026-09-26', [school]).map((s) => s.sessionId)).toEqual([])
    expect(computeSegments('2026-09-25', [school]).map((s) => s.sessionId)).toEqual(['school'])
    const monday = computeSegments('2026-09-21', [sleep])
    expect(monday.map((s) => s.isContinuation)).toEqual([false, true])
    expect(monday[0]).toMatchObject({ top: 23 * 60, bottom: 1440, isContinuation: false })
    expect(monday[1]).toMatchObject({ top: 0, bottom: 7 * 60, isContinuation: true })
  })
})
