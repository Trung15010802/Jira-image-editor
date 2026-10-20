import { create } from 'zustand'
import { getBoard } from '../lib/layout'
import type { PreparedShot } from '../lib/image'
import type {
  Annotation,
  Badge,
  BadgeStyle,
  Guide,
  Mode,
  Shot,
  ShotId,
  Snapshot,
  Tool,
} from '../types'

const MAX_HISTORY = 60

export const MIN_TEXT_SIZE = 8
export const MAX_TEXT_SIZE = 256
export const DEFAULT_TEXT_SIZE = 32

const clampTextSize = (size: number) =>
  Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, Math.round(size)))

let idCounter = 0
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

interface EditorState {
  shots: Shot[]
  activeId: ShotId | null
  mode: Mode
  tool: Tool
  color: string
  textSize: number
  annotations: Record<string, Annotation[]>
  guides: Guide[]
  badges: Badge[]
  badgeStyle: BadgeStyle
  selectedAnnotation: { shotId: ShotId; id: string } | null
  selectedGuideId: string | null
  selectedBadgeId: string | null
  past: Snapshot[]
  future: Snapshot[]
  exportOpen: boolean

  importShots: (prepared: PreparedShot[]) => void
  removeShot: (id: ShotId) => void
  setActive: (id: ShotId) => void
  setMode: (mode: Mode) => void
  setTool: (tool: Tool) => void
  setColor: (color: string) => void
  setTextSize: (size: number) => void
  resizeText: (size: number) => void

  addAnnotation: (shotId: ShotId, annotation: Annotation) => void
  updateAnnotation: (
    shotId: ShotId,
    id: string,
    patch: Partial<Annotation>,
  ) => void
  selectAnnotation: (shotId: ShotId, id: string) => void
  clearSelection: () => void
  removeSelected: () => void

  addGuide: (orientation: Guide['orientation']) => void
  updateGuide: (id: string, position: number) => void
  selectGuide: (id: string) => void
  removeGuide: (id: string) => void
  clearGuides: () => void

  setBadgeStyle: (style: BadgeStyle) => void
  updateBadge: (id: string, patch: Partial<Pick<Badge, 'x' | 'y' | 'text'>>) => void
  selectBadge: (id: string) => void
  removeBadge: (id: string) => void

  pushSnapshot: (snapshot: Snapshot) => void
  snapshot: () => Snapshot
  undo: () => void
  redo: () => void
  openExport: () => void
  closeExport: () => void
}

const cloneAnnotations = (annotations: Record<string, Annotation[]>) =>
  Object.fromEntries(
    Object.entries(annotations).map(([shotId, list]) => [
      shotId,
      list.map((annotation) => ({ ...annotation })),
    ]),
  )

const snapshotOf = (state: {
  shots: Shot[]
  annotations: Record<string, Annotation[]>
  guides: Guide[]
  badges: Badge[]
  badgeStyle: BadgeStyle
  activeId: ShotId | null
  mode: Mode
}): Snapshot => ({
  shots: state.shots.map((shot) => ({ ...shot })),
  annotations: cloneAnnotations(state.annotations),
  guides: state.guides.map((guide) => ({ ...guide })),
  badges: state.badges.map((badge) => ({ ...badge })),
  badgeStyle: state.badgeStyle,
  activeId: state.activeId,
  mode: state.mode,
})

const buildBadges = (
  shots: Shot[],
  style: BadgeStyle,
  existing: Badge[],
): Badge[] => {
  if (style === 'none') return []
  const ordered = [...shots].sort((a, b) => a.id.localeCompare(b.id))
  return ordered.map((shot, index) => {
    const previous = existing.find((badge) => badge.shotId === shot.id)
    const text =
      style === 'number' ? String(index + 1) : index === 0 ? 'Before' : 'After'
    return {
      id: previous?.id ?? makeId('badge'),
      shotId: shot.id,
      text,
      x: previous?.x ?? 18,
      y: previous?.y ?? 18,
    }
  })
}

export const useEditor = create<EditorState>((set, get) => {
  const commit = (
    producer: (state: EditorState) => Partial<EditorState>,
  ) =>
    set((state) => {
      const partial = producer(state)
      return {
        ...partial,
        past: [...state.past, snapshotOf(state)].slice(-MAX_HISTORY),
        future: [],
      }
    })

  return {
    shots: [],
    activeId: null,
    mode: 'single',
    tool: 'select',
    color: '#ef4444',
    textSize: DEFAULT_TEXT_SIZE,
    annotations: {},
    guides: [],
    badges: [],
    badgeStyle: 'none',
    selectedAnnotation: null,
    selectedGuideId: null,
    selectedBadgeId: null,
    past: [],
    future: [],
    exportOpen: false,

    importShots: (prepared) => {
      if (prepared.length === 0) return

      commit((state) => {
        const annotations = { ...state.annotations }
        let shots = [...state.shots]
        let activeId = state.activeId
        let added = false

        if (shots.length === 0) {
          const first: Shot = { id: 'a', ...prepared[0] }
          shots = [first]
          annotations.a = []
          activeId = 'a'
          added = true

          if (prepared[1]) {
            shots.push({ id: 'b', ...prepared[1] })
            annotations.b = []
            added = true
          }
        } else if (shots.length === 1) {
          const existing = shots[0]
          const missingId: ShotId = existing.id === 'a' ? 'b' : 'a'
          shots = [
            ...shots,
            { id: missingId, ...prepared[0] },
          ].sort((a, b) => a.id.localeCompare(b.id))
          annotations[missingId] = []
          activeId = state.activeId ?? shots[0].id
          added = true
        } else {
          const target = activeId ?? shots[0].id
          shots = shots.map((shot) =>
            shot.id === target ? { ...shot, ...prepared[0] } : shot,
          )
          annotations[target] = []
        }

        const nextMode: Mode =
          shots.length < 2 ? 'single' : added ? 'compare' : state.mode

        return {
          shots,
          annotations,
          badges: buildBadges(shots, state.badgeStyle, state.badges),
          activeId,
          mode: nextMode,
          selectedAnnotation: null,
          selectedGuideId: null,
          selectedBadgeId: null,
        }
      })
    },

    removeShot: (id) => {
      if (!get().shots.some((shot) => shot.id === id)) return
      commit((state) => {
        const shots = state.shots.filter((shot) => shot.id !== id)
        const annotations = { ...state.annotations }
        delete annotations[id]
        return {
          shots,
          annotations,
          badges: buildBadges(shots, state.badgeStyle, state.badges),
          activeId:
            state.activeId === id
              ? (shots[0]?.id ?? null)
              : (state.activeId ?? shots[0]?.id ?? null),
          mode: shots.length < 2 ? 'single' : state.mode,
          selectedAnnotation: null,
          selectedGuideId: null,
          selectedBadgeId: null,
        }
      })
    },

    setActive: (id) =>
      set({
        activeId: id,
        mode: 'single',
        selectedAnnotation: null,
        selectedGuideId: null,
        selectedBadgeId: null,
      }),

    setMode: (mode) => {
      if (mode === 'compare' && get().shots.length < 2) return
      set({
        mode,
        tool: mode === 'compare' ? 'select' : get().tool,
        selectedAnnotation: null,
        selectedGuideId: null,
        selectedBadgeId: null,
      })
    },

    setTool: (tool) =>
      set((state) => ({
        tool,
        mode:
          tool !== 'select' && state.mode === 'compare'
            ? 'single'
            : state.mode,
        selectedAnnotation: tool === 'select' ? state.selectedAnnotation : null,
      })),

    setColor: (color) => set({ color }),

    setTextSize: (size) => set({ textSize: clampTextSize(size) }),

    resizeText: (size) => {
      const value = clampTextSize(size)
      const { selectedAnnotation, annotations } = get()
      const target = selectedAnnotation
        ? (annotations[selectedAnnotation.shotId] ?? []).find(
            (annotation) =>
              annotation.id === selectedAnnotation.id &&
              annotation.type === 'text',
          )
        : undefined

      if (!selectedAnnotation || !target) {
        set({ textSize: value })
        return
      }

      const shotId = selectedAnnotation.shotId
      const targetId = target.id
      commit((state) => ({
        annotations: {
          ...state.annotations,
          [shotId]: (state.annotations[shotId] ?? []).map((annotation) =>
            annotation.id === targetId
              ? ({ ...annotation, fontSize: value } as Annotation)
              : annotation,
          ),
        },
      }))
    },

    addAnnotation: (shotId, annotation) =>
      commit((state) => ({
        annotations: {
          ...state.annotations,
          [shotId]: [...(state.annotations[shotId] ?? []), annotation],
        },
        selectedAnnotation: { shotId, id: annotation.id },
        selectedGuideId: null,
        selectedBadgeId: null,
      })),

    updateAnnotation: (shotId, id, patch) =>
      set((state) => ({
        annotations: {
          ...state.annotations,
          [shotId]: (state.annotations[shotId] ?? []).map((annotation) =>
            annotation.id === id
              ? ({ ...annotation, ...patch } as Annotation)
              : annotation,
          ),
        },
      })),

    selectAnnotation: (shotId, id) =>
      set({
        selectedAnnotation: { shotId, id },
        selectedGuideId: null,
        selectedBadgeId: null,
      }),

    clearSelection: () =>
      set({
        selectedAnnotation: null,
        selectedGuideId: null,
        selectedBadgeId: null,
      }),

    removeSelected: () => {
      const { selectedAnnotation, selectedGuideId, selectedBadgeId } = get()
      if (!selectedAnnotation && !selectedGuideId && !selectedBadgeId) return

      commit((state) => {
        if (selectedAnnotation) {
          return {
            annotations: {
              ...state.annotations,
              [selectedAnnotation.shotId]: (
                state.annotations[selectedAnnotation.shotId] ?? []
              ).filter((annotation) => annotation.id !== selectedAnnotation.id),
            },
            selectedAnnotation: null,
          }
        }
        if (selectedBadgeId) {
          return {
            badges: state.badges.filter((badge) => badge.id !== selectedBadgeId),
            selectedBadgeId: null,
          }
        }
        return {
          guides: state.guides.filter((guide) => guide.id !== selectedGuideId),
          selectedGuideId: null,
        }
      })
    },

    addGuide: (orientation) =>
      commit((state) => {
        const board = getBoard(state.shots, state.mode, state.activeId)
        const guide: Guide = {
          id: makeId('guide'),
          orientation,
          position:
            orientation === 'horizontal' ? board.height / 2 : board.width / 2,
        }
        return {
          guides: [...state.guides, guide],
          selectedGuideId: guide.id,
          selectedAnnotation: null,
        }
      }),

    updateGuide: (id, position) =>
      set((state) => ({
        guides: state.guides.map((guide) =>
          guide.id === id ? { ...guide, position } : guide,
        ),
      })),

    selectGuide: (id) =>
      set({
        selectedGuideId: id,
        selectedAnnotation: null,
        selectedBadgeId: null,
      }),

    removeGuide: (id) => {
      if (!get().guides.some((guide) => guide.id === id)) return
      commit((state) => ({
        guides: state.guides.filter((guide) => guide.id !== id),
        selectedGuideId:
          state.selectedGuideId === id ? null : state.selectedGuideId,
      }))
    },

    clearGuides: () => {
      if (get().guides.length === 0) return
      commit(() => ({
        guides: [],
        selectedGuideId: null,
      }))
    },

    setBadgeStyle: (style) =>
      commit((state) => ({
        badges: buildBadges(state.shots, style, state.badges),
        badgeStyle: style,
        selectedBadgeId: null,
      })),

    updateBadge: (id, patch) =>
      set((state) => ({
        badges: state.badges.map((badge) =>
          badge.id === id ? { ...badge, ...patch } : badge,
        ),
      })),

    selectBadge: (id) =>
      set({
        selectedBadgeId: id,
        selectedAnnotation: null,
        selectedGuideId: null,
      }),

    removeBadge: (id) => {
      if (!get().badges.some((badge) => badge.id === id)) return
      commit((state) => ({
        badges: state.badges.filter((badge) => badge.id !== id),
        selectedBadgeId:
          state.selectedBadgeId === id ? null : state.selectedBadgeId,
      }))
    },

    snapshot: () => snapshotOf(get()),

    pushSnapshot: (snapshot) =>
      set((state) => ({
        past: [...state.past, snapshot].slice(-MAX_HISTORY),
        future: [],
      })),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return state
        const previous = state.past[state.past.length - 1]
        const current = snapshotOf(state)
        return {
          shots: previous.shots.map((shot) => ({ ...shot })),
          annotations: cloneAnnotations(previous.annotations),
          guides: previous.guides.map((guide) => ({ ...guide })),
          badges: previous.badges.map((badge) => ({ ...badge })),
          badgeStyle: previous.badgeStyle,
          activeId: previous.activeId,
          mode: previous.mode,
          selectedAnnotation: null,
          selectedGuideId: null,
          selectedBadgeId: null,
          past: state.past.slice(0, -1),
          future: [current, ...state.future].slice(0, MAX_HISTORY),
        }
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return state
        const next = state.future[0]
        const current = snapshotOf(state)
        return {
          shots: next.shots.map((shot) => ({ ...shot })),
          annotations: cloneAnnotations(next.annotations),
          guides: next.guides.map((guide) => ({ ...guide })),
          badges: next.badges.map((badge) => ({ ...badge })),
          badgeStyle: next.badgeStyle,
          activeId: next.activeId,
          mode: next.mode,
          selectedAnnotation: null,
          selectedGuideId: null,
          selectedBadgeId: null,
          past: [...state.past, current].slice(-MAX_HISTORY),
          future: state.future.slice(1),
        }
      }),

    openExport: () => {
      if (get().shots.length > 0) set({ exportOpen: true })
    },
    closeExport: () => set({ exportOpen: false }),
  }
})
