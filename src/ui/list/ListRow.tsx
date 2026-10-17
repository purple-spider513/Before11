import { noTime, plannedMinutes, rowDateText } from '../../model/list.ts'
import { swatch } from '../../model/palette.ts'
import { courseById, type WorkItem } from '../../model/types.ts'
import { completeWorkItem } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { takeElement } from '../depart.ts'
import { downList } from '../grid/gesture/controller.ts'
import { useHeld } from '../motion.ts'
import styles from './ListRow.module.css'

export function ListRow({ item }: { item: WorkItem }) {
  const held = useHeld(item.id)
  const course = useStore((s) => courseById(s.courses, item.courseId))
  const sessions = useStore((s) => s.sessions)
  const today = useStore((s) => s.today)
  const now = useStore((s) => s.nowMinute)
  const list = Object.values(sessions)
  const planned = plannedMinutes(item, list, today, now)
  const hasEstimate = item.estimateMinutes != null
  const dateText = rowDateText(item, today)

  return (
    <div
      className={held ? `${styles.row} ${styles.held}` : styles.row}
      data-list-row=""
      onPointerDown={(e) => downList(e, item.id)}
    >
      <button
        type="button"
        className={styles.check}
        role="checkbox"
        aria-checked="false"
        aria-label={`Mark ${item.title} done`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          const row = e.currentTarget.closest('[data-list-row]')
          if (row instanceof HTMLElement) {
            takeElement(row, 'settle', {}, (node) => {
              node.querySelector('[data-box]')?.classList.add(styles.filled)
            })
          }
          completeWorkItem(item.id)
        }}
      >
        <span className={styles.box} data-box="" />
      </button>
      <div className={styles.body}>
        <div className={styles.title}>{item.title}</div>
        <div className={styles.meta}>
          <div className={styles.left}>
            {course ? (
              <>
                <span className={styles.course} style={{ color: swatch(course.color).text }}>
                  {course.name}
                </span>
                <span> · </span>
              </>
            ) : null}
            <span className={item.date != null && item.date < today ? styles.overdue : undefined}>{dateText}</span>
          </div>
          <div className={styles.right}>
            {hasEstimate ? (
              <>
                {planned < (item.estimateMinutes ?? 0) ? <span className={styles.strong}>{planned}</span> : planned}
                {` of ${item.estimateMinutes} min planned`}
              </>
            ) : noTime(item, list, today, now) ? (
              <span className={styles.strong}>no time</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
