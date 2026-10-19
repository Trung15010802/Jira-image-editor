export type ShotId = 'a' | 'b'

export type Mode = 'single' | 'compare'

export type Tool = 'select' | 'arrow' | 'box' | 'text' | 'highlight' | 'redact'

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

export interface TextAnnotation {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export interface AreaAnnotation {
  id: string
  type: 'highlight' | 'redact'
  x: number
  y: number
  width: number
  height: number
}

export type Annotation =
  | ArrowAnnotation
  | BoxAnnotation
  | TextAnnotation
  | AreaAnnotation

export interface Guide {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
}

export interface Snapshot {
  shots: Shot[]
  annotations: Record<string, Annotation[]>
  guides: Guide[]
  activeId: ShotId | null
  mode: Mode
}
