import { useStore } from '../store/store.ts'
import { errorCode, supabase } from './client.ts'
import { putModel, removeModels } from './cache.ts'
import type { Table } from './rows.ts'

export type OutboxOp =
  | { kind: 'upsert'; table: Table; id: string; row: Record<string, unknown> }
  | { kind: 'delete'; table: Exclude<Table, 'profiles'>; ids: string[] }

export interface UpsertChange {
  table: Table
  id: string
  model: unknown
  row: Record<string, unknown>
}

export interface DeleteChange {
  table: Exclude<Table, 'profiles'>
  ids: string[]
}

export interface Change {
  upserts?: UpsertChange[]
  deletes?: DeleteChange[]
}

const KEY = 'b11.outbox'
let flushing = false
let pump: number | undefined
const held = new Set<string>()

function holdKey(table: string, id: string): string {
  return `${table}:${id}`
}

/** Remember a write the moment it is committed, before the outbox is saved after paint. */
export function holdWrites(change: Change): void {
  for (const up of change.upserts ?? []) held.add(holdKey(up.table, up.id))
  for (const del of change.deletes ?? []) {
    for (const id of del.ids) held.add(holdKey(del.table, id))
  }
}

function releaseHeld(op: OutboxOp, remaining: readonly OutboxOp[]): void {
  const ids = op.kind === 'upsert' ? [op.id] : op.ids
  for (const id of ids) {
    const still = remaining.some((item) =>
      item.kind === 'upsert' ? item.table === op.table && item.id === id : item.table === op.table && item.ids.includes(id),
    )
    if (!still) held.delete(holdKey(op.table, id))
  }
}

function storage(): Storage {
  return window.localStorage
}

export function loadOutbox(): OutboxOp[] {
  try {
    const raw = storage().getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : []
  } catch {
    return []
  }
}

function saveOutbox(ops: OutboxOp[]): void {
  try {
    storage().setItem(KEY, JSON.stringify(ops))
  } catch {
    // The in-memory store already has the change. The banner shows if the send cannot happen.
  }
  const pending = new Set<string>()
  for (const op of ops) {
    if (op.kind === 'delete') for (const id of op.ids) pending.add(id)
  }
  useStore.setState({ pendingDeletes: pending })
}

export function outboxHas(table: Table, id: string): boolean {
  if (held.has(holdKey(table, id))) return true
  return loadOutbox().some((op) => {
    if (op.kind === 'upsert') return op.table === table && op.id === id
    return op.table === table && op.ids.includes(id)
  })
}

export function coalesce(prev: readonly OutboxOp[], op: OutboxOp): OutboxOp[] {
  if (op.kind === 'upsert') {
    const next = prev.filter((item) => !(item.kind === 'upsert' && item.table === op.table && item.id === op.id))
    next.push(op)
    return next
  }
  const ids = new Set(op.ids)
  const next = prev.filter((item) => {
    if (item.kind === 'upsert' && item.table === op.table && ids.has(item.id)) return false
    return true
  })
  next.push(op)
  return next
}

function sameOp(a: OutboxOp | undefined, b: OutboxOp): boolean {
  return !!a && JSON.stringify(a) === JSON.stringify(b)
}

export function stageChange(change: Change): void {
  let ops = loadOutbox()
  for (const del of change.deletes ?? []) {
    removeModels(del.table, del.ids)
    ops = coalesce(ops, { kind: 'delete', table: del.table, ids: del.ids })
  }
  for (const up of change.upserts ?? []) {
    putModel(up.table, up.id, up.model)
    ops = coalesce(ops, { kind: 'upsert', table: up.table, id: up.id, row: up.row })
  }
  saveOutbox(ops)
  ensurePump()
}

function isOffline(error: { code?: string | null; message?: string | null } | null): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (!error) return false
  return !error.code
}

function isAuth(error: { code?: string | null; status?: number | null }): boolean {
  return error.status === 401 || error.code === 'PGRST301'
}

async function send(op: OutboxOp): Promise<
  { ok: true } | { ok: false; kind: 'offline' | 'auth' | 'error'; code: string }
> {
  if (!supabase) return { ok: false, kind: 'error', code: 'config-missing' }
  if (op.kind === 'upsert') {
    const conflict = op.table === 'profiles' ? 'user_id' : 'id'
    const { error } = await supabase.from(op.table).upsert(op.row, { onConflict: conflict })
    if (!error) return { ok: true }
    if (isOffline(error)) return { ok: false, kind: 'offline', code: '' }
    if (isAuth(error)) return { ok: false, kind: 'auth', code: error.code || '401' }
    return { ok: false, kind: 'error', code: error.code || errorCode(error) }
  }
  const { error } = await supabase.from(op.table).delete().in('id', op.ids)
  if (!error) return { ok: true }
  if (isOffline(error)) return { ok: false, kind: 'offline', code: '' }
  if (isAuth(error)) return { ok: false, kind: 'auth', code: error.code || '401' }
  return { ok: false, kind: 'error', code: error.code || errorCode(error) }
}

export async function flush(): Promise<void> {
  if (flushing) return
  flushing = true
  let retriedAuth = false
  try {
    for (;;) {
      const box = loadOutbox()
      if (box.length === 0) return
      const head = box[0]
      let result: Awaited<ReturnType<typeof send>>
      try {
        result = await send(head)
      } catch (error) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          useStore.setState({ sync: { state: 'offline' } })
        } else {
          useStore.setState({ sync: { state: 'error', code: errorCode(error) } })
        }
        return
      }
      if (result.ok) {
        const current = loadOutbox()
        if (sameOp(current[0], head)) {
          const next = current.slice(1)
          saveOutbox(next)
          releaseHeld(head, next)
        }
        useStore.setState({ sync: { state: 'ok' } })
        retriedAuth = false
        continue
      }
      if (result.kind === 'auth' && !retriedAuth && supabase) {
        retriedAuth = true
        const { error } = await supabase.auth.refreshSession()
        if (!error) continue
        useStore.setState({ sync: { state: 'error', code: error.code || '401' } })
        return
      }
      if (result.kind === 'offline') {
        useStore.setState({ sync: { state: 'offline' } })
        return
      }
      useStore.setState({ sync: { state: 'error', code: result.code } })
      return
    }
  } finally {
    flushing = false
  }
}

function ensurePump(): void {
  if (pump != null) return
  if (typeof window === 'undefined') return
  const handle = window.setInterval(() => {
    if (loadOutbox().length === 0) {
      window.clearInterval(handle)
      pump = undefined
      return
    }
    void flush()
  }, 10_000)
  pump = handle
  const maybe = handle as unknown as { unref?: () => void }
  maybe.unref?.()
}
