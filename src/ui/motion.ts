import { useSyncExternalStore } from 'react'
import { loadMotion, saveMotion } from '../store/device.ts'

export interface MotionSnap {
  stored: boolean
  reduced: boolean
  on: boolean
}

const OFF: MotionSnap = { stored: false, reduced: false, on: false }

let stored = false
let reduced = false
let snap: MotionSnap = OFF
let heldId: string | null = null
let started = false
const listeners = new Set<() => void>()

function readReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function publish(): void {
  const on = stored && !reduced
  snap = { stored, reduced, on }
  if (!on) heldId = null
  if (typeof document !== 'undefined') {
    if (on) document.documentElement.setAttribute('data-motion', 'on')
    else document.documentElement.removeAttribute('data-motion')
  }
  for (const listener of listeners) listener()
}

export function startMotion(): void {
  if (started) return
  started = true
  try {
    stored = loadMotion()
  } catch {
    stored = false
  }
  reduced = readReduced()
  publish()
  try {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', () => {
      reduced = media.matches
      publish()
    })
  } catch {
    // The page stays on the off path when the media query is unavailable.
  }
}

export function motionOn(): boolean {
  return snap.on
}

export function motionSnap(): MotionSnap {
  return snap
}

export function setMotion(on: boolean): void {
  stored = on
  saveMotion(on)
  publish()
}

export function subscribeMotion(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMotion(): MotionSnap {
  return useSyncExternalStore(subscribeMotion, motionSnap, () => OFF)
}

export function setHeldId(id: string | null): void {
  const next = id && snap.on ? id : null
  if (next === heldId) return
  heldId = next
  for (const listener of listeners) listener()
}

export function heldNow(): string | null {
  return snap.on ? heldId : null
}

export function useHeld(id: string): boolean {
  return useSyncExternalStore(subscribeMotion, () => heldNow() === id, () => false)
}

/** The popover sits 5px toward the block and scales from the facing edge. */
export function placeToward(pop: HTMLElement, anchor: DOMRect | null, popLeft: number, popWidth: number): void {
  const center = popLeft + popWidth / 2
  const anchorCenter = anchor ? anchor.left + anchor.width / 2 : center + 1
  const mx = center >= anchorCenter ? -5 : 5
  pop.style.setProperty('--mx', `${mx}px`)
  pop.style.setProperty('--my', '0px')
  pop.style.setProperty('--ms', '0.98')
  pop.style.transformOrigin = mx > 0 ? 'right center' : 'left center'
}
