import type { WorkItem } from '../../model/types.ts'
import { EditForm } from './EditForm.tsx'
import { ListRow } from './ListRow.tsx'
import styles from './ListGroup.module.css'
import { useStore } from '../../store/store.ts'

export function ListGroup({ label, items, first }: { label: string; items: WorkItem[]; first: boolean }) {
  const editing = useStore((s) => s.editingWorkItemId)
  return (
    <section className={first ? `${styles.group} ${styles.first}` : styles.group}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.count} nums`}>{items.length}</span>
      </div>
      {items.map((item) => (editing === item.id ? <EditForm key={item.id} id={item.id} /> : <ListRow key={item.id} item={item} />))}
    </section>
  )
}
