import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Arrow,
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import { useImage } from '../../hooks/useImage'
import {
  BADGE_BORDER,
  BADGE_FILL,
  BADGE_RADIUS_RATIO,
  BADGE_TEXT,
  getBadgeMetrics,
} from '../../lib/badge'
import { buildCallout, getCalloutLayout } from '../../lib/callout'
import { newId } from '../../lib/id'
import type { PreparedShot } from '../../lib/image'
import { useGuide } from '../../store/guideStore'
import type { Annotation, CalloutAnnotation, GuideStep, Tool } from '../../types'
import { CalloutShape } from '../CalloutShape'
import type { CalloutPart } from '../CalloutShape'
import { CalloutTextInput } from '../CalloutTextInput'

const BADGE_OFFSET = 18

interface CalloutEdit {
  stepId: string
  id: string
  left: number
  top: number
  initialValue: string
  color: string
}

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
  type: Exclude<Tool, 'select' | 'text'>
  startX: number
  startY: number
  endX: number
  endY: number
  points: number[]
}

interface TextDraft {
  x: number
  y: number
  screenX: number
  screenY: number
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
    case 'ellipse':
      return {
        x: -annotation.radiusX,
        y: -annotation.radiusY,
        width: annotation.radiusX * 2,
        height: annotation.radiusY * 2,
      }
    case 'pen': {
      const xs = annotation.points.filter((_, index) => index % 2 === 0)
      const ys = annotation.points.filter((_, index) => index % 2 === 1)
      const minX = xs.reduce((min, value) => Math.min(min, value), Infinity)
      const minY = ys.reduce((min, value) => Math.min(min, value), Infinity)
      const maxX = xs.reduce((max, value) => Math.max(max, value), -Infinity)
      const maxY = ys.reduce((max, value) => Math.max(max, value), -Infinity)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    case 'callout':
      return getCalloutLayout(annotation).bounds
    case 'text':
      return {
        x: 0,
        y: 0,
        width: Math.max(
          annotation.fontSize,
          annotation.text.length * annotation.fontSize * 0.55,
        ),
        height: annotation.fontSize * 1.25,
      }
    default:
      return { x: 0, y: 0, width: annotation.width, height: annotation.height }
  }
}

const buildAnnotation = (
  draft: Draft,
  color: string,
  imageWidth: number,
): Annotation | null => {
  const { startX, startY, endX, endY, type, points } = draft
  const dx = endX - startX
  const dy = endY - startY
  const strokeWidth = Math.max(3, Math.round(imageWidth / 400))

  if (type === 'callout') return null

  if (type === 'arrow') {
    if (Math.hypot(dx, dy) < 6) return null
    return {
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

  if (type === 'pen') {
    if (points.length < 4) return null
    const originX = points[0]
    const originY = points[1]
    return {
      id: newId('pen'),
      type: 'pen',
      x: originX,
      y: originY,
      points: points.map((value, index) =>
        index % 2 === 0 ? value - originX : value - originY,
      ),
      color,
      strokeWidth,
    }
  }

  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.abs(dx)
  const height = Math.abs(dy)
  if (width < 6 || height < 6) return null

  if (type === 'ellipse') {
    return {
      id: newId('ellipse'),
      type: 'ellipse',
      x: x + width / 2,
      y: y + height / 2,
      radiusX: width / 2,
      radiusY: height / 2,
      color,
      strokeWidth,
    }
  }

  return {
    id: newId('box'),
    type: 'box',
    x,
    y,
    width,
    height,
    color,
    strokeWidth,
  }
}

function StepImage({ shot }: { shot: PreparedShot }) {
  const image = useImage(shot.src)
  return (
    <>
      <Rect
        x={0}
        y={0}
        width={shot.width}
        height={shot.height}
        fill="#ffffff"
        listening={false}
      />
      <KonvaImage
        image={image ?? undefined}
        width={shot.width}
        height={shot.height}
        listening={false}
      />
    </>
  )
}

export function GuideCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const dragSnapshot = useRef<GuideStep[] | null>(null)
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)
  const calloutDragSnapshot = useRef<GuideStep[] | null>(null)
  const cancelText = useRef(false)

  const steps = useGuide((state) => state.steps)
  const activeStepId = useGuide((state) => state.activeStepId)
  const tool = useGuide((state) => state.tool)
  const color = useGuide((state) => state.color)
  const textSize = useGuide((state) => state.textSize)
  const calloutTextSize = useGuide((state) => state.calloutTextSize)
  const calloutShape = useGuide((state) => state.calloutShape)
  const selectedAnnotationId = useGuide((state) => state.selectedAnnotationId)

  const stepIndex = steps.findIndex((item) => item.id === activeStepId)
  const step = stepIndex >= 0 ? steps[stepIndex] : null
  const shot = step?.shot ?? null

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const [viewKey, setViewKey] = useState<string | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null)
  const [textValue, setTextValue] = useState('')
  const [calloutEdit, setCalloutEdit] = useState<CalloutEdit | null>(null)

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

  const fitKey =
    step && shot && size.width > 0 && size.height > 0
      ? `${size.width}x${size.height}:${step.id}:${shot.width}x${shot.height}`
      : null
  if (step && shot && fitKey && fitKey !== viewKey) {
    setViewKey(fitKey)
    setView(computeFit(size.width, size.height, shot.width, shot.height))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
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

  const pointerOnImage = () => {
    const position = stageRef.current?.getRelativePointerPosition()
    if (!position || !shot) return null
    return {
      x: clamp(position.x, 0, shot.width),
      y: clamp(position.y, 0, shot.height),
    }
  }

  const openTextEditor = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    position: { x: number; y: number },
  ) => {
    event.evt.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const mouse = event.evt as MouseEvent
    const screenX = rect
      ? clamp(mouse.clientX - rect.left, 8, Math.max(8, rect.width - 244))
      : 8
    const screenY = rect
      ? clamp(mouse.clientY - rect.top, 8, Math.max(8, rect.height - 48))
      : 8
    cancelText.current = false
    setTextValue('')
    setTextDraft({ x: position.x, y: position.y, screenX, screenY })
    useGuide.getState().selectAnnotation(null)
  }

  const handleImageMouseDown = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (spaceDown || !step || !shot) return
    event.cancelBubble = true
    if (tool === 'select') {
      useGuide.getState().selectAnnotation(null)
      return
    }
    const position = pointerOnImage()
    if (!position) return
    if (tool === 'text') {
      openTextEditor(event, position)
      return
    }
    setDraft({
      type: tool,
      startX: position.x,
      startY: position.y,
      endX: position.x,
      endY: position.y,
      points: [position.x, position.y],
    })
    useGuide.getState().selectAnnotation(null)
  }

  const handleStageMouseMove = () => {
    if (!draft) return
    const position = pointerOnImage()
    if (!position) return
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        endX: position.x,
        endY: position.y,
        points:
          current.type === 'pen'
            ? [...current.points, position.x, position.y]
            : current.points,
      }
    })
  }

  const openCalloutEditor = (stepId: string, annotation: CalloutAnnotation) => {
    const layout = getCalloutLayout(annotation)
    setCalloutEdit({
      stepId,
      id: annotation.id,
      left: (annotation.x + layout.label.x) * view.zoom + view.x,
      top: (annotation.y + layout.label.y) * view.zoom + view.y,
      initialValue: annotation.text,
      color: annotation.color,
    })
    useGuide.getState().selectAnnotation(null)
  }

  const commitCalloutText = (text: string) => {
    const edit = calloutEdit
    setCalloutEdit(null)
    if (!edit) return
    const state = useGuide.getState()
    const step = state.steps.find((item) => item.id === edit.stepId)
    const target = step?.annotations.find((annotation) => annotation.id === edit.id)
    if (!target || target.type !== 'callout') return
    if (target.text !== text) {
      state.pushHistory(state.steps)
      state.updateAnnotation(edit.stepId, edit.id, { text })
    }
    state.selectAnnotation(edit.id)
  }

  const handleCalloutDragStart = () => {
    calloutDragSnapshot.current = useGuide.getState().steps
  }

  const handleCalloutDragEnd = (
    stepId: string,
    annotation: CalloutAnnotation,
    part: CalloutPart,
    x: number,
    y: number,
  ) => {
    const snapshot = calloutDragSnapshot.current
    calloutDragSnapshot.current = null
    if (!snapshot) return
    const before =
      part === 'region'
        ? { x: annotation.x, y: annotation.y }
        : { x: annotation.labelX, y: annotation.labelY }
    if (Math.abs(x - before.x) < 0.5 && Math.abs(y - before.y) < 0.5) return
    const state = useGuide.getState()
    state.pushHistory(snapshot)
    state.updateAnnotation(
      stepId,
      annotation.id,
      part === 'region' ? { x, y } : { labelX: x, labelY: y },
    )
  }

  const handleStageMouseUp = () => {
    if (!draft) return
    setDraft(null)
    if (!step || !shot) return
    if (draft.type === 'callout') {
      const x = Math.min(draft.startX, draft.endX)
      const y = Math.min(draft.startY, draft.endY)
      const width = Math.abs(draft.endX - draft.startX)
      const height = Math.abs(draft.endY - draft.startY)
      if (width < 6 || height < 6) return
      const callout = buildCallout(
        { x, y, width, height },
        calloutShape,
        color,
        shot.width,
        shot.height,
        calloutTextSize,
      )
      useGuide.getState().addAnnotation(step.id, callout)
      openCalloutEditor(step.id, callout)
      return
    }
    const annotation = buildAnnotation(draft, color, shot.width)
    if (annotation) useGuide.getState().addAnnotation(step.id, annotation)
  }

  const commitText = () => {
    if (!textDraft) return
    const text = textValue.trim()
    if (text && step) {
      useGuide.getState().addAnnotation(step.id, {
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

  const renderAnnotation = (annotation: Annotation) => {
    const editable = tool === 'select' && !spaceDown
    const common = {
      draggable: editable,
      onMouseDown: (event: KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true
        useGuide.getState().selectAnnotation(annotation.id)
      },
      onTap: (event: KonvaEventObject<TouchEvent>) => {
        event.cancelBubble = true
        useGuide.getState().selectAnnotation(annotation.id)
      },
      onDragStart: () => {
        dragSnapshot.current = useGuide.getState().steps
        dragOrigin.current = { x: annotation.x, y: annotation.y }
      },
      onDragEnd: (event: KonvaEventObject<DragEvent>) => {
        const node = event.target
        const snapshot = dragSnapshot.current
        const origin = dragOrigin.current
        dragSnapshot.current = null
        dragOrigin.current = null
        if (!snapshot || !origin || !step) return
        if (
          Math.abs(node.x() - origin.x) < 0.5 &&
          Math.abs(node.y() - origin.y) < 0.5
        ) {
          return
        }
        const state = useGuide.getState()
        state.pushHistory(snapshot)
        state.updateAnnotation(step.id, annotation.id, {
          x: node.x(),
          y: node.y(),
        })
      },
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
      case 'ellipse':
        return (
          <Ellipse
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            radiusX={annotation.radiusX}
            radiusY={annotation.radiusY}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            hitStrokeWidth={Math.max(16, annotation.strokeWidth * 3)}
          />
        )
      case 'pen':
        return (
          <Line
            key={annotation.id}
            {...common}
            x={annotation.x}
            y={annotation.y}
            points={annotation.points}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={Math.max(16, annotation.strokeWidth * 3)}
          />
        )
      case 'callout':
        return (
          <CalloutShape
            key={annotation.id}
            annotation={annotation}
            draggable={editable}
            labelDraggable={!spaceDown}
            selected={selectedAnnotationId === annotation.id}
            onSelect={() => useGuide.getState().selectAnnotation(annotation.id)}
            onDragStart={() => handleCalloutDragStart()}
            onDragEnd={(part, x, y) =>
              handleCalloutDragEnd(step?.id ?? '', annotation, part, x, y)
            }
            onEditText={() => openCalloutEditor(step?.id ?? '', annotation)}
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

  const renderDraft = (current: Draft, imageWidth: number) => {
    const x = Math.min(current.startX, current.endX)
    const y = Math.min(current.startY, current.endY)
    const width = Math.abs(current.endX - current.startX)
    const height = Math.abs(current.endY - current.startY)
    const strokeWidth = Math.max(3, Math.round(imageWidth / 400))

    if (current.type === 'arrow') {
      return (
        <Arrow
          points={[current.startX, current.startY, current.endX, current.endY]}
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
    if (current.type === 'box') {
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
    if (current.type === 'ellipse') {
      return (
        <Ellipse
          x={x + width / 2}
          y={y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={[8, 5]}
          listening={false}
        />
      )
    }
    if (current.type === 'callout') {
      return calloutShape === 'circle' ? (
        <Ellipse
          x={x + width / 2}
          y={y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={[8, 5]}
          listening={false}
        />
      ) : (
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
      <Line
        points={current.points}
        stroke={color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
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

  const fitToScreen = () => {
    if (!shot || size.width === 0 || size.height === 0) return
    setView(computeFit(size.width, size.height, shot.width, shot.height))
  }

  const selected =
    step?.annotations.find((annotation) => annotation.id === selectedAnnotationId) ??
    null

  const cursorClass = spaceDown
    ? 'cursor-grab active:cursor-grabbing'
    : tool === 'select'
      ? 'cursor-default'
      : 'cursor-crosshair'

  const badgeText = String(stepIndex + 1)

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden bg-[#0d0d10]">
      <div ref={containerRef} className={`absolute inset-0 ${cursorClass}`}>
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
          onMouseDown={(event) => {
            if (spaceDown) return
            if (event.target === event.target.getStage()) {
              useGuide.getState().selectAnnotation(null)
            }
          }}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onDragEnd={(event) => {
            const stage = event.target.getStage()
            if (event.target !== stage) return
            setView((current) => ({ ...current, x: stage.x(), y: stage.y() }))
          }}
        >
          <Layer>
            {step && shot ? (
              <Group>
                <StepImage shot={shot} />
                <Rect
                  x={0}
                  y={0}
                  width={shot.width}
                  height={shot.height}
                  fill="rgba(0,0,0,0.001)"
                  onMouseDown={handleImageMouseDown}
                  onTap={handleImageMouseDown}
                />
                {step.annotations.map((annotation) => renderAnnotation(annotation))}
                {selected ? renderSelection(selected) : null}
                {draft ? renderDraft(draft, shot.width) : null}
                <GuideBadge text={badgeText} shot={shot} />
              </Group>
            ) : null}
          </Layer>
        </Stage>
      </div>

      {steps.length === 0 ? (
        <EmptyHint
          title="Add a step to begin"
          body={
            <>
              Click <strong>Add step</strong>, then paste a screenshot with{' '}
              <kbd>Ctrl+V</kbd>.
            </>
          }
        />
      ) : null}

      {step && !shot ? (
        <EmptyHint
          title={`Step ${stepIndex + 1} has no image`}
          body={
            <>
              Paste a screenshot with <kbd>Ctrl+V</kbd> to fill this step.
            </>
          }
        />
      ) : null}

      {calloutEdit ? (
        <CalloutTextInput
          key={calloutEdit.id}
          left={calloutEdit.left}
          top={calloutEdit.top}
          color={calloutEdit.color}
          initialValue={calloutEdit.initialValue}
          onCommit={commitCalloutText}
        />
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

      {shot ? (
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
              onClick={() =>
                setView({
                  zoom: 1,
                  x: (size.width - shot.width) / 2,
                  y: (size.height - shot.height) / 2,
                })
              }
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
            Space+drag to pan · Ctrl+wheel to zoom
          </div>
        </>
      ) : null}
    </div>
  )
}

function GuideBadge({ text, shot }: { text: string; shot: PreparedShot }) {
  const metrics = getBadgeMetrics(shot, text)
  return (
    <Group x={BADGE_OFFSET} y={BADGE_OFFSET} listening={false}>
      <Rect
        width={metrics.width}
        height={metrics.height}
        fill={BADGE_FILL}
        cornerRadius={metrics.height * BADGE_RADIUS_RATIO}
        stroke={BADGE_BORDER}
        strokeWidth={1.5}
        strokeScaleEnabled={false}
      />
      <Text
        text={text}
        width={metrics.width}
        height={metrics.height}
        align="center"
        verticalAlign="middle"
        fill={BADGE_TEXT}
        fontSize={metrics.fontSize}
        fontStyle="bold"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      />
    </Group>
  )
}

function EmptyHint({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 px-8 py-7 text-center shadow-2xl backdrop-blur">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      </div>
    </div>
  )
}
