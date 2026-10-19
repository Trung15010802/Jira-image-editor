import { Upload } from 'lucide-react'

export function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/70 p-8 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-500/60 bg-zinc-900/85 px-16 py-12 shadow-2xl">
        <div className="rounded-full bg-indigo-500/15 p-4">
          <Upload className="h-7 w-7 text-indigo-400" />
        </div>
        <div className="text-sm font-semibold text-zinc-100">
          Drop images to add them
        </div>
        <div className="text-xs text-zinc-500">
          PNG, JPEG, WebP, GIF and more
        </div>
      </div>
    </div>
  )
}
