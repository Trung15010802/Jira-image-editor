import type { KonvaEventObject } from 'konva/lib/Node'
import { Arrow, Circle, Ellipse, Group, Rect, Text } from 'react-konva'
import { calloutTextColor, getCalloutLayout } from '../lib/callout'
import type { CalloutAnnotation } from '../types'

export type CalloutPart = 'region' | 'label'

interface CalloutShapeProps {
  annotation: CalloutAnnotation
  draggable: boolean
  onSelect: () => void
  onDragStart: (part: CalloutPart) => void
  onDragEnd: (part: CalloutPart, x: number, y: number) => void
  onEditText: () => void
}

export function CalloutShape({
  annotation,
  draggable,
  onSelect,
  onDragStart,
  onDragEnd,
  onEditText,
}: CalloutShapeProps) {
  const layout = getCalloutLayout(annotation)
  const { width, height, shape, color, strokeWidth, fontSize, text } = annotation
  const hasText = text.trim().length > 0
  const select = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true
    onSelect()
  }

  const region =
    shape === 'circle' ? (
      <Ellipse
        x={width / 2}
        y={height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        fill="rgba(0,0,0,0.001)"
        stroke={color}
        strokeWidth={strokeWidth}
        hitStrokeWidth={Math.max(16, strokeWidth * 3)}
      />
    ) : (
      <Rect
        width={width}
        height={height}
        fill="rgba(0,0,0,0.001)"
        stroke={color}
        strokeWidth={strokeWidth}
        hitStrokeWidth={Math.max(16, strokeWidth * 3)}
      />
    )

  const label = hasText ? (
    <Group
      x={layout.label.x}
      y={layout.label.y}
      draggable={draggable}
      onMouseDown={select}
      onTap={select}
      onDblClick={(event) => {
        event.cancelBubble = true
        onEditText()
      }}
      onDragStart={(event) => {
        event.cancelBubble = true
        onDragStart('label')
      }}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return
        event.cancelBubble = true
        onDragEnd('label', event.target.x(), event.target.y())
      }}
    >
      <Rect
        width={layout.label.width}
        height={layout.label.height}
        fill={color}
        cornerRadius={layout.label.height * 0.28}
      />
      <Text
        text={text}
        width={layout.label.width}
        height={layout.label.height}
        align="center"
        verticalAlign="middle"
        fill={calloutTextColor(color)}
        fontSize={fontSize}
        fontStyle="bold"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        listening={false}
      />
    </Group>
  ) : (
    <Circle
      x={layout.label.x}
      y={layout.label.y}
      radius={layout.dotRadius}
      fill={color}
      draggable={draggable}
      onMouseDown={select}
      onTap={select}
      onDblClick={(event) => {
        event.cancelBubble = true
        onEditText()
      }}
      onDragStart={(event) => {
        event.cancelBubble = true
        onDragStart('label')
      }}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return
        event.cancelBubble = true
        onDragEnd('label', event.target.x(), event.target.y())
      }}
    />
  )

  return (
    <Group
      x={annotation.x}
      y={annotation.y}
      draggable={draggable}
      onMouseDown={select}
      onTap={select}
      onDragStart={() => onDragStart('region')}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return
        onDragEnd('region', event.target.x(), event.target.y())
      }}
    >
      {region}
      {layout.arrow.length === 4 ? (
        <Arrow
          points={layout.arrow}
          stroke={color}
          fill={color}
          strokeWidth={strokeWidth}
          pointerLength={Math.max(14, strokeWidth * 4)}
          pointerWidth={Math.max(14, strokeWidth * 4)}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      ) : null}
      {label}
    </Group>
  )
}
