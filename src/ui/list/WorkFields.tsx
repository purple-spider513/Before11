import type { Ref } from 'react'
import { dateFieldLabel } from '../../model/list.ts'
import type { Importance, WorkKind } from '../../model/types.ts'
import styles from './WorkFields.module.css'

export function DueField({
  kind,
  value,
  onChange,
  inputRef,
}: {
  kind: WorkKind
  value: string
  onChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div className={styles.dateLabel}>
      <span>{dateFieldLabel(kind)}</span>
      <span className={styles.dateRow}>
        <input
          ref={inputRef}
          className="field"
          type="date"
          aria-label={dateFieldLabel(kind)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {kind === 'task' && value ? (
          <button type="button" className="btn btn-text" onClick={() => onChange('')}>
            Clear
          </button>
        ) : null}
      </span>
    </div>
  )
}

export function DurationField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.estimate}>
      How long
      <span>
        <input
          className="field"
          type="number"
          min={5}
          max={1440}
          step={5}
          placeholder="min"
          aria-label="How long"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.min}>minutes</span>
      </span>
    </label>
  )
}

const LEVELS: { id: Importance | null; label: string }[] = [
  { id: null, label: 'Unset' },
  { id: 'low', label: 'Low' },
  { id: 'high', label: 'High' },
]

export function ImportanceField({
  value,
  onChange,
}: {
  value: Importance | null
  onChange: (value: Importance | null) => void
}) {
  return (
    <div className={styles.dateLabel}>
      <span>Importance</span>
      <div className="seg" role="group" aria-label="Importance">
        {LEVELS.map((level) => (
          <button
            key={level.label}
            type="button"
            aria-pressed={value === level.id}
            onClick={() => onChange(level.id)}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}
