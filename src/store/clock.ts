import { nowMinute, todayStr } from '../model/dates.ts'
import { useStore } from './store.ts'

export function startClock(): void {
  const tick = () => {
    useStore.setState({ today: todayStr(), nowMinute: nowMinute() })
  }
  tick()
  const now = new Date()
  const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
  window.setTimeout(() => {
    tick()
    window.setInterval(tick, 60_000)
  }, ms)
}
