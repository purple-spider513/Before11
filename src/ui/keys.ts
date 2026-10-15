import { useEffect } from 'react'
import { cancelGesture } from './grid/gesture/controller.ts'
import { closePlainFromKeys } from './grid/PlainPopover.tsx'
import {
  clearFirstClick,
  clearSelection,
  closeAdd,
  closeEditor,
  closeMonth,
  closePopover,
  deleteSelected,
  disarm,
  goToday,
  openPlainPopover,
  stepRange,
  undo,
} from '../store/actions.ts'
import { useStore } from '../store/store.ts'

function typingTarget(): boolean {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return el.matches('input, textarea, select, [contenteditable]')
}

function plainPopoverTarget(e: KeyboardEvent): boolean {
  const target = e.target
  return target instanceof Element && Boolean(target.closest('[data-plain-popover]'))
}

function escapeLayers(): void {
  const state = useStore.getState()
  if (state.popover?.kind === 'plain') {
    if (!closePlainFromKeys()) closePopover()
    return
  }
  if (state.popover) {
    closePopover()
    return
  }
  if (state.monthOverlayDate) {
    closeMonth()
    return
  }
  if (state.firstClick) {
    clearFirstClick()
    return
  }
  if (state.armed) {
    disarm()
    return
  }
  if (state.addOpen) {
    closeAdd()
    document.getElementById('b11-add')?.focus()
    return
  }
  if (state.editingWorkItemId) {
    closeEditor()
    return
  }
  if (state.selection) clearSelection()
}

export function useKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cancelGesture()) {
          e.preventDefault()
          return
        }
        if (useStore.getState().popover?.kind === 'plain' || plainPopoverTarget(e)) {
          e.preventDefault()
          e.stopPropagation()
          if (!closePlainFromKeys()) closePopover()
          return
        }
        if (typingTarget()) return
        escapeLayers()
        return
      }
      if (typingTarget()) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 't' || e.key === 'T') {
        goToday()
        return
      }
      if (e.key === 'ArrowLeft') {
        stepRange(-1)
        return
      }
      if (e.key === 'ArrowRight') {
        stepRange(1)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (useStore.getState().selection) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }
      if (e.key === 'Enter') {
        if (plainPopoverTarget(e)) return
        const selected = useStore.getState().selection
        if (!selected) return
        const session = useStore.getState().sessions[selected.sessionId]
        if (!session) return
        e.preventDefault()
        openPlainPopover(session.id, selected.date, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
