import { CanvasArea } from './components/CanvasArea'
import { DropOverlay } from './components/DropOverlay'
import { ExportDialog } from './components/ExportDialog'
import { GuideView } from './components/guide/GuideView'
import { Toolbar } from './components/Toolbar'
import { useImageImport } from './hooks/useImageImport'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useEditor } from './store/editorStore'
import { useGuide } from './store/guideStore'

function App() {
  const dragging = useImageImport()
  useKeyboardShortcuts()
  const exportOpen = useEditor((state) => state.exportOpen)
  const guideActive = useGuide((state) => state.active)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      {guideActive ? (
        <GuideView />
      ) : (
        <>
          <Toolbar />
          <main className="flex min-h-0 flex-1">
            <CanvasArea />
          </main>
        </>
      )}
      {dragging ? <DropOverlay /> : null}
      {exportOpen ? <ExportDialog /> : null}
    </div>
  )
}

export default App
