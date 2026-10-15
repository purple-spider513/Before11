import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase-config.ts'

export const configMissing = SUPABASE_URL === '' || SUPABASE_ANON_KEY === ''

export const supabase = configMissing
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'b11.auth',
        storage: window.localStorage,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })

export function errorCode(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    if ('code' in e) {
      const code = (e as { code: unknown }).code
      if (typeof code === 'string' && code.length > 0) return code
    }
    if ('status' in e) {
      const status = (e as { status: unknown }).status
      if (typeof status === 'number' && status > 0) return String(status)
    }
    if ('message' in e) {
      const message = (e as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return 'unknown'
}

export function codedError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}
