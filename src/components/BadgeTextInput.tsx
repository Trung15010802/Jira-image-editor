import { useRef, useState } from 'react'

interface BadgeTextInputProps {
  left: number
  top: number
  initialValue: string
  onCommit: (text: string) => void
}

export function BadgeTextInput({
  left,
  top,
  initialValue,
  onCommit,
}: BadgeTextInputProps) {
  const [value, setValue] = useState(initialValue)
  const done = useRef(false)

  const finish = (text: string) => {
    if (done.current) return
    done.current = true
    onCommit(text)
  }

  return (
    <div className="absolute z-20" style={{ left, top }}>
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => finish(value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            finish(initialValue)
            event.currentTarget.blur()
          }
        }}
        placeholder="Badge text (empty = remove)"
        className="w-56 rounded-md border border-indigo-500 bg-zinc-900/95 px-2.5 py-1.5 text-sm text-zinc-100 shadow-xl outline-none placeholder:text-zinc-600"
      />
    </div>
  )
}
