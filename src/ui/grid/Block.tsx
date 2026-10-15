import { useLayoutEffect, useRef } from 'react'
import { formatDoneDate } from '../../model/dates.ts'
import { formatRange, formatSpokenRange } from '../../model/minutes.ts'
import { swatch } from '../../model/palette.ts'
import type { View } from '../../model/types.ts'
import { openOverflow } from '../../store/actions.ts'
import { rememberAnchor } from './OverflowPopover.tsx'
import { useStore } from '../../store/store.ts'
import { hideTooltip, showTooltip } from '../Tooltip.tsx'
import { downBlock } from './gesture/controller.ts'
import { blockHeight, handleInner } from './gesture/geometry.ts'
import { registerBlock, segKey } from './gesture/liveLayout.ts'
import { linkedParts, plainParts } from './labels.ts'
import styles from './Block.module.css'

export function Block({
  sessionId,
  date,
  top,
  bottom,
  continuation,
  left,
  width,
  selected,
  raised,
  overflowIds,
  view,
}: {
  sessionId: string
  date: string
  top: number
  bottom: number
  continuation: boolean
  left: number
  width: number
  selected: boolean
  raised: boolean
  overflowIds: string[]
  view: View
}) {
  const session = useStore((s) => s.sessions[sessionId])
  const item = useStore((s) => (session?.workItemId ? s.workItems[session.workItemId] : undefined))
  const course = useStore((s) => (item ? s.courses[item.courseId] : undefined))
  const today = useStore((s) => s.today)
  const ref = useRef<HTMLDivElement>(null)
  const key = segKey(sessionId, date)
  useLayoutEffect(() => {
    registerBlock(key, ref.current)
    return () => registerBlock(key, null)
  }, [key])
  if (!session || session.start == null || session.end == null) return null

  const height = blockHeight(top, bottom)
  const short = height < 24
  const paint = swatch(course?.color ?? session.color ?? 'slate')
  const rows = item
    ? linkedParts({
        course: course?.name ?? '',
        title: item.title,
        start: session.start,
        end: session.end,
        heightPx: height,
        widthPx: width,
        view,
      })
    : plainParts({
        title: session.title || 'Busy',
        start: session.start,
        end: session.end,
        heightPx: height,
        widthPx: width,
      })
  const spoken = formatSpokenRange(session.start, session.end)
  const label = item ? `${course?.name ?? ''} · ${item.title}` : session.title || 'Busy'
  const inner = handleInner(height)
  const continues = session.end > 1440 && bottom === 1440
  const showTop = !continuation
  const showBottom = !continues
  const className = selected ? `${styles.block} ${styles.on}` : styles.block

  function tipText(): string {
    const range = formatRange(session!.start!, session!.end!)
    if (item) {
      const lines = [label, range]
      if (item.completedAt) lines.push(`Done ${formatDoneDate(item.completedAt, today)}`)
      return lines.join('\n')
    }
    const repeat = session!.repeat === 'daily' ? ' (every day)' : session!.repeat === 'weekdays' ? ' (weekdays)' : ''
    return `${label}\n${range}${repeat}`
  }

  function maybeTip(el: HTMLElement) {
    const lines = el.querySelectorAll('[data-line]')
    let cut = false
    lines.forEach((line) => {
      if (line.scrollWidth > line.clientWidth) cut = true
    })
    if (cut) showTooltip(el, tipText())
  }

  return (
    <div
      ref={ref}
      id={`b11-b-${sessionId}-${date}`}
      className={className}
      role="button"
      tabIndex={0}
      aria-label={`${label}, ${spoken}`}
      data-left={left}
      data-width={width}
      style={{
        left,
        width,
        top: blockTop(top),
        height,
        background: paint.fill,
        zIndex: raised ? 4 : undefined,
        padding: short ? '1px 6px' : undefined,
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        downBlock(e, sessionId, date, 'body')
      }}
      onPointerEnter={(e) => maybeTip(e.currentTarget)}
      onPointerLeave={hideTooltip}
      onFocus={(e) => maybeTip(e.currentTarget)}
      onBlur={hideTooltip}
    >
      {rows.map((parts, index) => (
        <div key={index} data-line="" className={short ? styles.short : styles.line}>
          {parts.map((part, partIndex) => (
            <span key={partIndex} style={{ fontWeight: part.weight }}>
              {part.text}
            </span>
          ))}
        </div>
      ))}
      {showTop ? (
        <span
          className={styles.handle}
          style={{ top: -4, height: 4 + inner }}
          onPointerDown={(e) => {
            e.stopPropagation()
            downBlock(e, sessionId, date, 'top')
          }}
        />
      ) : null}
      {showBottom ? (
        <span
          className={styles.handleBottom}
          style={{ bottom: -4, height: 4 + inner }}
          onPointerDown={(e) => {
            e.stopPropagation()
            downBlock(e, sessionId, date, 'bottom')
          }}
        />
      ) : null}
      {overflowIds.length > 0 ? (
        <button
          type="button"
          className={styles.more}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            rememberAnchor(e.currentTarget)
            openOverflow(date, overflowIds)
          }}
          onPointerEnter={(e) => showTooltip(e.currentTarget, overflowTip(overflowIds))}
          onPointerLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget, overflowTip(overflowIds))}
          onBlur={hideTooltip}
        >
          +{overflowIds.length}
        </button>
      ) : null}
    </div>
  )
}

function blockTop(minute: number): number {
  return Math.round(minute * (64 / 60))
}

function overflowTip(ids: string[]): string {
  const state = useStore.getState()
  const lines = ['Also here:']
  for (const id of ids) {
    const session = state.sessions[id]
    if (!session) continue
    if (session.workItemId) {
      const item = state.workItems[session.workItemId]
      const course = item ? state.courses[item.courseId] : undefined
      lines.push(`${course?.name ?? ''} · ${item?.title ?? ''}`)
    } else lines.push(session.title || 'Busy')
  }
  return lines.join('\n')
}
