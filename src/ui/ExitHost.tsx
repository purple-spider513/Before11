import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react'
import { applyScrolls, departSnapshot, removeDepart, subscribeDepart, type Ghost } from './depart.ts'

const NONE: Ghost[] = []

const CLASS: Record<Ghost['kind'], string> = {
  leave: 'b11-leave',
  pop: 'b11-pop',
  settle: 'b11-settle',
  fadeOut: 'b11-fade-out',
  toast: 'b11-toast',
}

export function ExitHost() {
  const ghosts = useSyncExternalStore(subscribeDepart, departSnapshot, () => NONE)
  return ghosts.map((ghost) => <GhostView key={ghost.key} ghost={ghost} />)
}

function GhostView({ ghost }: { ghost: Ghost }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    host.replaceChildren(ghost.node)
    applyScrolls(ghost.node, ghost.scrolls)
  }, [ghost])
  const style = {
    position: 'fixed',
    top: ghost.top,
    left: ghost.left,
    width: ghost.width,
    height: ghost.height,
    zIndex: ghost.kind === 'toast' ? 60 : ghost.kind === 'pop' ? 50 : ghost.kind === 'fadeOut' ? 40 : 30,
    pointerEvents: 'none',
    margin: 0,
    transformOrigin: ghost.origin,
    '--mx': ghost.mx,
    '--my': ghost.my,
    '--ms': ghost.ms,
  } as CSSProperties
  return (
    <div
      ref={ref}
      className={CLASS[ghost.kind]}
      style={style}
      inert
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return
        removeDepart(ghost.key)
      }}
    />
  )
}
