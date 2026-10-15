import { useStore } from '../store/store.ts'
import { errorCode } from './client.ts'
import { flush, stageChange, type Change } from './outbox.ts'

export function reportWriteError(error: unknown): void {
  const code = errorCode(error)
  const offline =
    (typeof navigator !== 'undefined' && navigator.onLine === false) || code === '' || code === 'unknown'
  useStore.setState({ sync: offline ? { state: 'offline' } : { state: 'error', code } })
}

export function scheduleWrite(fn: () => Promise<unknown>): void {
  requestAnimationFrame(() => {
    setTimeout(() => {
      fn().catch(reportWriteError)
    }, 0)
  })
}

export function enqueueWrite(change: Change): Promise<void> {
  stageChange(change)
  return flush()
}
