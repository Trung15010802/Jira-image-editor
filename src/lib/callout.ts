import type { CalloutAnnotation, CalloutShapeKind } from '../types'
import { newId } from './id'

export interface CalloutRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CalloutLayout {
  label: CalloutRect
  dotRadius: number
  arrow: number[]
  bounds: CalloutRect
}

export const calloutFontSize = (imageWidth: number) =>
  Math.max(16, Math.round(imageWidth / 40))

export const calloutStrokeWidth = (imageWidth: number) =>
  Math.max(3, Math.round(imageWidth / 400))

export const calloutTextColor = (color: string) =>
  color.toLowerCase() === '#ffffff' ? '#0a0a0a' : '#ffffff'

export const labelMetrics = (text: string, fontSize: number) => {
  const padding = Math.round(fontSize * 0.5)
  return {
    padding,
    width: Math.round(text.length * fontSize * 0.6 + padding * 2),
    height: Math.round(fontSize + padding * 2),
  }
}

const exitRect = (
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  hw: number,
  hh: number,
) => {
  const tx = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity
  const ty = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)
  return { x: cx + dx * t, y: cy + dy * t }
}

const exitEllipse = (
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  rx: number,
  ry: number,
) => {
  const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
  return { x: cx + dx * t, y: cy + dy * t }
}

export const getCalloutLayout = (annotation: CalloutAnnotation): CalloutLayout => {
  const { width, height, shape, labelX, labelY, text, fontSize, strokeWidth } =
    annotation
  const hasText = text.trim().length > 0
  const metrics = hasText ? labelMetrics(text, fontSize) : null
  const label: CalloutRect = {
    x: labelX,
    y: labelY,
    width: metrics?.width ?? 0,
    height: metrics?.height ?? 0,
  }
  const dotRadius = strokeWidth * 2.5

  const cx = width / 2
  const cy = height / 2
  const lx = label.x + label.width / 2
  const ly = label.y + label.height / 2
  const dx = lx - cx
  const dy = ly - cy

  let arrow: number[] = []
  if (Math.hypot(dx, dy) > 1) {
    const start = exitRect(lx, ly, -dx, -dy, label.width / 2, label.height / 2)
    const end =
      shape === 'circle'
        ? exitEllipse(cx, cy, dx, dy, width / 2, height / 2)
        : exitRect(cx, cy, dx, dy, width / 2, height / 2)
    arrow = [start.x, start.y, end.x, end.y]
  }

  const extra = hasText ? 0 : dotRadius
  const minX = Math.min(0, label.x - extra)
  const minY = Math.min(0, label.y - extra)
  const maxX = Math.max(width, label.x + label.width + extra)
  const maxY = Math.max(height, label.y + label.height + extra)

  return {
    label,
    dotRadius,
    arrow,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  }
}

export const buildCallout = (
  region: CalloutRect,
  shape: CalloutShapeKind,
  color: string,
  imageWidth: number,
  imageHeight: number,
): CalloutAnnotation => {
  const fontSize = calloutFontSize(imageWidth)
  const gap = Math.max(40, Math.round(fontSize * 2.5))
  const cardSpace = fontSize * 12
  const placeRight = region.x + region.width + gap + cardSpace <= imageWidth
  const absLabelX = placeRight
    ? region.x + region.width + gap
    : Math.max(0, region.x - gap - cardSpace)
  const absLabelY = Math.min(
    Math.max(0, region.y - gap),
    Math.max(0, imageHeight - fontSize * 2),
  )

  return {
    id: newId('callout'),
    type: 'callout',
    shape,
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    labelX: absLabelX - region.x,
    labelY: absLabelY - region.y,
    text: '',
    color,
    fontSize,
    strokeWidth: calloutStrokeWidth(imageWidth),
  }
}
