import { dismissToast, undo } from '../store/actions.ts'
import { useStore } from '../store/store.ts'
import styles from './Toast.module.css'

export function Toast() {
  const toast = useStore((s) => s.toast)
  const collapsed = useStore((s) => s.listCollapsed)
  if (!toast?.text) return null
  const left = collapsed ? '50%' : 'calc(var(--list-w) + (100% - var(--list-w)) / 2)'
  return (
    <div className={styles.toast} style={{ left }} role="status">
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
  )
}
