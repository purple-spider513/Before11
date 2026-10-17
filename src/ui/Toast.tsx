import { useState } from 'react'
import { dismissToast, undo } from '../store/actions.ts'
import { useStore } from '../store/store.ts'
import { motionOn } from './motion.ts'
import styles from './Toast.module.css'

export function Toast() {
  const toast = useStore((s) => s.toast)
  const collapsed = useStore((s) => s.listCollapsed)
  const [enterId, setEnterId] = useState<number | null>(null)
  if (!toast?.text) {
    if (enterId != null) setEnterId(null)
    return null
  }
  if (enterId == null && motionOn()) setEnterId(toast.id)
  const enter = enterId === toast.id
  const left = collapsed ? '50%' : 'calc(var(--list-w) + (100% - var(--list-w)) / 2)'
  return (
    <div className={styles.place} style={{ left }}>
    <div className={enter ? `${styles.toast} ${styles.in}` : styles.toast} role="status" data-toast="">
      <span className={styles.text}>{toast.text}</span>
      <button
        type="button"
        className={styles.undo}
        onClick={() => {
          undo()
          dismissToast()
        }}
      >
        Undo
      </button>
    </div>
    </div>
  )
}
