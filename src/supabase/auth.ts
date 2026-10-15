import { codedError, supabase } from './client.ts'

export interface AuthUser {
  id: string
  email: string
}

/** The user from the stored session, read synchronously so frame 0 can paint signed in. */
export function cachedUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem('b11.auth')
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('user' in parsed)) return null
    const user = (parsed as { user: unknown }).user
    if (typeof user !== 'object' || user === null) return null
    const { id, email } = user as { id?: unknown; email?: unknown }
    if (typeof id !== 'string' || typeof email !== 'string') return null
    return { id, email }
  } catch {
    return null
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw codedError('config-missing')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onUser(cb: (user: AuthUser | null) => void): () => void {
  if (!supabase) {
    cb(null)
    return () => {}
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    cb(user ? { id: user.id, email: user.email ?? '' } : null)
  })
  return () => data.subscription.unsubscribe()
}
