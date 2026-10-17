import type { State } from '../store/store.ts'
import { useStore } from '../store/store.ts'
import { motionOn, subscribeMotion } from './motion.ts'

export type DepartKind = 'leave' | 'pop' | 'settle' | 'fadeOut' | 'toast'

export interface Ghost {
  key: number
  kind: DepartKind
  top: number
  left: number
  width: number
  height: number
  node: HTMLElement
  scrolls: number[]
  mx?: string
  my?: string
  ms?: string
  origin?: string
}

interface Vars {
  mx?: string
  my?: string
  ms?: string
  origin?: string
}

let items: Ghost[] = []
let snapshot: Ghost[] = []
let key = 0
let previous = useStore.getState()
let watching = false
const listeners = new Set<() => void>()
const timers = new Map<number, number>()

function emit(): void {
  snapshot = items.slice()
  for (const listener of listeners) listener()
}

export function departSnapshot(): Ghost[] {
  return snapshot
}

export function subscribeDepart(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function scrollsOf(el: HTMLElement): number[] {
  const values: number[] = []
  const walk = (node: Element) => {
    if (node instanceof HTMLElement) values.push(node.scrollTop)
    for (const child of node.children) walk(child)
  }
  walk(el)
  return values
}

export function applyScrolls(root: HTMLElement, values: number[]): void {
  let index = 0
  const walk = (node: Element) => {
    if (node instanceof HTMLElement) {
      const top = values[index] ?? 0
      index += 1
      if (top) node.scrollTop = top
    }
    for (const child of node.children) walk(child)
  }
  walk(root)
}

function copyFields(from: HTMLElement, to: HTMLElement): void {
  const sources = from.querySelectorAll('input, textarea')
  const copies = to.querySelectorAll('input, textarea')
  sources.forEach((source, index) => {
    const copy = copies[index]
    if (source instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
      copy.value = source.value
      copy.checked = source.checked
    } else if (source instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
      copy.value = source.value
    }
  })
}

function prepareClone(node: HTMLElement): void {
  node.style.animation = 'none'
  node.style.transition = 'none'
  node.style.transform = 'none'
  node.style.position = 'relative'
  node.style.inset = 'auto'
  node.style.margin = '0'
  node.style.width = '100%'
  node.style.height = '100%'
  node.style.maxWidth = 'none'
  node.style.pointerEvents = 'none'
  node.removeAttribute('id')
  node.removeAttribute('data-add-form')
  node.removeAttribute('data-edit-form')
  node.removeAttribute('data-float-pop')
  node.removeAttribute('data-toast')
  node.removeAttribute('data-list-row')
  node.removeAttribute('data-departed')
  node.querySelectorAll<HTMLElement>('[id]').forEach((el) => el.removeAttribute('id'))
}

function push(node: HTMLElement, rect: DOMRect, kind: DepartKind, scrolls: number[], vars: Vars): void {
  key += 1
  const ghost: Ghost = {
    key,
    kind,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    node,
    scrolls,
    mx: vars.mx,
    my: vars.my,
    ms: vars.ms,
    origin: vars.origin,
  }
  items = [...items, ghost]
  const timer = window.setTimeout(() => removeDepart(ghost.key), 240)
  timers.set(ghost.key, timer)
  emit()
}

export function removeDepart(id: number): void {
  const timer = timers.get(id)
  if (timer != null) window.clearTimeout(timer)
  timers.delete(id)
  if (!items.some((item) => item.key === id)) return
  items = items.filter((item) => item.key !== id)
  emit()
}

export function clearDeparts(kind?: DepartKind): void {
  const next = kind ? items.filter((item) => item.kind !== kind) : []
  if (next.length === items.length) return
  for (const item of items) {
    if (kind && item.kind !== kind) continue
    const timer = timers.get(item.key)
    if (timer != null) window.clearTimeout(timer)
    timers.delete(item.key)
  }
  items = next
  emit()
}

export function takeElement(
  el: HTMLElement,
  kind: DepartKind,
  vars: Vars = {},
  edit?: (node: HTMLElement) => void,
): void {
  if (!motionOn() || el.getAttribute('data-departed') === '1') return
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return
  el.setAttribute('data-departed', '1')
  const scrolls = scrollsOf(el)
  const node = el.cloneNode(true) as HTMLElement
  copyFields(el, node)
  edit?.(node)
  prepareClone(node)
  push(node, rect, kind, scrolls, vars)
}

function varsOf(el: HTMLElement, extra: Vars = {}): Vars {
  return {
    mx: extra.mx ?? (el.style.getPropertyValue('--mx') || undefined),
    my: extra.my ?? (el.style.getPropertyValue('--my') || undefined),
    ms: extra.ms ?? (el.style.getPropertyValue('--ms') || undefined),
    origin: extra.origin ?? (el.style.transformOrigin || undefined),
  }
}

function takeSelector(selector: string, kind: DepartKind, extra: Vars = {}): void {
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return
  takeElement(el, kind, varsOf(el, extra))
}

function restored(state: State, prev: State): boolean {
  if (state.workItems === prev.workItems) return false
  for (const [id, item] of Object.entries(state.workItems)) {
    const before = prev.workItems[id]
    if (before?.completedAt && !item.completedAt) return true
  }
  return false
}

function onStore(state: State, prev: State): void {
  if (restored(state, prev)) clearDeparts('settle')
  if (!motionOn()) return
  if (prev.addOpen && !state.addOpen) takeSelector('[data-add-form]', 'leave')
  if (prev.editingWorkItemId && prev.editingWorkItemId !== state.editingWorkItemId) {
    takeSelector('[data-edit-form]', 'leave')
  }
  if (prev.popover && !state.popover) takeSelector('[data-float-pop]', 'pop')
  if (prev.monthOverlayDate && !state.monthOverlayDate) takeSelector('#b11-overlay', 'fadeOut')
  if (!prev.monthOverlayDate && state.monthOverlayDate) clearDeparts('fadeOut')
  if (prev.toast && !state.toast) takeSelector('[data-toast]', 'toast', { mx: '0px', my: '8px', ms: '0.98' })
}

export function installExitWatcher(): void {
  if (watching || typeof document === 'undefined') return
  watching = true
  previous = useStore.getState()
  useStore.subscribe((state) => {
    const prev = previous
    previous = state
    onStore(state, prev)
  })
  subscribeMotion(() => {
    if (!motionOn()) clearDeparts()
  })
}
