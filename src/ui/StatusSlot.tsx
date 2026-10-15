import { useEffect, useState } from 'react'
import { deviceTz } from '../store/device.ts'
import { useStore } from '../store/store.ts'
import styles from './StatusSlot.module.css'

export function StatusSlot() {
  const armed = useStore((s) => s.armed)
  const firstClick = useStore((s) => s.firstClick)
  const sync = useStore((s) => s.sync)
  const view = useStore((s) => s.view)
  const profile = useStore((s) => s.profile)
  const work = useStore((s) =>
    armed?.kind === 'workItem'
      ? s.workItems[armed.workItemId]
      : armed?.kind === 'chip'
        ? s.sessions[armed.sessionId]
        : undefined,
  )
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  let text = ''
  let kind: 'armed' | 'plain' = 'plain'
  if (armed?.kind === 'workItem' && work && 'courseId' in work) {
    const course = useStore.getState().courses[work.courseId]
    const place = view === 'month' ? 'date' : 'hour'
    text = `Click ${place === 'date' ? 'a date' : 'an hour'} to place ${course?.name ?? ''} · ${work.title}. Esc cancels.`
    kind = 'armed'
  } else if (armed?.kind === 'chip' && work && 'workItemId' in work && work.workItemId) {
    const item = useStore.getState().workItems[work.workItemId]
    const course = item ? useStore.getState().courses[item.courseId] : undefined
    text = `Click an hour to set a time for ${course?.name ?? ''} · ${item?.title ?? ''}. Esc cancels.`
    kind = 'armed'
  } else if (firstClick) {
    text = 'Click again to set the end. Esc cancels.'
  } else if (sync.state === 'error' && online) {
    text = `Not syncing (${sync.code ?? 'error'}). Your changes are kept on this computer.`
  } else if (!online || sync.state === 'offline') {
    text = 'Offline. Changes are saved here and will sync when you reconnect.'
  } else if (profile && profile.tz !== deviceTz()) {
    text = `This computer's clock is in ${deviceTz()}; the planner was set up in ${profile.tz}. Times are not shifted.`
  }
  if (!text) return null
  return <div className={kind === 'armed' ? styles.armed : styles.pill}>{text}</div>
}
