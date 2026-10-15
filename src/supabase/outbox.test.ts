import { beforeEach, describe, expect, it } from 'vitest'
import { coalesce, holdWrites, loadOutbox, outboxHas, stageChange, type OutboxOp } from './outbox.ts'

beforeEach(() => {
  localStorage.clear()
})

describe('outbox coalescing', () => {
  it('replaces an earlier upsert of the same row and keeps the latest in localStorage', () => {
    const first: OutboxOp = { kind: 'upsert', table: 'courses', id: 'c1', row: { id: 'c1', name: 'Math' } }
    const second: OutboxOp = { kind: 'upsert', table: 'courses', id: 'c1', row: { id: 'c1', name: 'Algebra' } }
    const other: OutboxOp = { kind: 'upsert', table: 'courses', id: 'c2', row: { id: 'c2', name: 'Art' } }
    expect(coalesce(coalesce([], first), other).map((op) => (op.kind === 'upsert' ? op.id : ''))).toEqual(['c1', 'c2'])
    expect(coalesce(coalesce([first, other], second), second)).toEqual([other, second])

    stageChange({
      upserts: [
        { table: 'courses', id: 'c1', model: { id: 'c1', name: 'Math' }, row: { id: 'c1', name: 'Math' } },
      ],
    })
    stageChange({
      upserts: [
        { table: 'courses', id: 'c1', model: { id: 'c1', name: 'Algebra' }, row: { id: 'c1', name: 'Algebra' } },
      ],
    })
    const stored = loadOutbox()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ kind: 'upsert', id: 'c1' })
    expect(JSON.parse(localStorage.getItem('b11.row.courses.c1') ?? '{}')).toMatchObject({ name: 'Algebra' })
  })

  it('drops pending upserts for ids a delete removes', () => {
    const upsert: OutboxOp = { kind: 'upsert', table: 'sessions', id: 's1', row: { id: 's1' } }
    const keep: OutboxOp = { kind: 'upsert', table: 'sessions', id: 's2', row: { id: 's2' } }
    const del: OutboxOp = { kind: 'delete', table: 'sessions', ids: ['s1'] }
    expect(coalesce([upsert, keep], del)).toEqual([keep, del])

    stageChange({
      upserts: [{ table: 'work_items', id: 'w1', model: { id: 'w1' }, row: { id: 'w1' } }],
    })
    stageChange({ deletes: [{ table: 'work_items', ids: ['w1'] }] })
    expect(loadOutbox()).toEqual([{ kind: 'delete', table: 'work_items', ids: ['w1'] }])
    expect(localStorage.getItem('b11.row.work_items.w1')).toBeNull()
  })

  it('treats a write as pending the moment it is held, before the outbox is saved', () => {
    expect(outboxHas('work_items', 'w-held')).toBe(false)
    holdWrites({
      upserts: [{ table: 'work_items', id: 'w-held', model: { id: 'w-held' }, row: { id: 'w-held' } }],
    })
    expect(outboxHas('work_items', 'w-held')).toBe(true)
    expect(loadOutbox()).toEqual([])
  })
})
