import { useEffect } from 'react'
import { useGuide } from '../store/guideStore'

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

export function useGuideShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      const state = useGuide.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

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

      if (mod) return

      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          state.removeSelected()
          break
        case 'Escape':
          state.setTool('select')
          state.selectAnnotation(null)
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
        case 'c':
        case 'C':
          state.setTool('ellipse')
          break
        case 'p':
        case 'P':
          state.setTool('pen')
          break
        case 'k':
        case 'K':
          state.setTool('callout')
          break
        case 't':
        case 'T':
          state.setTool('text')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
