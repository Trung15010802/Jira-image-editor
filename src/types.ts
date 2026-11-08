import type { PreparedShot } from './lib/image'

export type ShotId = 'a' | 'b'

export type Mode = 'single' | 'compare'

export type Orientation = 'horizontal' | 'vertical'

export type BadgeStyle = 'none' | 'number' | 'beforeAfter' | 'custom'

export type Tool =
  | 'select'
  | 'arrow'
  | 'box'
  | 'ellipse'
  | 'text'
  | 'pen'
  | 'callout'

export type CalloutShapeKind = 'circle' | 'rect'

export interface Shot {
  id: ShotId
  name: string
  src: string
  width: number
  height: number
}

export interface ArrowAnnotation {
  id: string
  type: 'arrow'
  x: number
  y: number
  dx: number
  dy: number
  color: string
  strokeWidth: number
}

export interface BoxAnnotation {
  id: string
  type: 'box'
  x: number
  y: number
  width: number
  height: number
  color: string
  strokeWidth: number
}

export interface EllipseAnnotation {
  id: string
  type: 'ellipse'
  x: number
  y: number
  radiusX: number
  radiusY: number
  color: string
  strokeWidth: number
}

export interface TextAnnotation {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export interface PenAnnotation {
  id: string
  type: 'pen'
  x: number
  y: number
  points: number[]
  color: string
  strokeWidth: number
}

export interface CalloutAnnotation {
  id: string
  type: 'callout'
  shape: CalloutShapeKind
  x: number
  y: number
  width: number
  height: number
  labelX: number
  labelY: number
  text: string
  color: string
  fontSize: number
  strokeWidth: number
}

export type Annotation =
  | ArrowAnnotation
  | BoxAnnotation
  | EllipseAnnotation
  | TextAnnotation
  | PenAnnotation
  | CalloutAnnotation

export interface GuideStep {
  id: string
  shot: PreparedShot | null
  annotations: Annotation[]
}

export interface Guide {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
}

export interface Badge {
  id: string
  shotId: ShotId
  text: string
  x: number
  y: number
}

export interface Snapshot {
  shots: Shot[]
  annotations: Record<string, Annotation[]>
  guides: Guide[]
  badges: Badge[]
  badgeStyle: BadgeStyle
  activeId: ShotId | null
  mode: Mode
}
