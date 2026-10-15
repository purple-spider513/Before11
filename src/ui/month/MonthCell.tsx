import { dayOf, monthShort } from '../../model/dates.ts'
import type { DateStr } from '../../model/types.ts'
import { createLinked, openWorkItem } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { hideTooltip, showTooltip } from '../Tooltip.tsx'
import { monthChips, type MonthChip } from '../grid/dayMarks.ts'
import { downChip } from '../grid/gesture/controller.ts'
import { registerCell } from './rest.ts'
import styles from './MonthCell.module.css'

export function MonthCell({ date, cellH, inMonth }: { date: DateStr; cellH: number; inMonth: boolean }) {
  const workItems = useStore((s) => s.workItems)
  const sessions = useStore((s) => s.sessions)
  const courses = useStore((s) => s.courses)
  const today = useStore((s) => s.today)
  const open = useStore((s) => s.monthOverlayDate === date)
  const armed = useStore((s) => s.armed)
  const items = monthChips(date, workItems, sessions, courses)
  const capacity = Math.floor((cellH - 8 - 20) / 20)
  const shown = capacity <= 0 ? [] : items.length <= capacity ? items : items.slice(0, Math.max(0, capacity - 1))
  const hidden = items.slice(shown.length)
  const day = dayOf(date)
  const label = day === 1 ? `${monthShort(date)} ${day}` : String(day)

  return (
    <div
      data-month-cell={date}
      ref={(el) => registerCell(date, el)}
      className={open ? `${styles.cell} ${styles.open} ${armed ? styles.copy : ''}` : armed ? `${styles.cell} ${styles.copy}` : styles.cell}
      onClick={() => {
        const current = useStore.getState().armed
        if (current?.kind === 'workItem') {
          createLinked({ workItemId: current.workItemId, date, start: null, end: null, disarm: true })
        }
      }}
    >
      <div className={date === today ? styles.today : inMonth ? styles.num : styles.other}>{label}</div>
      {shown.map((item) => (
        <Chip key={item.id} item={item} armed={armed?.kind === 'chip' && armed.sessionId === item.sessionId} />
      ))}
      {hidden.length > 0 ? (
        <div
          className={styles.more}
          tabIndex={0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={(e) => showTooltip(e.currentTarget, hidden.map((item) => item.tip).join('\n'))}
          onPointerLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget, hidden.map((item) => item.tip).join('\n'))}
          onBlur={hideTooltip}
        >
          +{hidden.length} more
        </div>
      ) : null}
    </div>
  )
}

function Chip({ item, armed }: { item: MonthChip; armed: boolean }) {
  const tip = (el: HTMLElement) => {
    if (el.scrollWidth > el.clientWidth) showTooltip(el, item.tip)
  }
  if (item.kind === 'exam') {
    return (
      <button
        type="button"
        className={styles.exam}
        style={{ background: item.fill }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          if (item.workItemId) openWorkItem(item.workItemId)
        }}
        onPointerEnter={(e) => tip(e.currentTarget)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => tip(e.currentTarget)}
        onBlur={hideTooltip}
      >
        {item.label}
      </button>
    )
  }
  if (item.kind === 'chip') {
    return (
      <div
        className={armed ? `${styles.chip} ${styles.chipOn}` : styles.chip}
        style={{ borderColor: item.outline ?? undefined }}
        tabIndex={0}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (item.sessionId) downChip(e, item.sessionId)
        }}
        onPointerEnter={(e) => tip(e.currentTarget)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => tip(e.currentTarget)}
        onBlur={hideTooltip}
      >
        {item.label}
      </div>
    )
  }
  return (
    <div
      className={styles.timed}
      style={{ background: item.fill }}
      onPointerEnter={(e) => tip(e.currentTarget)}
      onPointerLeave={hideTooltip}
    >
      {item.label}
    </div>
  )
}
