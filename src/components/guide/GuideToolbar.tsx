import {
  ArrowLeft,
  ArrowUpRight,
  Circle,
  Crosshair,
  Download,
  ListOrdered,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { exportGuide } from '../../lib/guideExport'
import { calloutFontSize } from '../../lib/callout'
import { CalloutShapeToggle } from '../CalloutShapeToggle'
import { useGuide } from '../../store/guideStore'
import type { Tool } from '../../types'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']

const TOOLS: { id: Tool; label: string; shortcut: string; icon: ReactNode }[] = [
  { id: 'select', label: 'Select / move', shortcut: 'V', icon: <MousePointer2 className="h-4 w-4" /> },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <ArrowUpRight className="h-4 w-4" /> },
  { id: 'box', label: 'Rectangle', shortcut: 'R', icon: <Square className="h-4 w-4" /> },
  { id: 'ellipse', label: 'Circle / Ellipse', shortcut: 'C', icon: <Circle className="h-4 w-4" /> },
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: <Pencil className="h-4 w-4" /> },
  { id: 'callout', label: 'Callout', shortcut: 'K', icon: <Crosshair className="h-4 w-4" /> },
  { id: 'text', label: 'Text label', shortcut: 'T', icon: <Type className="h-4 w-4" /> },
]

const baseButton =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-30'

function IconButton({
  title,
  active,
  disabled,
  danger,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`${baseButton} ${
        active
          ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/40'
          : danger
            ? 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

export function GuideToolbar() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const steps = useGuide((state) => state.steps)
  const activeStepId = useGuide((state) => state.activeStepId)
  const tool = useGuide((state) => state.tool)
  const color = useGuide((state) => state.color)
  const textSize = useGuide((state) => state.textSize)
  const calloutTextSize = useGuide((state) => state.calloutTextSize)
  const calloutShape = useGuide((state) => state.calloutShape)
  const setCalloutShape = useGuide((state) => state.setCalloutShape)
  const selectedAnnotationId = useGuide((state) => state.selectedAnnotationId)
  const canUndo = useGuide((state) => state.past.length > 0)
  const canRedo = useGuide((state) => state.future.length > 0)
  const exit = useGuide((state) => state.exit)
  const setTool = useGuide((state) => state.setTool)
  const setColor = useGuide((state) => state.setColor)
  const resizeText = useGuide((state) => state.resizeText)
  const resizeCallout = useGuide((state) => state.resizeCallout)
  const removeSelected = useGuide((state) => state.removeSelected)
  const undo = useGuide((state) => state.undo)
  const redo = useGuide((state) => state.redo)

  const selectedText = useGuide((state) => {
    const step = state.steps.find((item) => item.id === state.activeStepId)
    return step?.annotations.find(
      (annotation) =>
        annotation.id === state.selectedAnnotationId && annotation.type === 'text',
    )
  })
  const selectedCallout = useGuide((state) => {
    const step = state.steps.find((item) => item.id === state.activeStepId)
    return step?.annotations.find(
      (annotation) =>
        annotation.id === state.selectedAnnotationId &&
        annotation.type === 'callout',
    )
  })
  const activeStep = steps.find((item) => item.id === activeStepId)
  const calloutMode = Boolean(selectedCallout) || tool === 'callout'
  const activeTextSize = selectedText?.type === 'text' ? selectedText.fontSize : textSize
  const activeCalloutSize =
    selectedCallout?.type === 'callout'
      ? selectedCallout.fontSize
      : (calloutTextSize ??
        (activeStep?.shot ? calloutFontSize(activeStep.shot.width) : textSize))
  const activeSize = calloutMode ? activeCalloutSize : activeTextSize
  const canResizeSize =
    calloutMode || tool === 'text' || selectedText?.type === 'text'
  const resizeSize = calloutMode ? resizeCallout : resizeText
  const textStep = activeSize < 48 ? 4 : 8

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      await exportGuide(useGuide.getState().steps)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2.5">
      <button
        type="button"
        onClick={exit}
        title="Back to editor"
        className={`${baseButton} mr-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden lg:inline">Editor</span>
      </button>

      <div className="mr-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <ListOrdered className="h-4 w-4 text-white" />
        </div>
        <div className="hidden xl:block">
          <div className="text-sm font-semibold leading-tight text-zinc-100">Guide</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </div>
        </div>
      </div>

      <div className="h-6 w-px shrink-0 bg-zinc-800" />

      <div className="flex items-center gap-0.5">
        {TOOLS.map((item) => (
          <IconButton
            key={item.id}
            title={`${item.label} (${item.shortcut})`}
            active={tool === item.id}
            disabled={steps.length === 0}
            onClick={() => setTool(item.id)}
          >
            {item.icon}
          </IconButton>
        ))}
      </div>

      {tool === 'callout' ? (
        <CalloutShapeToggle value={calloutShape} onChange={setCalloutShape} />
      ) : null}

      <div className="h-6 w-px shrink-0 bg-zinc-800" />

      <div className="flex items-center gap-1 px-0.5">
        {COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setColor(swatch)}
            title={`Color ${swatch}`}
            aria-label={`Color ${swatch}`}
            className={`h-4 w-4 rounded-full border transition ${
              color === swatch
                ? 'border-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-zinc-950'
                : 'border-zinc-700 hover:scale-110'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>

      <div
        className="ml-1 flex items-center rounded-md border border-zinc-800 bg-zinc-900"
        title={
          calloutMode
            ? selectedCallout
              ? 'Selected callout label size (px)'
              : 'Callout label size for new callouts (px)'
            : selectedText?.type === 'text'
              ? 'Selected text size (px)'
              : 'Text size for new labels (px)'
        }
      >
        <button
          type="button"
          title={`Decrease size (-${textStep}px)`}
          aria-label="Decrease size"
          disabled={!canResizeSize}
          onClick={() => resizeSize(activeSize - textStep)}
          className="px-1.5 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-8 text-center text-[11px] tabular-nums text-zinc-300">
          {activeSize}
        </span>
        <button
          type="button"
          title={`Increase size (+${textStep}px)`}
          aria-label="Increase size"
          disabled={!canResizeSize}
          onClick={() => resizeSize(activeSize + textStep)}
          className="px-1.5 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {selectedAnnotationId ? (
        <>
          <div className="mx-1 h-6 w-px shrink-0 bg-zinc-800" />
          <IconButton title="Delete selected (Del)" danger onClick={removeSelected}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </>
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <IconButton title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
      </div>

      {error ? (
        <span className="mx-2 max-w-64 truncate text-xs text-red-400" title={error}>
          {error}
        </span>
      ) : null}

      <button
        type="button"
        onClick={handleExport}
        disabled={steps.length === 0 || exporting}
        className={`${baseButton} ml-1 border border-zinc-700 bg-zinc-900 px-2.5 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800`}
        title="Export all steps as guide.zip"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
      </button>
    </header>
  )
}
