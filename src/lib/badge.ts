import type { Shot } from '../types'

export const BADGE_FILL = 'rgba(9, 9, 11, 0.82)'
export const BADGE_BORDER = 'rgba(255, 255, 255, 0.28)'
export const BADGE_TEXT = '#ffffff'
export const BADGE_RADIUS_RATIO = 0.28

export const getBadgeMetrics = (shot: Shot, text: string) => {
  const fontSize = Math.max(16, Math.round(shot.width / 30))
  const paddingX = Math.round(fontSize * 0.6)
  const paddingY = Math.round(fontSize * 0.35)
  const width = Math.round(paddingX * 2 + text.length * fontSize * 0.62)
  const height = fontSize + paddingY * 2
  return { fontSize, paddingX, paddingY, width, height }
}
