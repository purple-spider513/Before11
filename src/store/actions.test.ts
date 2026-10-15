import { beforeEach, describe, expect, it } from 'vitest'
import { groupUnfinished } from '../model/list.ts'
import type { Course } from '../model/types.ts'
import { completeWorkItem, createLinked, saveEdit, submitAdd } from './actions.ts'
import { useStore } from './store.ts'

const today = '2026-10-15'

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
      createName: 'English',
    })
    const items = Object.values(useStore.getState().workItems)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'task',
      courseId: null,
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      completedAt: null,
    })
    expect(useStore.getState().courses).toEqual({})
    expect(useStore.getState().addOpen).toBe(false)

    const before = useStore.getState().workItems
    submitAdd({ kind: 'homework', title: 'Worksheet', date: '2026-10-16', course: null, createName: null })
    expect(useStore.getState().workItems).toBe(before)
  })

  it('keeps a dragged task unfinished, and checking it off removes it from the list', () => {
    submitAdd({
      kind: 'task',
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      course: null,
      createName: null,
    })
    const item = Object.values(useStore.getState().workItems)[0]
    createLinked({ workItemId: item.id, date: today, start: 600, end: 660, disarm: false })
    expect(useStore.getState().workItems[item.id].completedAt).toBeNull()
    expect(Object.values(useStore.getState().sessions).map((session) => session.workItemId)).toEqual([item.id])

    completeWorkItem(item.id)
    expect(useStore.getState().workItems[item.id].completedAt).toBe(today)
    const groups = groupUnfinished(Object.values(useStore.getState().workItems), {}, today)
    expect(groups.tomorrow).toEqual([])
  })

  it('drops the course when homework is changed into a task', () => {
    const course: Course = {
      id: 'math',
      name: 'Math',
      color: 'blue',
      createdAt: 1,
      updatedAt: 1,
      updatedBy: 'test',
    }
    useStore.setState({ courses: { math: course } })
    submitAdd({
      kind: 'homework',
      title: 'Worksheet',
      date: '2026-10-16',
      course,
      createName: null,
    })
    const homework = Object.values(useStore.getState().workItems)[0]
    expect(homework.courseId).toBe('math')
    const ok = saveEdit({
      id: homework.id,
      kind: 'task',
      title: 'Remember to send email to teacher',
      date: '2026-10-16',
      course,
      createName: null,
      color: 'blue',
      estimate: null,
    })
    expect(ok).toBe(true)
    expect(useStore.getState().workItems[homework.id]).toMatchObject({
      kind: 'task',
      courseId: null,
      title: 'Remember to send email to teacher',
    })
    expect(useStore.getState().courses.math.name).toBe('Math')
  })
})
