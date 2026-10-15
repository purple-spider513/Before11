import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { Probe } from './probe/Probe.tsx'
import { bootStore } from './store/boot.ts'
import { startClock } from './store/clock.ts'
import { useStore } from './store/store.ts'
import { onUser } from './supabase/auth.ts'
import { startSync } from './supabase/listen.ts'
import { App } from './ui/App.tsx'

bootStore()
startClock()

let stopSync = () => {}
onUser((user) => {
  useStore.setState({ user })
  stopSync()
  stopSync = user ? startSync(user.id) : () => {}
})

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function Root() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '')
  if (hash === '#probe') return <Probe />
  return <App />
}

const root = document.getElementById('root')
if (!root) throw new Error('root missing')

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
