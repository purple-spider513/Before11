import { formatGutterHour } from '../../model/minutes.ts'
import { minuteToPx } from './gesture/geometry.ts'
import styles from './TimeGutter.module.css'

export function TimeGutter({ width = 48 }: { width?: number }) {
  const hours = []
  for (let hour = 1; hour <= 23; hour++) hours.push(hour)
  return (
    <div className={styles.gutter} style={{ width }}>
      {hours.map((hour) => (
        <div key={hour} className={styles.hour} style={{ top: minuteToPx(hour * 60) }}>
          {formatGutterHour(hour)}
        </div>
      ))}
    </div>
  )
}
