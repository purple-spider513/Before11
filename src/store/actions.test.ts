import { beforeEach, describe, expect, it } from 'vitest'
import { groupUnfinished } from '../model/list.ts'
import type { Course } from '../model/types.ts'
import { addCourse, completeWorkItem, createLinked, parseEstimate, saveEdit, submitAdd } from './actions.ts'
import { useStore } from './store.ts'

const today = '2026-10-15'

const math: Course = {
  id: 'math',
  name: 'Math',
  color: 'blue',
  createdAt: 1,
  updatedAt: 1,
  updatedBy: 'test',
}

beforeEach(() => {
  useStore.setState({
    courses: {},
    workItems: {},
    sessions: {},
    user: { id: 'user-1', email: 'm@example.com' },
    today,
    addOpen: true,
    editingWorkItemId: null,
    armed: null,
  })
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame
})

describe('task work items', () => {
  it('adds a task with no course on the same turn, and leaves homework unchanged', () => {
    submitAdd({
      kind: 'task',
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      course: null,
      estimate: null,
      importance: null,
    })
    const items = Object.values(useStore.getState().workItems)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'task',
      courseId: null,
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      completedAt: null,
      estimateMinutes: null,
      importance: null,
    })
    expect(useStore.getState().courses).toEqual({})
    expect(useStore.getState().addOpen).toBe(false)

    const before = useStore.getState().workItems
    submitAdd({
      kind: 'homework',
      title: 'Worksheet',
      date: '2026-10-16',
      course: null,
      estimate: null,
      importance: null,
    })
    expect(useStore.getState().workItems).toBe(before)
  })

  it('keeps a dragged task unfinished, and checking it off removes it from the list', () => {
    submitAdd({
      kind: 'task',
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      course: null,
      estimate: 15,
      importance: 'low',
    })
    const item = Object.values(useStore.getState().workItems)[0]
    expect(item.estimateMinutes).toBe(15)
    expect(item.importance).toBe('low')
    createLinked({ workItemId: item.id, date: today, start: 600, end: 660, disarm: false })
    expect(useStore.getState().workItems[item.id].completedAt).toBeNull()
    expect(Object.values(useStore.getState().sessions).map((session) => session.workItemId)).toEqual([item.id])

    completeWorkItem(item.id)
    expect(useStore.getState().workItems[item.id].completedAt).toBe(today)
    const groups = groupUnfinished(Object.values(useStore.getState().workItems), {}, today)
    expect(groups.tomorrow).toEqual([])
  })

  it('keeps an undated task on the list, and dragging it does not complete it', () => {
    submitAdd({
      kind: 'task',
      title: 'Buy paper',
      date: null,
      course: null,
      estimate: null,
      importance: null,
    })
    const item = Object.values(useStore.getState().workItems)[0]
    expect(item.date).toBeNull()
    let groups = groupUnfinished(Object.values(useStore.getState().workItems), {}, today)
    expect(groups.undated.map((row) => row.id)).toEqual([item.id])
    expect(groups.later).toEqual([])

    createLinked({ workItemId: item.id, date: today, start: 600, end: 660, disarm: false })
    expect(useStore.getState().workItems[item.id].completedAt).toBeNull()
    expect(useStore.getState().workItems[item.id].date).toBeNull()

    completeWorkItem(item.id)
    groups = groupUnfinished(Object.values(useStore.getState().workItems), {}, today)
    expect(groups.undated).toEqual([])
  })

  it('clears a task date and stores how long without a course', () => {
    submitAdd({
      kind: 'task',
      title: 'Email teacher',
      date: '2026-10-16',
      course: null,
      estimate: 20,
      importance: 'high',
    })
    const task = Object.values(useStore.getState().workItems)[0]
    const ok = saveEdit({
      id: task.id,
      kind: 'task',
      title: 'Email teacher',
      date: null,
      course: null,
      color: 'blue',
      estimate: null,
      importance: null,
    })
    expect(ok).toBe(true)
    expect(useStore.getState().workItems[task.id]).toMatchObject({
      date: null,
      courseId: null,
      estimateMinutes: null,
      importance: null,
    })
  })

  it('drops the course when homework is changed into a task', () => {
    useStore.setState({ courses: { math } })
    submitAdd({
      kind: 'homework',
      title: 'Worksheet',
      date: '2026-10-16',
      course: math,
      estimate: 30,
      importance: 'high',
    })
    const homework = Object.values(useStore.getState().workItems)[0]
    expect(homework).toMatchObject({ courseId: 'math', estimateMinutes: 30, importance: 'high' })
    const ok = saveEdit({
      id: homework.id,
      kind: 'task',
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      course: math,
      color: 'blue',
      estimate: 30,
      importance: 'high',
    })
    expect(ok).toBe(true)
    expect(useStore.getState().workItems[homework.id]).toMatchObject({
      kind: 'task',
      courseId: null,
      title: 'Remember to send email to teacher',
      estimateMinutes: 30,
      importance: 'high',
    })
    expect(useStore.getState().courses.math.name).toBe('Math')
  })

  it('requires an existing course and a date for homework and exams', () => {
    useStore.setState({ courses: { math } })
    submitAdd({
      kind: 'homework',
      title: 'Worksheet',
      date: null,
      course: math,
      estimate: 30,
      importance: null,
    })
    submitAdd({
      kind: 'exam',
      title: 'Quiz',
      date: '2026-10-16',
      course: null,
      estimate: 45,
      importance: 'low',
    })
    expect(useStore.getState().workItems).toEqual({})
    expect(Object.keys(useStore.getState().courses)).toEqual(['math'])

    submitAdd({
      kind: 'homework',
      title: 'Worksheet',
      date: '2026-10-16',
      course: math,
      estimate: 30,
      importance: 'high',
    })
    const homework = Object.values(useStore.getState().workItems)[0]
    expect(homework).toMatchObject({ kind: 'homework', estimateMinutes: 30, importance: 'high', date: '2026-10-16' })

    submitAdd({
      kind: 'exam',
      title: 'Quiz',
      date: '2026-10-20',
      course: math,
      estimate: 45,
      importance: null,
    })
    const exam = Object.values(useStore.getState().workItems).find((row) => row.kind === 'exam')
    expect(exam).toMatchObject({ estimateMinutes: null, importance: null, courseId: 'math' })

    const missed = saveEdit({
      id: homework.id,
      kind: 'homework',
      title: 'Worksheet',
      date: '2026-10-16',
      course: null,
      color: 'blue',
      estimate: 30,
      importance: 'high',
    })
    expect(missed).toBe(false)
    expect(useStore.getState().workItems[homework.id].courseId).toBe('math')

    const cleared = saveEdit({
      id: homework.id,
      kind: 'exam',
      title: 'Quiz',
      date: null,
      course: math,
      color: 'blue',
      estimate: 45,
      importance: 'low',
    })
    expect(cleared).toBe(false)
    expect(useStore.getState().workItems[homework.id].kind).toBe('homework')
  })
})

describe('courses and estimates', () => {
  it('adds a course with the next palette color and rejects a duplicate name', () => {
    expect(addCourse('Multivariable and Vector Calculus')).toBe(true)
    const first = Object.values(useStore.getState().courses)[0]
    expect(first).toMatchObject({ name: 'Multivariable and Vector Calculus', color: 'violet' })
    expect(addCourse('multivariable and vector calculus')).toBe(false)
    expect(Object.values(useStore.getState().courses)).toHaveLength(1)
    expect(addCourse('English')).toBe(true)
    const english = Object.values(useStore.getState().courses).find((course) => course.name === 'English')
    expect(english?.color).toBe('blue')
  })

  it('rounds how long to a 5-minute step between 5 and 1440', () => {
    expect(parseEstimate('')).toBeNull()
    expect(parseEstimate('   ')).toBeNull()
    expect(parseEstimate('25')).toBe(25)
    expect(parseEstimate('7')).toBe(5)
    expect(parseEstimate('3')).toBe(5)
    expect(parseEstimate('2000')).toBe(1440)
  })
})
