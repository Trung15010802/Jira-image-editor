import { Check, Clipboard, Download, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { copyImageToClipboard, exportImage } from '../lib/export'
import { getBoard } from '../lib/layout'
import { useEditor } from '../store/editorStore'

export function ExportDialog() {
  const shots = useEditor((state) => state.shots)
  const activeId = useEditor((state) => state.activeId)
  const mode = useEditor((state) => state.mode)
  const annotations = useEditor((state) => state.annotations)
  const closeExport = useEditor((state) => state.closeExport)

  const activeShot = shots.find((shot) => shot.id === activeId) ?? shots[0]
  const canCompare = shots.length > 1

  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [scale, setScale] = useState(1)
  const [transparent, setTransparent] = useState(false)
  const [sideBySide, setSideBySide] = useState(mode === 'compare' && canCompare)
  const [filename, setFilename] = useState(
    activeShot ? `${activeShot.name}-annotated` : 'screenshot',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'export' | 'copy' | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    },
    [],
  )

  const board = useMemo(
    () =>
      getBoard(
        shots,
        sideBySide && canCompare ? 'compare' : 'single',
        activeId,
      ),
    [shots, sideBySide, canCompare, activeId],
  )

  const outputWidth = Math.max(1, Math.round(board.width * scale))
  const outputHeight = Math.max(1, Math.round(board.height * scale))

  const handleExport = async () => {
    setBusy('export')
    setError(null)
    try {
      await exportImage(shots, annotations, {
        format,
        scale,
        transparent: format === 'png' && transparent,
        sideBySide: sideBySide && canCompare,
        activeId,
        filename,
      })
      closeExport()
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Export failed',
      )
    } finally {
      setBusy(null)
    }
  }

  const handleCopy = async () => {
    setBusy('copy')
    setError(null)
    try {
      await copyImageToClipboard(shots, annotations, {
        scale,
        transparent,
        sideBySide: sideBySide && canCompare,
        activeId,
        filename,
      })
      setCopied(true)
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch (copyError) {
      setError(
        copyError instanceof Error ? copyError.message : 'Copy failed',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && busy === null) closeExport()
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Export image</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {outputWidth} × {outputHeight} px · guides are not included
            </p>
          </div>
          <button
            type="button"
            onClick={closeExport}
            disabled={busy !== null}
            title="Close"
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {canCompare ? (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                What to export
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSideBySide(false)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    !sideBySide
                      ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Active image
                  <span className="mt-0.5 block text-[10px] text-zinc-600">
                    {activeShot?.id.toUpperCase()} · {activeShot?.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSideBySide(true)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    sideBySide
                      ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Side by side
                  <span className="mt-0.5 block text-[10px] text-zinc-600">
                    A + B comparison
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Format
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['png', 'jpeg'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormat(item)}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs transition ${
                    format === item
                      ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {item.toUpperCase()}
                  {format === item ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Scale
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0.5, 1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScale(value)}
                  className={`rounded-md border px-2 py-1.5 text-xs tabular-nums transition ${
                    scale === value
                      ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>

          <label
            className={`flex items-center gap-2 text-xs ${
              format === 'png' ? 'text-zinc-300' : 'text-zinc-600'
            }`}
          >
            <input
              type="checkbox"
              checked={format === 'png' && transparent}
              disabled={format !== 'png'}
              onChange={(event) => setTransparent(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-indigo-500"
            />
            Transparent background
            {format !== 'png' ? (
              <span className="text-[10px] text-zinc-600">(PNG only)</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              File name
            </span>
            <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/40">
              <input
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="screenshot"
                className="h-9 min-w-0 flex-1 bg-transparent px-2.5 text-xs text-zinc-200 outline-none"
              />
              <span className="shrink-0 pr-2.5 text-xs text-zinc-600">
                .{format === 'jpeg' ? 'jpg' : 'png'}
              </span>
            </div>
          </label>

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/50 px-5 py-3.5">
          <button
            type="button"
            onClick={closeExport}
            disabled={busy !== null}
            className="rounded-md px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={busy !== null}
            title="Copy PNG to clipboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {busy === 'copy' ? 'Copying…' : copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {busy === 'export' ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
