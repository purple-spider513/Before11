import { headerLabel, stepWord } from '../model/range.ts'
import { groupUnfinished } from '../model/list.ts'
import { goToday, setView, stepRange, toggleList } from '../store/actions.ts'
import { useStore } from '../store/store.ts'
import { hideTooltip, showTooltip } from './Tooltip.tsx'
import { StatusSlot } from './StatusSlot.tsx'
import styles from './Header.module.css'
import type { View } from '../model/types.ts'

const VIEWS: { id: View; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: '3day', label: '3 days' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function Header() {
  const view = useStore((s) => s.view)
  const anchor = useStore((s) => s.anchor)
  const collapsed = useStore((s) => s.listCollapsed)
  const today = useStore((s) => s.today)
  const items = useStore((s) => s.workItems)
  const courses = useStore((s) => s.courses)
  const groups = groupUnfinished(Object.values(items), courses, today)
  const unfinished = groups.overdue.length + groups.tonight.length + groups.tomorrow.length + groups.later.length
  const overdue = groups.overdue.length
  const word = stepWord(view)
  const label = headerLabel(view, anchor)

  return (
    <header className={styles.header}>
      <button type="button" className="btn" aria-expanded={!collapsed} onClick={() => toggleList()}>
        {collapsed ? (
          <>
            Show list · <span className={overdue ? styles.overdue : undefined}>{unfinished}</span>
          </>
        ) : (
          'Hide list'
        )}
      </button>
      <button type="button" className="btn" onClick={() => goToday()}>
        Today
      </button>
      <button
        type="button"
        className={styles.step}
        aria-label={`Previous ${word}`}
        onPointerEnter={(e) => showTooltip(e.currentTarget, `Previous ${word}`)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget, `Previous ${word}`)}
        onBlur={hideTooltip}
        onClick={() => stepRange(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.step}
        aria-label={`Next ${word}`}
        onPointerEnter={(e) => showTooltip(e.currentTarget, `Next ${word}`)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget, `Next ${word}`)}
        onBlur={hideTooltip}
        onClick={() => stepRange(1)}
      >
        ›
      </button>
      <div className={`${styles.range} nums`}>{label}</div>
      <div className={styles.spacer} />
      <StatusSlot />
      <div className="seg" role="group" aria-label="View">
        {VIEWS.map((item) => (
          <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </header>
  )
}
