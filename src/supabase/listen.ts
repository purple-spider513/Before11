import type { Course, Profile, Session, WorkItem } from '../model/types.ts'
import { deviceTz } from '../store/device.ts'
import { applyRemoteRemove, applyRemoteUpsert, replaceFetched } from '../store/remote.ts'
import { useStore } from '../store/store.ts'
import { errorCode, supabase } from './client.ts'
import { isCacheFilled, markCacheFilled, modelFromRemote } from './cache.ts'
import { enqueueWrite } from './write.ts'
import { flush, outboxHas } from './outbox.ts'
import { profileToDb } from './rows.ts'

const TABLES = ['courses', 'work_items', 'sessions', 'profiles'] as const
let channelSeq = 0

function offlineError(error: { code?: string | null } | null): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return !error?.code
}

async function refetchAll(uid: string): Promise<void> {
  if (!supabase) return
  const client = supabase
  const [coursesRes, workRes, sessionsRes, profileRes] = await Promise.all([
    client.from('courses').select('*'),
    client.from('work_items').select('*'),
    client.from('sessions').select('*'),
    client.from('profiles').select('*'),
  ])
  const failed = [coursesRes.error, workRes.error, sessionsRes.error, profileRes.error].find(Boolean)
  if (failed) {
    useStore.setState({
      sync: offlineError(failed) ? { state: 'offline' } : { state: 'error', code: failed.code || errorCode(failed) },
    })
    return
  }
  const profileRows = (profileRes.data ?? []) as Record<string, unknown>[]
  const profile = profileRows.length > 0 ? (modelFromRemote('profiles', profileRows[0]) as Profile) : null
  replaceFetched({
    courses: ((coursesRes.data ?? []) as Record<string, unknown>[]).map((row) => modelFromRemote('courses', row) as Course),
    workItems: ((workRes.data ?? []) as Record<string, unknown>[]).map(
      (row) => modelFromRemote('work_items', row) as WorkItem,
    ),
    sessions: ((sessionsRes.data ?? []) as Record<string, unknown>[]).map(
      (row) => modelFromRemote('sessions', row) as Session,
    ),
    profile,
    userId: uid,
  })
  if (!profile && !outboxHas('profiles', uid) && !useStore.getState().profile) {
    const created: Profile = { tz: deviceTz(), createdAt: Date.now() }
    useStore.setState({ profile: created })
    void enqueueWrite({
      upserts: [{ table: 'profiles', id: uid, model: created, row: profileToDb(created, uid) }],
    })
  }
  if (!isCacheFilled()) markCacheFilled()
  const sync = useStore.getState().sync
  if (sync.state !== 'error') useStore.setState({ sync: { state: 'ok' } })
}

function startFallback(
  setPolling: () => void,
  already: () => boolean,
): void {
  if (already()) return
  setPolling()
}

export function startSync(uid: string): () => void {
  if (!supabase) return () => {}
  const client = supabase
  let stopped = false
  let polling = false
  let pollTimer: number | undefined
  let startupTimer: number | undefined

  const refetch = () => {
    void refetchAll(uid)
  }

  const beginFallback = () => {
    startFallback(
      () => {
        polling = true
        useStore.setState({ transport: 'polling' })
        pollTimer = window.setInterval(refetch, 10_000)
      },
      () => polling,
    )
  }

  const channel = client.channel(`b11-data-${++channelSeq}`)
  for (const table of TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${uid}` },
      (payload) => {
        if (stopped) return
        const event = payload as unknown as {
          eventType: string
          new: Record<string, unknown>
          old: Record<string, unknown>
        }
        if (event.eventType === 'DELETE') {
          const id = table === 'profiles' ? String(event.old.user_id ?? uid) : String(event.old.id ?? '')
          if (id) applyRemoteRemove(table, id)
          return
        }
        const model = modelFromRemote(table, event.new)
        const id = table === 'profiles' ? uid : String((model as { id: string }).id)
        applyRemoteUpsert(table, model, id)
      },
    )
  }

  startupTimer = window.setTimeout(beginFallback, 10_000)
  channel.subscribe((status) => {
    if (stopped) return
    if (status === 'SUBSCRIBED') {
      window.clearTimeout(startupTimer)
      if (polling) {
        window.clearInterval(pollTimer)
        polling = false
      }
      useStore.setState({ transport: 'realtime' })
      refetch()
      void flush()
      return
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') beginFallback()
  })

  const onOnline = () => {
    refetch()
    void flush()
  }
  const onOffline = () => {
    useStore.setState({ sync: { state: 'offline' } })
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') refetch()
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  refetch()

  return () => {
    stopped = true
    window.clearTimeout(startupTimer)
    window.clearInterval(pollTimer)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    void client.removeChannel(channel)
  }
}
