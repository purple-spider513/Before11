import { dayOf, weekdayLong, weekdayShort } from '../../model/dates.ts'
import type { DateStr, View } from '../../model/types.ts'
import { useStore } from '../../store/store.ts'
import styles from './DayHeaderRow.module.css'

export function DayHeaderRow({ dates, view, pad }: { dates: DateStr[]; view: View; pad: number }) {
  const today = useStore((s) => s.today)
  return (
    <div className={styles.row} style={{ paddingRight: pad }}>
      <div className={styles.gutter} />
      {dates.map((date) => {
        const day = dayOf(date)
        const name = view === 'day' ? weekdayLong(date) : weekdayShort(date)
        const isToday = date === today
        return (
          <div key={date} className={styles.cell}>
            <span className={styles.name}>{name}</span>{' '}
            <span className={isToday ? styles.today : styles.num}>{day}</span>
          </div>
        )
      })}
    </div>
  )
}
