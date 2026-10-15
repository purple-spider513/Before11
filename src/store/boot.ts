import { cachedUser } from '../supabase/auth.ts'
import { isCacheFilled, loadAll } from '../supabase/cache.ts'
import { useStore } from './store.ts'

export function bootStore(): void {
  const snap = loadAll()
  const filled = isCacheFilled()
  useStore.setState({
    courses: snap.courses,
    workItems: snap.workItems,
    sessions: snap.sessions,
    profile: snap.profile,
    loaded: filled
      ? { courses: true, workItems: true, sessions: true }
      : { courses: false, workItems: false, sessions: false },
    user: cachedUser(),
  })
}
