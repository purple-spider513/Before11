import { groupUnfinished } from '../../model/list.ts'
import { openAdd } from '../../store/actions.ts'
import { useStore } from '../../store/store.ts'
import { AddForm } from './AddForm.tsx'
import { ListGroup } from './ListGroup.tsx'
import styles from './UnfinishedList.module.css'

export function UnfinishedList() {
  const items = useStore((s) => s.workItems)
  const courses = useStore((s) => s.courses)
  const today = useStore((s) => s.today)
  const loaded = useStore((s) => s.loaded.courses && s.loaded.workItems && s.loaded.sessions)
  const addOpen = useStore((s) => s.addOpen)
  const groups = groupUnfinished(Object.values(items), courses, today)
  const blocks = [
    ['Overdue', groups.overdue],
    ['Tonight', groups.tonight],
    ['Tomorrow', groups.tomorrow],
    ['Later', groups.later],
  ] as const
  const visible = blocks.filter(([, rows]) => rows.length > 0)
  const courseCount = Object.keys(courses).length
  const unfinished = visible.reduce((n, [, rows]) => n + rows.length, 0)

  return (
    <div className={styles.col}>
      <button id="b11-add" type="button" className={`btn ${styles.add}`} aria-haspopup="dialog" onClick={() => openAdd()}>
        Add homework, exam, or task
      </button>
      {addOpen ? <AddForm /> : null}
      {loaded && unfinished === 0 ? (
        <p className={styles.empty}>
          {courseCount === 0
            ? "Add a task, or a course and the first homework or exam that's due. It stays on this list until you check it off."
            : 'Nothing due. Add homework or a task when you get it.'}
        </p>
      ) : null}
      {loaded || unfinished > 0
        ? visible.map(([label, rows], index) => <ListGroup key={label} label={label} items={rows} first={index === 0} />)
        : null}
    </div>
  )
}
