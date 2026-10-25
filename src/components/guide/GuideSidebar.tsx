import { ChevronDown, ChevronUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { useGuide } from '../../store/guideStore'

export function GuideSidebar() {
  const steps = useGuide((state) => state.steps)
  const activeStepId = useGuide((state) => state.activeStepId)
  const selectStep = useGuide((state) => state.selectStep)
  const addStep = useGuide((state) => state.addStep)
  const removeStep = useGuide((state) => state.removeStep)
  const moveStep = useGuide((state) => state.moveStep)

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-2">
        {steps.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-zinc-600">
            No steps yet.
          </p>
        ) : null}

        <ol className="flex flex-col gap-1.5">
          {steps.map((step, index) => {
            const active = step.id === activeStepId
            return (
              <li
                key={step.id}
                className={`group flex items-center gap-2 rounded-md border p-1.5 transition ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectStep(step.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-zinc-700 bg-zinc-800">
                    {step.shot ? (
                      <img
                        src={step.shot.src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                  <span
                    className={`truncate text-xs font-semibold ${
                      active ? 'text-indigo-300' : 'text-zinc-400'
                    }`}
                  >
                    Step {index + 1}
                  </span>
                </button>

                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    title="Move up"
                    aria-label={`Move step ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveStep(step.id, -1)}
                    className="rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    aria-label={`Move step ${index + 1} down`}
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(step.id, 1)}
                    className="rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  title="Delete step"
                  aria-label={`Delete step ${index + 1}`}
                  onClick={() => removeStep(step.id)}
                  className="shrink-0 rounded p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="border-t border-zinc-800 p-2">
        <button
          type="button"
          onClick={addStep}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add step
        </button>
      </div>
    </aside>
  )
}
