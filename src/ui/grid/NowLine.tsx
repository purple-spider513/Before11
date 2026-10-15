import { minuteToPx } from './gesture/geometry.ts'
import styles from './NowLine.module.css'

export function NowLine({ minute }: { minute: number }) {
  return (
    <div className={styles.line} style={{ top: minuteToPx(minute) - 1 }}>
      <span className={styles.dot} />
    </div>
  )
}
