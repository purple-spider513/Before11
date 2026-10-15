import { describe, expect, it } from 'vitest'
import {
  compareDueDate,
  dateFieldLabel,
  groupUnfinished,
  matchingCourses,
  noTime,
  plannedMinutes,
  rowDateText,
  tomorrowCount,
  workKindLabel,
} from './list.ts'
import type { Course, PaletteKey, Session, WorkItem } from './types.ts'

const today = '2026-09-24'
const now = 15 * 60

function course(id: string, name: string, color: PaletteKey = 'blue'): Course {
  return { id, name, color, createdAt: 0, updatedAt: 0, updatedBy: 'test' }
}

function item(partial: Partial<WorkItem> & Pick<WorkItem, 'id' | 'title' | 'date' | 'courseId'>): WorkItem {
  return {
    kind: 'homework',
    completedAt: null,
    estimateMinutes: null,
    importance: null,
    createdAt: 0,
    updatedAt: 0,
    updatedBy: 'test',
    ...partial,
  }
}

function session(partial: Partial<Session> & Pick<Session, 'id' | 'date'>): Session {
  return {
    start: null,
    end: null,
    workItemId: 'w1',
    title: null,
    color: null,
    repeat: 'none',
    tz: 'America/Chicago',
    createdAt: 0,
    updatedAt: 0,
    updatedBy: 'test',
    ...partial,
  }
}

const courses = {
  math: course('math', 'Math'),
  bio: course('bio', 'Biology'),
  art: course('art', 'Art'),
}

describe('groupUnfinished', () => {
  const items = [
    item({ id: 'a', title: 'Worksheet 4', date: '2026-09-21', courseId: 'math' }),
    item({ id: 'b', title: 'Quiz', date: '2026-09-22', courseId: 'bio', kind: 'exam' }),
    item({ id: 'c', title: 'Problem set', date: today, courseId: 'math' }),
    item({ id: 'd', title: 'Lab', date: today, courseId: 'bio' }),
    item({ id: 'e', title: 'Sketch', date: '2026-09-25', courseId: 'art' }),
    item({ id: 'f', title: 'Essay', date: '2026-10-02', courseId: 'math' }),
    item({ id: 'g', title: 'Poster', date: '2026-10-01', courseId: 'art' }),
    item({ id: 'h', title: 'Done already', date: '2026-09-21', courseId: 'math', completedAt: '2026-09-23' }),
  ]

  it('groups and sorts overdue, tonight, tomorrow, and later', () => {
    const groups = groupUnfinished(items, courses, today)
    expect(groups.overdue.map((i) => i.id)).toEqual(['a', 'b'])
    expect(groups.tonight.map((i) => i.id)).toEqual(['d', 'c'])
    expect(groups.tomorrow.map((i) => i.id)).toEqual(['e'])
    expect(groups.later.map((i) => i.id)).toEqual(['g', 'f'])
    expect(groups.undated).toEqual([])
  })

  it('formats row dates', () => {
    expect(rowDateText(items[0], today)).toBe('Mon, Sep 21 · overdue')
    expect(rowDateText(items[1], today)).toBe('Exam · Tue, Sep 22 · overdue')
    expect(rowDateText(items[2], today)).toBe('Today')
    expect(rowDateText(items[4], today)).toBe('Tomorrow')
    expect(rowDateText(item({ id: 'x', title: 'Final', date: '2027-01-08', courseId: 'math', kind: 'exam' }), today)).toBe(
      'Exam · Fri, Jan 8, 2027',
    )
    expect(rowDateText(item({ id: 't', title: 'Email teacher', date: today, courseId: null, kind: 'task' }), today)).toBe(
      'Task · Today',
    )
    expect(dateFieldLabel('task')).toBe('Due')
    expect(dateFieldLabel('exam')).toBe('Test date')
    expect(workKindLabel('task')).toBe('Task')
  })

  it('sorts a task with homework and exams by due date', () => {
    const groups = groupUnfinished(
      [
        item({ id: 'hw', title: 'Worksheet', date: '2026-09-26', courseId: 'math' }),
        item({ id: 'tk', title: 'Email teacher', date: '2026-09-25', courseId: null, kind: 'task' }),
        item({ id: 'ex', title: 'Quiz', date: '2026-09-25', courseId: 'bio', kind: 'exam' }),
        item({ id: 'later-task', title: 'Return the book', date: '2026-10-03', courseId: null, kind: 'task' }),
      ],
      courses,
      today,
    )
    expect(groups.tomorrow.map((i) => i.id)).toEqual(['tk', 'ex'])
    expect(groups.tomorrow[0].courseId).toBeNull()
    expect(groups.later.map((i) => i.id)).toEqual(['hw', 'later-task'])
    expect(rowDateText(groups.tomorrow[0], today)).toBe('Task · Tomorrow')
  })

  it('keeps an undated task after dated items and ignores importance', () => {
    const groups = groupUnfinished(
      [
        item({ id: 'later', title: 'Essay', date: '2026-10-02', courseId: 'math' }),
        item({ id: 'book', title: 'Return the book', date: null, courseId: null, kind: 'task', importance: 'high' }),
        item({ id: 'paper', title: 'Buy paper', date: null, courseId: null, kind: 'task', importance: 'low' }),
        item({ id: 'done', title: 'Already done', date: null, courseId: null, kind: 'task', completedAt: today }),
        item({ id: 'high', title: 'Zebra', date: today, courseId: 'math', importance: 'high' }),
        item({ id: 'low', title: 'Alpha', date: today, courseId: 'math', importance: 'low' }),
      ],
      courses,
      today,
    )
    expect(groups.later.map((i) => i.id)).toEqual(['later'])
    expect(groups.undated.map((i) => i.id)).toEqual(['paper', 'book'])
    expect(groups.tonight.map((i) => i.id)).toEqual(['low', 'high'])
    expect(rowDateText(groups.undated[0], today)).toBe('Task · No date')
    expect(
      tomorrowCount(
        [
          groups.undated[0],
          item({ id: 'tmw', title: 'Sketch', date: '2026-09-25', courseId: 'art' }),
        ],
        today,
      ),
    ).toBe(1)
    expect(compareDueDate(null, today)).toBeGreaterThan(0)
    expect(compareDueDate(today, null)).toBeLessThan(0)
    expect(compareDueDate(null, null)).toBe(0)
  })

  it('filters saved courses by a typed fragment', () => {
    const list = [
      course('eng', 'English'),
      course('mvc', 'Multivariable and Vector Calculus'),
      course('mus', 'Music'),
    ]
    expect(matchingCourses(list, 'mul').map((entry) => entry.name)).toEqual(['Multivariable and Vector Calculus'])
    expect(matchingCourses(list, 'MUL').map((entry) => entry.name)).toEqual(['Multivariable and Vector Calculus'])
    expect(matchingCourses(list, '').map((entry) => entry.name)).toEqual([
      'English',
      'Multivariable and Vector Calculus',
      'Music',
    ])
    expect(matchingCourses(list, 'zzz')).toEqual([])
  })
})

describe('noTime and plannedMinutes', () => {
  const work = item({ id: 'w1', title: 'Worksheet 4', date: '2026-09-25', courseId: 'math' })

  it('is no time with no counting session', () => {
    expect(noTime(work, [], today, now)).toBe(true)
    expect(
      noTime(work, [session({ id: 'past', date: '2026-09-23', start: 600, end: 660 })], today, now),
    ).toBe(true)
  })

  it('counts future, today-not-ended, hour-less, and yesterday crossing midnight', () => {
    expect(noTime(work, [session({ id: 'hl', date: today })], today, now)).toBe(false)
    expect(noTime(work, [session({ id: 'old', date: '2026-09-23' })], today, now)).toBe(true)
    expect(noTime(work, [session({ id: 'fut', date: '2026-09-25', start: 600, end: 660 })], today, now)).toBe(false)
    expect(noTime(work, [session({ id: 'live', date: today, start: 14 * 60, end: 16 * 60 })], today, now)).toBe(false)
    expect(noTime(work, [session({ id: 'ended', date: today, start: 13 * 60, end: now })], today, now)).toBe(true)
    expect(
      noTime(work, [session({ id: 'cross', date: '2026-09-23', start: 23 * 60, end: 1440 + now + 60 })], today, now),
    ).toBe(false)
    expect(
      noTime(work, [session({ id: 'cross-done', date: '2026-09-23', start: 22 * 60, end: 24 * 60 + now })], today, now),
    ).toBe(true)
  })

  it('sums only counting timed sessions', () => {
    const sessions = [
      session({ id: 'a', date: '2026-09-25', start: 600, end: 630 }),
      session({ id: 'b', date: today, start: 900, end: 960 }),
      session({ id: 'c', date: today }),
      session({ id: 'd', date: '2026-09-20', start: 600, end: 900 }),
    ]
    expect(plannedMinutes(work, sessions, today, now)).toBe(90)
    expect(noTime(work, sessions, today, now)).toBe(false)
  })
})
