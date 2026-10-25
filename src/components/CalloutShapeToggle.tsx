import { Circle, Square } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CalloutShapeKind } from '../types'

const OPTIONS: { id: CalloutShapeKind; label: string; icon: ReactNode }[] = [
  { id: 'circle', label: 'Circle', icon: <Circle className="h-3.5 w-3.5" /> },
  { id: 'rect', label: 'Rectangle', icon: <Square className="h-3.5 w-3.5" /> },
]

export function CalloutShapeToggle({
  value,
  onChange,
}: {
  value: CalloutShapeKind
  onChange: (shape: CalloutShapeKind) => void
}) {
  return (
    <div className="ml-1 flex items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          title={`Callout shape: ${option.label}`}
          aria-label={`Callout shape: ${option.label}`}
          onClick={() => onChange(option.id)}
          className={`rounded p-1 transition ${
            value === option.id
              ? 'bg-indigo-500/15 text-indigo-300'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}
