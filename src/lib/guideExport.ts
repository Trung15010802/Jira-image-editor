import JSZip from 'jszip'
import type { GuideStep } from '../types'
import { drawAnnotation, drawBadge } from './export'
import { loadImage } from './image'

const BADGE_OFFSET = 18

const renderStep = async (step: GuideStep, number: number): Promise<Blob> => {
  const shot = step.shot
  if (!shot) throw new Error(`Step ${number} has no image`)

  const canvas = document.createElement('canvas')
  canvas.width = shot.width
  canvas.height = shot.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')

  const image = await loadImage(shot.src)
  ctx.drawImage(image, 0, 0, shot.width, shot.height)
  for (const annotation of step.annotations) {
    drawAnnotation(ctx, annotation)
  }
  drawBadge(ctx, shot, {
    text: String(number),
    x: BADGE_OFFSET,
    y: BADGE_OFFSET,
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('Export failed')
  return blob
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportGuide(steps: GuideStep[]) {
  if (steps.length === 0) throw new Error('Add at least one step')
  const missing = steps.findIndex((step) => !step.shot)
  if (missing >= 0) throw new Error(`Step ${missing + 1} has no image`)

  const zip = new JSZip()
  const folder = zip.folder('guide')
  if (!folder) throw new Error('Export failed')

  for (const [index, step] of steps.entries()) {
    folder.file(`step${index + 1}.png`, await renderStep(step, index + 1))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'guide.zip')
}
