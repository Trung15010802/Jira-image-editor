import {
  BADGE_BORDER,
  BADGE_FILL,
  BADGE_RADIUS_RATIO,
  BADGE_TEXT,
  getBadgeMetrics,
} from './badge'
import { getBoard } from './layout'
import { loadImage } from './image'
import type { Annotation, Badge, Orientation, Shot, ShotId } from '../types'

export interface ExportOptions {
  format: 'png' | 'jpeg'
  scale: number
  transparent: boolean
  sideBySide: boolean
  orientation: Orientation
  activeId: ShotId | null
  filename: string
}

const drawArrow = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
  if (annotation.type !== 'arrow') return
  const { x, y, dx, dy, color, strokeWidth } = annotation
  const endX = x + dx
  const endY = y + dy
  const angle = Math.atan2(dy, dx)
  const head = Math.max(14, strokeWidth * 4)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - head * Math.cos(angle - Math.PI / 7),
    endY - head * Math.sin(angle - Math.PI / 7),
  )
  ctx.lineTo(
    endX - head * Math.cos(angle + Math.PI / 7),
    endY - head * Math.sin(angle + Math.PI / 7),
  )
  ctx.closePath()
  ctx.fill()
}

const drawAnnotation = (
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
) => {
  switch (annotation.type) {
    case 'arrow':
      drawArrow(ctx, annotation)
      break
    case 'box':
      ctx.strokeStyle = annotation.color
      ctx.lineWidth = annotation.strokeWidth
      ctx.strokeRect(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height,
      )
      break
    case 'text':
      ctx.fillStyle = annotation.color
      ctx.textBaseline = 'top'
      ctx.font = `600 ${annotation.fontSize}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(annotation.text, annotation.x, annotation.y)
      break
    case 'highlight':
      ctx.fillStyle = 'rgba(250, 204, 21, 0.42)'
      ctx.fillRect(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height,
      )
      break
    case 'redact':
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height,
      )
      break
    default:
      break
  }
}

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

const drawBadge = (
  ctx: CanvasRenderingContext2D,
  shot: Shot,
  badge: Badge,
) => {
  const metrics = getBadgeMetrics(shot, badge.text)
  ctx.save()
  ctx.translate(badge.x, badge.y)
  roundRectPath(
    ctx,
    0,
    0,
    metrics.width,
    metrics.height,
    metrics.height * BADGE_RADIUS_RATIO,
  )
  ctx.fillStyle = BADGE_FILL
  ctx.fill()
  ctx.strokeStyle = BADGE_BORDER
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = BADGE_TEXT
  ctx.font = `700 ${metrics.fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badge.text, metrics.width / 2, metrics.height / 2)
  ctx.restore()
}

export async function renderImage(
  shots: Shot[],
  annotations: Record<string, Annotation[]>,
  badges: Badge[],
  options: ExportOptions,
): Promise<Blob> {
  const board = getBoard(
    shots,
    options.sideBySide && shots.length > 1 ? 'compare' : 'single',
    options.activeId,
    options.orientation,
  )
  if (board.placements.length === 0) throw new Error('Nothing to export')

  const scale = options.scale
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(board.width * scale))
  output.height = Math.max(1, Math.round(board.height * scale))
  const ctx = output.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')

  const transparent = options.transparent && options.format !== 'jpeg'
  if (!transparent) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, output.width, output.height)
  }

  for (const placement of board.placements) {
    const { shot } = placement
    const image = await loadImage(shot.src)
    ctx.drawImage(
      image,
      placement.x * scale,
      placement.y * scale,
      shot.width * scale,
      shot.height * scale,
    )

    ctx.save()
    ctx.translate(placement.x * scale, placement.y * scale)
    ctx.scale(scale, scale)
    for (const annotation of annotations[shot.id] ?? []) {
      drawAnnotation(ctx, annotation)
    }
    for (const badge of badges) {
      if (badge.shotId === shot.id) drawBadge(ctx, shot, badge)
    }
    ctx.restore()
  }

  const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, mime, 0.92),
  )
  if (!blob) throw new Error('Export failed')
  return blob
}

const downloadBlob = (blob: Blob, filename: string, format: 'png' | 'jpeg') => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const baseName = filename.trim().replace(/\.(png|jpe?g)$/i, '') || 'screenshot'
  link.download = `${baseName}.${format === 'jpeg' ? 'jpg' : 'png'}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportImage(
  shots: Shot[],
  annotations: Record<string, Annotation[]>,
  badges: Badge[],
  options: ExportOptions,
) {
  const blob = await renderImage(shots, annotations, badges, options)
  downloadBlob(blob, options.filename, options.format)
}

export async function copyImageToClipboard(
  shots: Shot[],
  annotations: Record<string, Annotation[]>,
  badges: Badge[],
  options: Omit<ExportOptions, 'format'>,
) {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error(
      'Copying images to the clipboard is not supported in this browser. Use Download instead.',
    )
  }

  const blob = await renderImage(shots, annotations, badges, {
    ...options,
    format: 'png',
  })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
