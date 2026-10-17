import { useEffect, useLayoutEffect, useRef } from 'react'
import { tomorrowCount } from '../model/list.ts'
import { useStore } from '../store/store.ts'
import { ExitHost } from './ExitHost.tsx'
import { Header } from './Header.tsx'
import { SignIn } from './SignIn.tsx'
import { Toast } from './Toast.tsx'
import { Tooltip } from './Tooltip.tsx'
import { OverflowPopover } from './grid/OverflowPopover.tsx'
import { PlainPopover } from './grid/PlainPopover.tsx'
import { TimeGrid } from './grid/TimeGrid.tsx'
import { bindGhost } from './grid/gesture/controller.ts'
import { useKeys } from './keys.ts'
import { UnfinishedList } from './list/UnfinishedList.tsx'
import { MonthView } from './month/MonthView.tsx'
import styles from './App.module.css'

export function App() {
  useKeys()
  const collapsed = useStore((s) => s.listCollapsed)
  const user = useStore((s) => s.user)
  const view = useStore((s) => s.view)
  const items = useStore((s) => s.workItems)
  const today = useStore((s) => s.today)
  const popover = useStore((s) => s.popover)
  const ghostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const count = tomorrowCount(Object.values(items), today)
    document.title = count > 0 ? `Before11 (${count} due tomorrow)` : 'Before11'
    return () => {
      document.title = 'Before11'
    }
  }, [items, today])

  useLayoutEffect(() => {
    if (ghostRef.current) ghostRef.current.hidden = true
    bindGhost(ghostRef.current)
    return () => bindGhost(null)
  }, [])

  return (
    <div className={styles.app}>
      <Header />
      <div className={collapsed ? styles.closed : styles.open}>
        {collapsed ? null : <aside className={styles.list}>{user ? <UnfinishedList /> : <SignIn />}</aside>}
        <div className={styles.cal}>{user ? view === 'month' ? <MonthView /> : <TimeGrid /> : null}</div>
      </div>
      <Toast />
      <ExitHost />
      <Tooltip />
      {popover?.kind === 'plain' ? (
        <PlainPopover sessionId={popover.sessionId} date={popover.date} isNew={popover.isNew} />
      ) : null}
      {popover?.kind === 'overflow' ? <OverflowPopover date={popover.date} ids={popover.ids} /> : null}
      <div ref={ghostRef} className={styles.ghost} />
    </div>
  )
}
