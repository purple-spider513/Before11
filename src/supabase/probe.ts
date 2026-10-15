import { codedError, errorCode, supabase } from './client.ts'

export type ProbeSource = 'cache' | 'server' | 'realtime'

export type ProbeTransport =
  | { kind: 'connecting' }
  | { kind: 'realtime' }
  | { kind: 'polling'; status: string }

export interface ProbeHandlers {
  onValue: (text: string, source: Exclude<ProbeSource, 'cache'>) => void
  onTransport: (transport: ProbeTransport) => void
  onLog: (entry: string) => void
  onError: (code: string) => void
}

const POLL_MS = 10_000
const SUBSCRIBE_DEADLINE_MS = 10_000
const LAST_KEY = 'b11.probe.last'

let channelSeq = 0

export async function fetchProbeLine(uid: string): Promise<string | null> {
  if (!supabase) throw codedError('config-missing')
  const { data, error } = await supabase
    .from('probe_lines')
    .select('text, written_at')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw error
  return data && typeof data.text === 'string' ? data.text : null
}

export async function writeProbeLine(uid: string, text: string): Promise<void> {
  if (!supabase) throw codedError('config-missing')
  const { error } = await supabase.from('probe_lines').upsert(
    { user_id: uid, text, written_at: Date.now(), device: navigator.userAgent },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

export function readCachedLine(): { text: string; receivedAt: string } | null {
  try {
    const raw = window.localStorage.getItem(LAST_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { text, receivedAt } = parsed as { text?: unknown; receivedAt?: unknown }
    if (typeof text !== 'string' || typeof receivedAt !== 'string') return null
    return { text, receivedAt }
  } catch {
    return null
  }
}

export function saveCachedLine(text: string, receivedAt: string): void {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify({ text, receivedAt }))
  } catch {
    // Storage line on the probe already reports a broken localStorage.
  }
}

export function checkLocalStorage(): string | null {
  try {
    window.localStorage.setItem('b11.probe.check', '1')
    const back = window.localStorage.getItem('b11.probe.check')
    window.localStorage.removeItem('b11.probe.check')
    return back === '1' ? null : 'read-back mismatch'
  } catch (e) {
    return errorCode(e)
  }
}

/**
 * Realtime first. If the channel does not reach SUBSCRIBED within 10s, or reports
 * CHANNEL_ERROR / TIMED_OUT / CLOSED, refetch every 10s until SUBSCRIBED arrives.
 */
export function watchProbeLine(uid: string, h: ProbeHandlers): () => void {
  if (!supabase) return () => {}
  const client = supabase
  let stopped = false
  let polling = false
  let pollTimer: number | undefined

  const refetch = () => {
    fetchProbeLine(uid)
      .then((text) => {
        if (!stopped && text !== null) h.onValue(text, 'server')
      })
      .catch((e) => {
        if (!stopped) h.onError(errorCode(e))
      })
  }

  const startFallback = (status: string) => {
    if (polling) return
    polling = true
    h.onTransport({ kind: 'polling', status })
    h.onLog('fallback started')
    pollTimer = window.setInterval(refetch, POLL_MS)
  }

  const channel = client
    .channel(`b11-probe-${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'probe_lines', filter: `user_id=eq.${uid}` },
      (payload) => {
        if (stopped || payload.eventType === 'DELETE') return
        const row = payload.new as { text?: unknown }
        if (typeof row.text === 'string') h.onValue(row.text, 'realtime')
      },
    )

  const startupTimer = window.setTimeout(
    () => startFallback('not subscribed after 10s'),
    SUBSCRIBE_DEADLINE_MS,
  )

  h.onTransport({ kind: 'connecting' })
  channel.subscribe((status) => {
    if (stopped) return
    h.onLog(status)
    if (status === 'SUBSCRIBED') {
      window.clearTimeout(startupTimer)
      if (polling) {
        window.clearInterval(pollTimer)
        polling = false
        h.onLog('fallback stopped')
      }
      h.onTransport({ kind: 'realtime' })
      refetch()
    } else {
      startFallback(status)
    }
  })

  refetch()

  return () => {
    stopped = true
    window.clearTimeout(startupTimer)
    window.clearInterval(pollTimer)
    void client.removeChannel(channel)
  }
}
