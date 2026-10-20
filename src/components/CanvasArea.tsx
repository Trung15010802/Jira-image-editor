import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Arrow,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import { useImage } from '../hooks/useImage'
import {
  BADGE_BORDER,
  BADGE_FILL,
  BADGE_RADIUS_RATIO,
  BADGE_TEXT,
  getBadgeMetrics,
} from '../lib/badge'
import { newId } from '../lib/id'
import { getBoard } from '../lib/layout'
import { useEditor } from '../store/editorStore'
import type {
  Annotation,
  AreaAnnotation,
  Badge,
  Shot,
  ShotId,
  Snapshot,
  Tool,
} from '../types'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const computeFit = (
  width: number,
  height: number,
  boardWidth: number,
  boardHeight: number,
) => {
  const padding = 120
  const zoom = Math.min(
    (width - padding) / boardWidth,
    (height - padding) / boardHeight,
    1,
  )
  const next = clamp(zoom, 0.02, 1)
  return {
    zoom: next,
    x: (width - boardWidth * next) / 2,
    y: (height - boardHeight * next) / 2,
  }
}

interface Draft {
  shotId: ShotId
  type: Exclude<Tool, 'select' | 'text'>
  startX: number
  startY: number
  endX: number
  endY: number
}

interface TextDraft {
  shotId: ShotId
  x: number
  y: number
  screenX: number
  screenY: number
}

function ShotImage({ shot }: { shot: Shot }) {
  const image = useImage(shot.src)
  return (
    <>
      <Rect
        x={0}
        y={0}
        width={shot.width}
        height={shot.height}
        fill="#ffffff"
        shadowColor="#000000"
        shadowBlur={28}
        shadowOpacity={0.4}
        shadowOffset={{ x: 0, y: 10 }}
        listening={false}
      />
      <KonvaImage
        image={image ?? undefined}
        width={shot.width}
        height={shot.height}
        listening={false}
      />
      <Rect
        x={0}
        y={0}
        width={shot.width}
        height={shot.height}
        stroke="#3f3f46"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    </>
  )
}

const getAnnotationBounds = (annotation: Annotation) => {
  switch (annotation.type) {
    case 'arrow':
      return {
        x: Math.min(0, annotation.dx),
        y: Math.min(0, annotation.dy),
        width: Math.abs(annotation.dx),
        height: Math.abs(annotation.dy),
      }
    case 'text':
      return {
        x: 0,
        y: 0,
        width: Math.max(annotation.fontSize, annotation.text.length * annotation.fontSize * 0.55),
        height: annotation.fontSize * 1.25,
      }
    default:
      return {
        x: 0,
        y: 0,
        width: annotation.width,
        height: annotation.height,
      }
  }
}

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const annotationDragSnapshot = useRef<Snapshot | null>(null)
  const annotationDragOrigin = useRef<{ x: number; y: number } | null>(null)
  const guideDragSnapshot = useRef<Snapshot | null>(null)
  const guideDragOrigin = useRef<number | null>(null)
  const badgeDragSnapshot = useRef<Snapshot | null>(null)
  const badgeDragOrigin = useRef<{ x: number; y: number } | null>(null)
  const cancelText = useRef(false)

  const shots = useEditor((state) => state.shots)
  const activeId = useEditor((state) => state.activeId)
  const mode = useEditor((state) => state.mode)
  const tool = useEditor((state) => state.tool)
  const color = useEditor((state) => state.color)
  const textSize = useEditor((state) => state.textSize)
  const annotations = useEditor((state) => state.annotations)
  const guides = useEditor((state) => state.guides)
  const badges = useEditor((state) => state.badges)
  const selectedAnnotation = useEditor((state) => state.selectedAnnotation)
  const selectedGuideId = useEditor((state) => state.selectedGuideId)
  const selectedBadgeId = useEditor((state) => state.selectedBadgeId)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const [viewKey, setViewKey] = useState<string | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null)
  const [textValue, setTextValue] = useState('')

  const board = useMemo(
    () => getBoard(shots, mode, activeId),
    [shots, mode, activeId],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const fitToScreen = useCallback(() => {
    if (size.width === 0 || size.height === 0) return
    setView(computeFit(size.width, size.height, board.width, board.height))
  }, [size.width, size.height, board.width, board.height])

  const layoutKey =
    size.width > 0 && size.height > 0
      ? `${size.width}x${size.height}:${board.width}x${board.height}`
      : null
  if (layoutKey && layoutKey !== viewKey) {
    setViewKey(layoutKey)
    setView(computeFit(size.width, size.height, board.width, board.height))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.code !== 'Space' || typing) return
      event.preventDefault()
      setSpaceDown(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false)
    }
    const onBlur = () => setSpaceDown(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const screenToWorld = (pointer: { x: number; y: number }) => ({
    x: (pointer.x - view.x) / view.zoom,
    y: (pointer.y - view.y) / view.zoom,
  })

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    if (event.evt.ctrlKey || event.evt.metaKey) {
      const pointer = stageRef.current?.getPointerPosition()
      if (!pointer) return
      setView((current) => {
        const factor = Math.pow(1.0015, -event.evt.deltaY)
        const next = clamp(current.zoom * factor, 0.02, 8)
        const worldX = (pointer.x - current.x) / current.zoom
        const worldY = (pointer.y - current.y) / current.zoom
        return {
          zoom: next,
          x: pointer.x - worldX * next,
          y: pointer.y - worldY * next,
        }
      })
    } else {
      setView((current) => ({
        ...current,
        x: current.x - event.evt.deltaX,
        y: current.y - event.evt.deltaY,
      }))
    }
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (spaceDown) return
    if (event.target === event.target.getStage()) {
      useEditor.getState().clearSelection()
    }
  }

  const openTextEditor = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    shot: Shot,
  ) => {
    event.evt.preventDefault()
    const position = event.target.getRelativePointerPosition()
    if (!position) return
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x > shot.width ||
      position.y > shot.height
    ) {
      return
    }
    const stage = stageRef.current
    const rect = stage?.container().getBoundingClientRect()
    const mouse = event.evt as MouseEvent
    const screenX = rect
      ? clamp(mouse.clientX - rect.left, 8, Math.max(8, rect.width - 244))
      : 8
    const screenY = rect
      ? clamp(mouse.clientY - rect.top, 8, Math.max(8, rect.height - 48))
      : 8
    cancelText.current = false
    setTextValue('')
    setTextDraft({
      shotId: shot.id,
      x: position.x,
      y: position.y,
      screenX,
      screenY,
    })
    useEditor.getState().clearSelection()
  }

  const handleImageMouseDown = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    shot: Shot,
  ) => {
    if (spaceDown) return
    if (mode === 'compare' || tool === 'select') {
      useEditor.getState().clearSelection()
      return
    }
    event.cancelBubble = true
    if (tool === 'text') {
      openTextEditor(event, shot)
      return
    }
    const position = event.target.getRelativePointerPosition()
    if (!position) return
    setDraft({
      shotId: shot.id,
      type: tool,
      startX: position.x,
      startY: position.y,
      endX: position.x,
      endY: position.y,
    })
    useEditor.getState().clearSelection()
  }

  const handleStageMouseMove = () => {
    if (!draft) return
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    const placement = board.placements.find(
      (item) => item.shot.id === draft.shotId,
    )
    if (!placement) return
    const world = screenToWorld(pointer)
    setDraft((current) =>
      current
        ? {
            ...current,
            endX: clamp(world.x - placement.x, 0, placement.shot.width),
            endY: clamp(world.y - placement.y, 0, placement.shot.height),
          }
        : current,
    )
  }

  const handleStageMouseUp = () => {
    if (!draft) return
    const placement = board.placements.find(
      (item) => item.shot.id === draft.shotId,
    )
    setDraft(null)
    if (!placement) return

    const shot = placement.shot
    const { startX, startY, endX, endY, shotId, type } = draft
    const dx = endX - startX
    const dy = endY - startY
    const strokeWidth = Math.max(3, Math.round(shot.width / 400))
    let annotation: Annotation | null = null

    if (type === 'arrow') {
      if (Math.hypot(dx, dy) >= 6) {
        annotation = {
          id: newId('arrow'),
          type: 'arrow',
          x: startX,
          y: startY,
          dx,
          dy,
          color,
          strokeWidth,
        }
      }
    } else {
      const x = Math.min(startX, endX)
      const y = Math.min(startY, endY)
      const width = Math.abs(dx)
      const height = Math.abs(dy)
      if (width >= 6 && height >= 6) {
        if (type === 'box') {
          annotation = {
            id: newId('box'),
            type: 'box',
            x,
            y,
            width,
            height,
            color,
            strokeWidth,
          }
        } else {
          annotation = {
            id: newId(type),
            type,
            x,
            y,
            width,
            height,
          } satisfies AreaAnnotation
        }
      }
    }

    if (annotation) useEditor.getState().addAnnotation(shotId, annotation)
  }

  const commitText = () => {
    if (!textDraft) return
    const text = textValue.trim()
    const shot = shots.find((item) => item.id === textDraft.shotId)
    if (text && shot) {
      useEditor.getState().addAnnotation(textDraft.shotId, {
        id: newId('text'),
        type: 'text',
        x: textDraft.x,
        y: textDraft.y,
        text,
        color,
        fontSize: textSize,
      })
    }
    setTextDraft(null)
    setTextValue('')
  }

  const handleAnnotationDragStart = (annotation: Annotation) => {
    annotationDragSnapshot.current = useEditor.getState().snapshot()
    annotationDragOrigin.current = { x: annotation.x, y: annotation.y }
  }

  const handleAnnotationDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shotId: ShotId,
    annotation: Annotation,
  ) => {
    const node = event.target
    const snapshot = annotationDragSnapshot.current
    const origin = annotationDragOrigin.current
    annotationDragSnapshot.current = null
    annotationDragOrigin.current = null
    if (!snapshot || !origin) return
    if (
      Math.abs(node.x() - origin.x) < 0.5 &&
      Math.abs(node.y() - origin.y) < 0.5
    ) {
      return
    }
    const state = useEditor.getState()
    state.pushSnapshot(snapshot)
    state.updateAnnotation(shotId, annotation.id, {
      x: node.x(),
      y: node.y(),
    })
  }

  const handleBadgeDragStart = (badge: Badge) => {
    badgeDragSnapshot.current = useEditor.getState().snapshot()
    badgeDragOrigin.current = { x: badge.x, y: badge.y }
  }

  const handleBadgeDragEnd = (
    event: KonvaEventObject<DragEvent>,
    badge: Badge,
  ) => {
    const node = event.target
    const snapshot = badgeDragSnapshot.current
    const origin = badgeDragOrigin.current
    badgeDragSnapshot.current = null
    badgeDragOrigin.current = null
    if (!snapshot || !origin) return
    if (
      Math.abs(node.x() - origin.x) < 0.5 &&
      Math.abs(node.y() - origin.y) < 0.5
    ) {
      return
    }
    const state = useEditor.getState()
    state.pushSnapshot(snapshot)
    state.updateBadge(badge.id, { x: node.x(), y: node.y() })
  }

  const renderBadge = (shot: Shot, badge: Badge) => {
    const metrics = getBadgeMetrics(shot, badge.text)
    const editable = tool === 'select' && !spaceDown
    const selected = selectedBadgeId === badge.id
    return (
      <Group
        key={badge.id}
        x={badge.x}
        y={badge.y}
        draggable={editable}
        listening={editable}
        onMouseDown={(event) => {
          event.cancelBubble = true
          useEditor.getState().selectBadge(badge.id)
        }}
        onTap={(event) => {
          event.cancelBubble = true
          useEditor.getState().selectBadge(badge.id)
        }}
        onDragStart={() => handleBadgeDragStart(badge)}
        onDragEnd={(event) => handleBadgeDragEnd(event, badge)}
      >
        <Rect
          width={metrics.width}
          height={metrics.height}
          fill={BADGE_FILL}
          cornerRadius={metrics.height * BADGE_RADIUS_RATIO}
          stroke={selected ? '#38bdf8' : BADGE_BORDER}
          strokeWidth={selected ? 2 : 1.5}
          strokeScaleEnabled={false}
          shadowColor="#000000"
          shadowBlur={12}
          shadowOpacity={0.35}
          shadowOffset={{ x: 0, y: 4 }}
        />
        <Text
          text={badge.text}
          width={metrics.width}
          height={metrics.height}
          align="center"
          verticalAlign="middle"
          fill={BADGE_TEXT}
          fontSize={metrics.fontSize}
          fontStyle="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          listening={false}
        />
      </Group>
    )
  }

  const renderAnnotation = (shot: Shot, annotation: Annotation) => {
    const editable = mode === 'single' && tool === 'select' && !spaceDown
    const common = {
      draggable: editable,
      onMouseDown: (event: KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true
        useEditor.getState().selectAnnotation(shot.id, annotation.id)
      },
      onTap: (event: KonvaEventObject<TouchEvent>) => {
        event.cancelBubble = true
        useEditor.getState().selectAnnotation(shot.id, annotation.id)
      },
      onDragStart: () => handleAnnotationDragStart(annotation),
      onDragEnd: (event: KonvaEventObject<DragEvent>) =>
        handleAnnotationDragEnd(event, shot.id, annotation),
    }

    switch (annotation.type) {
      case 'arrow':
        return (
          <Arrow
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            points={[0, 0, annotation.dx, annotation.dy]}
            stroke={annotation.color}
            fill={annotation.color}
            strokeWidth={annotation.strokeWidth}
            pointerLength={Math.max(14, annotation.strokeWidth * 4)}
            pointerWidth={Math.max(14, annotation.strokeWidth * 4)}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={Math.max(18, annotation.strokeWidth * 4)}
          />
        )
      case 'box':
        return (
          <Rect
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            hitStrokeWidth={Math.max(16, annotation.strokeWidth * 3)}
          />
        )
      case 'text':
        return (
          <Text
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fill={annotation.color}
            fontSize={annotation.fontSize}
            fontStyle="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          />
        )
      case 'highlight':
        return (
          <Rect
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="rgba(250, 204, 21, 0.42)"
          />
        )
      case 'redact':
        return (
          <Rect
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="#0a0a0a"
          />
        )
      default:
        return null
    }
  }

  const renderSelection = (annotation: Annotation) => {
    const bounds = getAnnotationBounds(annotation)
    const padding = 6 / view.zoom
    return (
      <Rect
        x={annotation.x + bounds.x - padding}
        y={annotation.y + bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeScaleEnabled={false}
        dash={[5, 4]}
        listening={false}
      />
    )
  }

  const renderDraft = (shot: Shot) => {
    if (!draft) return null
    const x = Math.min(draft.startX, draft.endX)
    const y = Math.min(draft.startY, draft.endY)
    const width = Math.abs(draft.endX - draft.startX)
    const height = Math.abs(draft.endY - draft.startY)
    const strokeWidth = Math.max(3, Math.round(shot.width / 400))

    if (draft.type === 'arrow') {
      return (
        <Arrow
          points={[draft.startX, draft.startY, draft.endX, draft.endY]}
          stroke={color}
          fill={color}
          strokeWidth={strokeWidth}
          pointerLength={Math.max(14, strokeWidth * 4)}
          pointerWidth={Math.max(14, strokeWidth * 4)}
          dash={[8, 5]}
          listening={false}
        />
      )
    }
    if (draft.type === 'box') {
      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={[8, 5]}
          listening={false}
        />
      )
    }
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={draft.type === 'highlight' ? 'rgba(250, 204, 21, 0.42)' : '#0a0a0a'}
        opacity={draft.type === 'redact' ? 0.75 : 1}
        listening={false}
      />
    )
  }

  const zoomAtCenter = (factor: number) => {
    setView((current) => {
      const centerX = size.width / 2
      const centerY = size.height / 2
      const next = clamp(current.zoom * factor, 0.02, 8)
      const worldX = (centerX - current.x) / current.zoom
      const worldY = (centerY - current.y) / current.zoom
      return {
        zoom: next,
        x: centerX - worldX * next,
        y: centerY - worldY * next,
      }
    })
  }

  const resetZoom = () => {
    setView({
      zoom: 1,
      x: (size.width - board.width) / 2,
      y: (size.height - board.height) / 2,
    })
  }

  const cursorClass = spaceDown
    ? 'cursor-grab active:cursor-grabbing'
    : tool === 'select'
      ? 'cursor-default'
      : 'cursor-crosshair'

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden bg-[#0d0d10]">
      <div
        ref={containerRef}
        className={`absolute inset-0 ${cursorClass}`}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.zoom}
          scaleY={view.zoom}
          draggable={spaceDown}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onDragEnd={(event) => {
            const stage = event.target.getStage()
            if (event.target !== stage) return
            setView((current) => ({ ...current, x: stage.x(), y: stage.y() }))
          }}
        >
          <Layer>
            {board.placements.map((placement) => {
              const shot = placement.shot
              const shotAnnotations = annotations[shot.id] ?? []
              const shotBadges = badges.filter(
                (badge) => badge.shotId === shot.id,
              )
              const selected =
                selectedAnnotation?.shotId === shot.id
                  ? shotAnnotations.find(
                      (annotation) => annotation.id === selectedAnnotation.id,
                    )
                  : undefined
              return (
                <Group key={shot.id} x={placement.x} y={placement.y}>
                  <ShotImage shot={shot} />
                  <Rect
                    x={0}
                    y={0}
                    width={shot.width}
                    height={shot.height}
                    fill="rgba(0,0,0,0.001)"
                    onMouseDown={(event) => handleImageMouseDown(event, shot)}
                    onTap={(event) => handleImageMouseDown(event, shot)}
                  />
                  {shotAnnotations.map((annotation) =>
                    renderAnnotation(shot, annotation),
                  )}
                  {selected ? renderSelection(selected) : null}
                  {shotBadges.map((badge) => renderBadge(shot, badge))}
                  {draft?.shotId === shot.id ? renderDraft(shot) : null}
                  {mode === 'compare' ? (
                    <Text
                      x={0}
                      y={-22 / view.zoom}
                      text={`${shot.id.toUpperCase()} · ${shot.name}`}
                      fontSize={13 / view.zoom}
                      fill="#a1a1aa"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                      listening={false}
                    />
                  ) : null}
                </Group>
              )
            })}

            {guides.map((guide) => {
              const horizontal = guide.orientation === 'horizontal'
              const selected = selectedGuideId === guide.id
              const interactive = tool === 'select' && !spaceDown
              return (
                <Line
                  key={guide.id}
                  x={horizontal ? 0 : guide.position}
                  y={horizontal ? guide.position : 0}
                  points={
                    horizontal
                      ? [0, 0, board.width, 0]
                      : [0, 0, 0, board.height]
                  }
                  stroke={selected ? '#22d3ee' : 'rgba(34, 211, 238, 0.65)'}
                  strokeWidth={selected ? 2 : 1}
                  strokeScaleEnabled={false}
                  hitStrokeWidth={14 / view.zoom}
                  draggable={interactive}
                  listening={interactive}
                  onMouseDown={(event) => {
                    event.cancelBubble = true
                    useEditor.getState().selectGuide(guide.id)
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true
                    useEditor.getState().selectGuide(guide.id)
                  }}
                  onDragStart={() => {
                    guideDragSnapshot.current = useEditor.getState().snapshot()
                    guideDragOrigin.current = guide.position
                  }}
                  onDragEnd={(event) => {
                    const node = event.target
                    const position = horizontal ? node.y() : node.x()
                    const snapshot = guideDragSnapshot.current
                    const origin = guideDragOrigin.current
                    guideDragSnapshot.current = null
                    guideDragOrigin.current = null
                    if (!snapshot || origin === null) return
                    if (Math.abs(position - origin) < 0.5) return
                    const state = useEditor.getState()
                    state.pushSnapshot(snapshot)
                    state.updateGuide(guide.id, position)
                  }}
                  onDblClick={() => useEditor.getState().removeGuide(guide.id)}
                />
              )
            })}
          </Layer>
        </Stage>
      </div>

      {shots.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 px-8 py-7 text-center shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-zinc-100">
              Add a screenshot to begin
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Drop an image anywhere, paste with{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[11px]">
                Ctrl+V
              </kbd>
              , or click Import. Add two screenshots to compare them side by
              side.
            </p>
            <p className="mt-3 text-[11px] text-zinc-600">
              Annotate with arrows, boxes, text, highlights and redaction.
              Add draggable guides to line things up.
            </p>
          </div>
        </div>
      ) : null}

      {textDraft ? (
        <div
          className="absolute z-20"
          style={{ left: textDraft.screenX, top: textDraft.screenY }}
        >
          <input
            autoFocus
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            onBlur={() => {
              if (cancelText.current) {
                cancelText.current = false
                setTextDraft(null)
                setTextValue('')
                return
              }
              commitText()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                cancelText.current = true
                event.currentTarget.blur()
              }
            }}
            placeholder="Type text, Enter to add"
            style={{ color }}
            className="w-56 rounded-md border border-indigo-500 bg-zinc-900/95 px-2.5 py-1.5 text-sm shadow-xl outline-none placeholder:text-zinc-600"
          />
        </div>
      ) : null}

      {shots.length > 0 ? (
        <>
          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              title="Zoom out"
              onClick={() => zoomAtCenter(0.8)}
              className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Reset to 100%"
              onClick={resetZoom}
              className="min-w-14 rounded px-1 py-1 text-xs tabular-nums text-zinc-300 transition hover:bg-zinc-800"
            >
              {Math.round(view.zoom * 100)}%
            </button>
            <button
              type="button"
              title="Zoom in"
              onClick={() => zoomAtCenter(1.25)}
              className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-zinc-700" />
            <button
              type="button"
              title="Fit to screen"
              onClick={fitToScreen}
              className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-500 backdrop-blur">
            {mode === 'compare'
              ? 'Comparing side by side · guides span both'
              : 'Space+drag to pan · Ctrl+wheel to zoom'}
          </div>
        </>
      ) : null}
    </div>
  )
}
