import { useEffect } from 'react'
import { useEditor } from '../store/editorStore'

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        if (event.key === 'Escape') (event.target as HTMLElement).blur()
        return
      }

      const state = useEditor.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (state.exportOpen) {
        if (event.key === 'Escape') state.closeExport()
        return
      }

      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }

      if (mod && key === 'y') {
        event.preventDefault()
        state.redo()
        return
      }

      if (mod && key === 'e') {
        event.preventDefault()
        state.openExport()
        return
      }

      if (mod) return

      if (event.shiftKey && key === 'h') {
        event.preventDefault()
        state.addGuide('horizontal')
        return
      }

      if (event.shiftKey && key === 'v') {
        event.preventDefault()
        state.addGuide('vertical')
        return
      }

      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          state.removeSelected()
          break
        case 'Escape':
          state.setTool('select')
          state.clearSelection()
          break
        case 'v':
        case 'V':
          state.setTool('select')
          break
        case 'a':
        case 'A':
          state.setTool('arrow')
          break
        case 'r':
        case 'R':
          state.setTool('box')
          break
        case 't':
        case 'T':
          state.setTool('text')
          break
        case 'h':
        case 'H':
          state.setTool('highlight')
          break
        case 'x':
        case 'X':
          state.setTool('redact')
          break
        case ' ':
          event.preventDefault()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
