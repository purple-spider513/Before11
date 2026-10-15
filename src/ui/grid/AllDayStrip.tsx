import type { DateStr } from '../../model/types.ts'
import { openWorkItem } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { hideTooltip, showTooltip } from '../Tooltip.tsx'
import { dayMarks, type Mark } from './dayMarks.ts'
import { downAllDay, downChip, registerAllDay } from './gesture/controller.ts'
import styles from './AllDayStrip.module.css'

function visibleMarks(marks: Mark[]): { shown: Mark[]; hidden: Mark[] } {
  if (marks.length <= 3) return { shown: marks, hidden: [] }
  return { shown: marks.slice(0, 2), hidden: marks.slice(2) }
}

export function AllDayStrip({ dates, pad }: { dates: DateStr[]; pad: number }) {
  const workItems = useStore((s) => s.workItems)
  const sessions = useStore((s) => s.sessions)
  const courses = useStore((s) => s.courses)
  const armed = useStore((s) => s.armed)
  const perDay = dates.map((date) => dayMarks(date, workItems, sessions, courses))
  const rows = Math.min(3, Math.max(1, ...perDay.map((marks) => (marks.length > 3 ? 3 : Math.max(marks.length, 1)))))
  const height = 4 + rows * 20 + (rows - 1) * 2 + 4

  return (
    <div className={styles.strip} style={{ height, paddingRight: pad }}>
      <div className={styles.gutter}>All-day</div>
      {dates.map((date, index) => {
        const split = visibleMarks(perDay[index])
        const copy = armed ? styles.copy : undefined
        return (
          <div
            key={date}
            className={copy ? `${styles.cell} ${copy}` : styles.cell}
            ref={(el) => registerAllDay(date, el)}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) downAllDay(e, date)
            }}
          >
            {split.shown.map((mark) => (
              <MarkView key={mark.id} mark={mark} armed={armed?.kind === 'chip' && armed.sessionId === mark.sessionId} />
            ))}
            {split.hidden.length > 0 ? (
              <div
                className={styles.more}
                onPointerEnter={(e) => showTooltip(e.currentTarget, split.hidden.map((mark) => mark.tip).join('\n'))}
                onPointerLeave={hideTooltip}
                onFocus={(e) => showTooltip(e.currentTarget, split.hidden.map((mark) => mark.tip).join('\n'))}
                onBlur={hideTooltip}
                tabIndex={0}
              >
                +{split.hidden.length} more
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function MarkView({ mark, armed }: { mark: Mark; armed: boolean }) {
  const tip = (el: HTMLElement) => {
    if (el.scrollWidth > el.clientWidth) showTooltip(el, mark.tip)
  }
  if (mark.kind === 'exam') {
    return (
      <button
        type="button"
        className={styles.exam}
        style={{ background: mark.fill }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          if (mark.workItemId) openWorkItem(mark.workItemId)
        }}
        onPointerEnter={(e) => tip(e.currentTarget)}
        onPointerLeave={hideTooltip}
        onFocus={(e) => tip(e.currentTarget)}
        onBlur={hideTooltip}
      >
        {mark.label}
      </button>
    )
  }
  return (
    <div
      className={armed ? `${styles.chip} ${styles.chipOn}` : styles.chip}
      style={{ borderColor: mark.outline ?? undefined }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (mark.sessionId) downChip(e, mark.sessionId)
      }}
      onPointerEnter={(e) => tip(e.currentTarget)}
      onPointerLeave={hideTooltip}
      onFocus={(e) => tip(e.currentTarget)}
      onBlur={hideTooltip}
      tabIndex={0}
    >
      {mark.label}
    </div>
  )
}
