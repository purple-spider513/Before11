import { memo } from 'react'
import { layoutDay } from '../../model/overlap.ts'
import { segmentsForDate } from '../../model/instances.ts'
import type { DateStr, View } from '../../model/types.ts'
import { useStore } from '../../store/store.ts'
import { Block } from './Block.tsx'
import { NowLine } from './NowLine.tsx'
import { downEmpty } from './gesture/controller.ts'
import { blockBox, fullBox } from './gesture/geometry.ts'
import styles from './DayColumn.module.css'

export const DayColumn = memo(function DayColumn({ date, view, colW }: { date: DateStr; view: View; colW: number }) {
  const segments = useStore((s) => segmentsForDate(date, s.sessions))
  const today = useStore((s) => s.today)
  const now = useStore((s) => s.nowMinute)
  const selection = useStore((s) => s.selection)
  const armed = useStore((s) => s.armed)
  const first = useStore((s) => s.firstClick)
  const layout = layoutDay(segments)
  const hiddenFor = new Map<string, string[]>()
  for (const pair of layout.overflow) hiddenFor.set(pair.anchorId, pair.hiddenIds)

  return (
    <div
      className={armed ? `${styles.col} ${styles.copy}` : styles.col}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) downEmpty(e, date)
      }}
    >
      {segments.map((seg) => {
        const lay = layout.byId[seg.sessionId]
        if (!lay) return null
        const selected = selection?.sessionId === seg.sessionId && selection.date === date
        if (lay.hidden && !selected) return null
        const box = lay.hidden && selected ? fullBox(colW) : blockBox(colW, lay.col, lay.cols)
        return (
          <Block
            key={`${seg.sessionId}-${seg.isContinuation ? 'c' : 'a'}`}
            sessionId={seg.sessionId}
            date={date}
            top={seg.top}
            bottom={seg.bottom}
            continuation={seg.isContinuation}
            left={box.left}
            width={box.width}
            selected={selected}
            raised={lay.hidden && selected}
            overflowIds={hiddenFor.get(seg.sessionId) ?? []}
            view={view}
          />
        )
      })}
      {date === today ? <NowLine minute={now} /> : null}
      {first?.date === date ? <div className={styles.marker} style={{ top: Math.round(first.minute * (64 / 60)) }} /> : null}
    </div>
  )
})
