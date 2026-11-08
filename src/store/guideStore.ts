import { create } from 'zustand'
import { newId } from '../lib/id'
import type { PreparedShot } from '../lib/image'
import type {
  Annotation,
  CalloutShapeKind,
  GuideStep,
  Tool,
} from '../types'

const MAX_HISTORY = 60

export const DEFAULT_GUIDE_TEXT_SIZE = 32

const clampTextSize = (size: number) =>
  Math.min(256, Math.max(8, Math.round(size)))

interface GuideState {
  active: boolean
  steps: GuideStep[]
  activeStepId: string | null
  selectedAnnotationId: string | null
  tool: Tool
  color: string
  textSize: number
  calloutTextSize: number | null
  calloutShape: CalloutShapeKind
  past: GuideStep[][]
  future: GuideStep[][]

  enter: () => void
  exit: () => void
  selectStep: (id: string) => void
  addStep: () => void
  removeStep: (id: string) => void
  moveStep: (id: string, offset: -1 | 1) => void
  pasteShot: (shot: PreparedShot) => void

  setTool: (tool: Tool) => void
  setColor: (color: string) => void
  setTextSize: (size: number) => void
  setCalloutShape: (shape: CalloutShapeKind) => void
  resizeText: (size: number) => void
  resizeCallout: (size: number) => void

  addAnnotation: (stepId: string, annotation: Annotation) => void
  updateAnnotation: (stepId: string, id: string, patch: Partial<Annotation>) => void
  selectAnnotation: (id: string | null) => void
  removeSelected: () => void
  pushHistory: (snapshot: GuideStep[]) => void

  undo: () => void
  redo: () => void
}

const mapStep = (
  steps: GuideStep[],
  stepId: string,
  fn: (step: GuideStep) => GuideStep,
) => steps.map((step) => (step.id === stepId ? fn(step) : step))

const keepActiveStep = (steps: GuideStep[], activeId: string | null) =>
  steps.some((step) => step.id === activeId) ? activeId : (steps[0]?.id ?? null)

const insertAfter = (
  steps: GuideStep[],
  stepId: string | null,
  step: GuideStep,
) => {
  const index = steps.findIndex((item) => item.id === stepId)
  if (index < 0) return [...steps, step]
  return [...steps.slice(0, index + 1), step, ...steps.slice(index + 1)]
}

export const useGuide = create<GuideState>((set, get) => {
  const commit = (next: GuideStep[], extra: Partial<GuideState> = {}) =>
    set((state) => ({
      ...extra,
      steps: next,
      past: [...state.past, state.steps].slice(-MAX_HISTORY),
      future: [],
    }))

  return {
    active: false,
    steps: [],
    activeStepId: null,
    selectedAnnotationId: null,
    tool: 'select',
    color: '#ef4444',
    textSize: DEFAULT_GUIDE_TEXT_SIZE,
    calloutTextSize: null,
    calloutShape: 'circle',
    past: [],
    future: [],

    enter: () => set({ active: true }),

    exit: () => set({ active: false, selectedAnnotationId: null, tool: 'select' }),

    selectStep: (id) => set({ activeStepId: id, selectedAnnotationId: null }),

    addStep: () => {
      const step: GuideStep = { id: newId('step'), shot: null, annotations: [] }
      const { steps, activeStepId } = get()
      commit(insertAfter(steps, activeStepId, step), {
        activeStepId: step.id,
        selectedAnnotationId: null,
      })
    },

    removeStep: (id) => {
      const { steps, activeStepId } = get()
      const index = steps.findIndex((step) => step.id === id)
      if (index < 0) return
      const next = steps.filter((step) => step.id !== id)
      const nextActive =
        activeStepId === id
          ? (next[Math.max(0, index - 1)]?.id ?? null)
          : activeStepId
      commit(next, { activeStepId: nextActive, selectedAnnotationId: null })
    },

    moveStep: (id, offset) => {
      const { steps } = get()
      const index = steps.findIndex((step) => step.id === id)
      const target = index + offset
      if (index < 0 || target < 0 || target >= steps.length) return
      const next = [...steps]
      ;[next[index], next[target]] = [next[target], next[index]]
      commit(next)
    },

    pasteShot: (shot) => {
      const { steps, activeStepId } = get()
      const active = steps.find((step) => step.id === activeStepId)
      if (active && !active.shot) {
        commit(mapStep(steps, active.id, (step) => ({ ...step, shot })), {
          selectedAnnotationId: null,
        })
        return
      }
      const step: GuideStep = { id: newId('step'), shot, annotations: [] }
      commit(insertAfter(steps, activeStepId, step), {
        activeStepId: step.id,
        selectedAnnotationId: null,
      })
    },

    setTool: (tool) =>
      set((state) => ({
        tool,
        selectedAnnotationId:
          tool === 'select' ? state.selectedAnnotationId : null,
      })),

    setColor: (color) => set({ color }),

    setTextSize: (size) => set({ textSize: clampTextSize(size) }),

    setCalloutShape: (shape) => set({ calloutShape: shape }),

    resizeText: (size) => {
      const value = clampTextSize(size)
      const { steps, activeStepId, selectedAnnotationId } = get()
      const step = steps.find((item) => item.id === activeStepId)
      const target = step?.annotations.find(
        (annotation) => annotation.id === selectedAnnotationId,
      )
      if (!step || target?.type !== 'text') {
        set({ textSize: value })
        return
      }
      commit(
        mapStep(steps, step.id, (item) => ({
          ...item,
          annotations: item.annotations.map((annotation) =>
            annotation.id === target.id
              ? { ...annotation, fontSize: value }
              : annotation,
          ),
        })),
      )
    },

    resizeCallout: (size) => {
      const value = clampTextSize(size)
      const { steps, activeStepId, selectedAnnotationId } = get()
      const step = steps.find((item) => item.id === activeStepId)
      const target = step?.annotations.find(
        (annotation) => annotation.id === selectedAnnotationId,
      )
      if (!step || target?.type !== 'callout') {
        set({ calloutTextSize: value })
        return
      }
      commit(
        mapStep(steps, step.id, (item) => ({
          ...item,
          annotations: item.annotations.map((annotation) =>
            annotation.id === target.id
              ? { ...annotation, fontSize: value }
              : annotation,
          ),
        })),
      )
      set({ calloutTextSize: value })
    },

    addAnnotation: (stepId, annotation) => {
      const { steps } = get()
      commit(
        mapStep(steps, stepId, (step) => ({
          ...step,
          annotations: [...step.annotations, annotation],
        })),
        { selectedAnnotationId: annotation.id },
      )
    },

    updateAnnotation: (stepId, id, patch) =>
      set((state) => ({
        steps: mapStep(state.steps, stepId, (step) => ({
          ...step,
          annotations: step.annotations.map((annotation) =>
            annotation.id === id
              ? ({ ...annotation, ...patch } as Annotation)
              : annotation,
          ),
        })),
      })),

    selectAnnotation: (id) => set({ selectedAnnotationId: id }),

    removeSelected: () => {
      const { steps, activeStepId, selectedAnnotationId } = get()
      if (!selectedAnnotationId) return
      commit(
        mapStep(steps, activeStepId ?? '', (step) => ({
          ...step,
          annotations: step.annotations.filter(
            (annotation) => annotation.id !== selectedAnnotationId,
          ),
        })),
        { selectedAnnotationId: null },
      )
    },

    pushHistory: (snapshot) =>
      set((state) => ({
        past: [...state.past, snapshot].slice(-MAX_HISTORY),
        future: [],
      })),

    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1]
        if (!previous) return state
        return {
          steps: previous,
          activeStepId: keepActiveStep(previous, state.activeStepId),
          selectedAnnotationId: null,
          past: state.past.slice(0, -1),
          future: [state.steps, ...state.future].slice(0, MAX_HISTORY),
        }
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0]
        if (!next) return state
        return {
          steps: next,
          activeStepId: keepActiveStep(next, state.activeStepId),
          selectedAnnotationId: null,
          past: [...state.past, state.steps].slice(-MAX_HISTORY),
          future: state.future.slice(1),
        }
      }),
  }
})
