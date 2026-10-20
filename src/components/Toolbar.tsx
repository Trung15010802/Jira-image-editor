import {
  ArrowUpRight,
  Columns2,
  Download,
  Eraser,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  SeparatorHorizontal,
  SeparatorVertical,
  Square,
  Tag,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { importFiles } from '../lib/importFiles'
import { useEditor } from '../store/editorStore'
import type { BadgeStyle, Tool } from '../types'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']

const TOOLS: { id: Tool; label: string; shortcut: string; icon: ReactNode }[] = [
  { id: 'select', label: 'Select / move', shortcut: 'V', icon: <MousePointer2 className="h-4 w-4" /> },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <ArrowUpRight className="h-4 w-4" /> },
  { id: 'box', label: 'Rectangle', shortcut: 'R', icon: <Square className="h-4 w-4" /> },
  { id: 'text', label: 'Text label', shortcut: 'T', icon: <Type className="h-4 w-4" /> },
  { id: 'highlight', label: 'Highlight', shortcut: 'H', icon: <Highlighter className="h-4 w-4" /> },
  { id: 'redact', label: 'Redact', shortcut: 'X', icon: <Eraser className="h-4 w-4" /> },
]

const BADGE_OPTIONS: { id: BadgeStyle; label: string; hint: string }[] = [
  { id: 'none', label: 'No badge', hint: 'Off' },
  { id: 'number', label: 'Numbers', hint: '1 · 2' },
  { id: 'beforeAfter', label: 'Before / After', hint: 'A · B' },
]

const baseButton =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-30'

function ToolButton({
  active,
  disabled,
  title,
  onClick,
  children,
  danger,
}: {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: ReactNode
  danger?: boolean
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

function Divider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-zinc-800" />
}

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [badgeMenuOpen, setBadgeMenuOpen] = useState(false)
  const shots = useEditor((state) => state.shots)
  const activeId = useEditor((state) => state.activeId)
  const mode = useEditor((state) => state.mode)
  const tool = useEditor((state) => state.tool)
  const color = useEditor((state) => state.color)
  const guides = useEditor((state) => state.guides)
  const annotations = useEditor((state) => state.annotations)
  const textSize = useEditor((state) => state.textSize)
  const selectedAnnotation = useEditor((state) => state.selectedAnnotation)
  const selectedGuideId = useEditor((state) => state.selectedGuideId)
  const selectedBadgeId = useEditor((state) => state.selectedBadgeId)
  const badgeStyle = useEditor((state) => state.badgeStyle)
  const canUndo = useEditor((state) => state.past.length > 0)
  const canRedo = useEditor((state) => state.future.length > 0)
  const setActive = useEditor((state) => state.setActive)
  const setMode = useEditor((state) => state.setMode)
  const setTool = useEditor((state) => state.setTool)
  const setColor = useEditor((state) => state.setColor)
  const resizeText = useEditor((state) => state.resizeText)
  const removeShot = useEditor((state) => state.removeShot)
  const addGuide = useEditor((state) => state.addGuide)
  const clearGuides = useEditor((state) => state.clearGuides)
  const setBadgeStyle = useEditor((state) => state.setBadgeStyle)
  const removeSelected = useEditor((state) => state.removeSelected)
  const undo = useEditor((state) => state.undo)
  const redo = useEditor((state) => state.redo)
  const openExport = useEditor((state) => state.openExport)

  const hasSelection = Boolean(
    selectedAnnotation || selectedGuideId || selectedBadgeId,
  )
  const hasShots = shots.length > 0

  const selectedText = selectedAnnotation
    ? (annotations[selectedAnnotation.shotId] ?? []).find(
        (annotation) =>
          annotation.id === selectedAnnotation.id && annotation.type === 'text',
      )
    : undefined
  const activeTextSize =
    selectedText?.type === 'text' ? selectedText.fontSize : textSize
  const canResizeText = tool === 'text' || selectedText?.type === 'text'
  const textStep = activeTextSize < 48 ? 4 : 8

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2.5">
      <div className="mr-1 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <ImagePlus className="h-4 w-4 text-white" />
        </div>
        <div className="hidden xl:block">
          <div className="text-sm font-semibold leading-tight text-zinc-100">
            Screenshot Studio
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Compare · annotate · guides
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void importFiles(event.currentTarget.files)
          event.currentTarget.value = ''
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`${baseButton} bg-indigo-500 px-2.5 text-white shadow-sm hover:bg-indigo-400`}
        title="Import up to 2 screenshots (or drag & drop / paste)"
      >
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Import</span>
      </button>

      {hasShots ? (
        <div className="ml-1 flex items-center gap-1">
          {shots.map((shot) => {
            const active = shot.id === activeId && mode === 'single'
            return (
              <div
                key={shot.id}
                className={`flex items-center rounded-md border transition ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(shot.id)}
                  title={`Edit ${shot.name} (${shot.id.toUpperCase()})`}
                  className="flex items-center gap-1.5 py-1 pl-1 pr-1.5"
                >
                  <img
                    src={shot.src}
                    alt=""
                    className="h-5 w-7 rounded-sm border border-zinc-700 object-cover"
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      active ? 'text-indigo-300' : 'text-zinc-500'
                    }`}
                  >
                    {shot.id.toUpperCase()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeShot(shot.id)}
                  title={`Remove ${shot.name}`}
                  className="mr-0.5 rounded p-0.5 text-zinc-600 transition hover:bg-zinc-700 hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setMode(mode === 'compare' ? 'single' : 'compare')}
            disabled={shots.length < 2}
            title="Compare side by side"
            className={`${baseButton} ${
              mode === 'compare'
                ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/40'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Columns2 className="h-4 w-4" />
            <span className="hidden xl:inline">Compare</span>
          </button>
        </div>
      ) : null}

      <Divider />

      <div className="flex items-center gap-0.5">
        {TOOLS.map((item) => (
          <ToolButton
            key={item.id}
            title={`${item.label} (${item.shortcut})`}
            active={tool === item.id}
            disabled={!hasShots}
            onClick={() => setTool(item.id)}
          >
            {item.icon}
          </ToolButton>
        ))}
      </div>

      <Divider />

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
          selectedText?.type === 'text'
            ? 'Selected text size (px)'
            : 'Text size for new labels (px)'
        }
      >
        <button
          type="button"
          title={`Decrease text size (-${textStep}px)`}
          aria-label="Decrease text size"
          disabled={!canResizeText}
          onClick={() => resizeText(activeTextSize - textStep)}
          className="px-1.5 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-8 text-center text-[11px] tabular-nums text-zinc-300">
          {activeTextSize}
        </span>
        <button
          type="button"
          title={`Increase text size (+${textStep}px)`}
          aria-label="Increase text size"
          disabled={!canResizeText}
          onClick={() => resizeText(activeTextSize + textStep)}
          className="px-1.5 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {hasSelection ? (
        <>
          <Divider />
          <ToolButton
            title="Delete selected (Del)"
            danger
            onClick={removeSelected}
          >
            <Trash2 className="h-4 w-4" />
          </ToolButton>
        </>
      ) : null}

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolButton
          title="Add horizontal guide (Shift+H)"
          disabled={!hasShots}
          onClick={() => addGuide('horizontal')}
        >
          <SeparatorHorizontal className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          title="Add vertical guide (Shift+V)"
          disabled={!hasShots}
          onClick={() => addGuide('vertical')}
        >
          <SeparatorVertical className="h-4 w-4" />
        </ToolButton>
        {guides.length > 0 ? (
          <ToolButton title="Clear all guides" danger onClick={clearGuides}>
            <X className="h-4 w-4" />
          </ToolButton>
        ) : null}
      </div>

      <Divider />

      <div className="relative flex items-center">
        <ToolButton
          title="Image badges (1 · 2 or Before / After)"
          active={badgeStyle !== 'none'}
          disabled={!hasShots}
          onClick={() => setBadgeMenuOpen((open) => !open)}
        >
          <Tag className="h-4 w-4" />
        </ToolButton>
        {badgeMenuOpen ? (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setBadgeMenuOpen(false)}
            />
            <div className="absolute left-0 top-9 z-40 w-52 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
              {BADGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setBadgeStyle(option.id)
                    setBadgeMenuOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                    badgeStyle === option.id
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-[10px] text-zinc-600">
                    {option.hint}
                  </span>
                </button>
              ))}
              <div className="mt-1 border-t border-zinc-800 px-2.5 py-1.5 text-[10px] leading-snug text-zinc-600">
                Drag a badge on the image to reposition it. Select it and press
                Delete to remove it.
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex-1" />

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolButton title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </div>

      <button
        type="button"
        onClick={openExport}
        disabled={!hasShots}
        className={`${baseButton} ml-1 border border-zinc-700 bg-zinc-900 px-2.5 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800`}
        title="Export (Ctrl+E)"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </button>
    </header>
  )
}
