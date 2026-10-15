import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './Tooltip.module.css'

interface Tip {
  text: string
  x: number
  y: number
  place: 'above' | 'below'
}

let setTip: ((tip: Tip | null) => void) | null = null

export function showTooltip(anchor: HTMLElement, text: string): void {
  const rect = anchor.getBoundingClientRect()
  const above = rect.top - 6
  const place = above < 52 ? 'below' : 'above'
  const y = place === 'above' ? rect.top - 6 : rect.bottom + 6
  setTip?.({ text, x: rect.left + rect.width / 2, y, place })
}

export function hideTooltip(): void {
  setTip?.(null)
}

export function Tooltip() {
  const [tip, set] = useState<Tip | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setTip = set
    const down = () => set(null)
    window.addEventListener('pointerdown', down)
    return () => {
      setTip = null
      window.removeEventListener('pointerdown', down)
    }
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !tip) return
    const width = el.offsetWidth
    const max = Math.max(8, window.innerWidth - 8 - width)
    const left = Math.min(Math.max(8, tip.x - width / 2), max)
    el.style.left = `${left}px`
    el.style.transform = tip.place === 'above' ? 'translate(0, -100%)' : 'translate(0, 0)'
  }, [tip])
  if (!tip) return null
  return (
    <div ref={ref} className={styles.tip} style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  )
}
