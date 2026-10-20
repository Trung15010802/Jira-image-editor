import type { Mode, Orientation, Shot, ShotId } from '../types'

export const COMPARE_GAP = 56

export interface ShotPlacement {
  shot: Shot
  x: number
  y: number
}

export interface Board {
  placements: ShotPlacement[]
  width: number
  height: number
}

export function getBoard(
  shots: Shot[],
  mode: Mode,
  activeId: ShotId | null,
  orientation: Orientation = 'horizontal',
): Board {
  const active = shots.find((shot) => shot.id === activeId)
  const visible =
    mode === 'compare' ? shots : active ? [active] : shots.slice(0, 1)

  const widest = visible.reduce((max, shot) => Math.max(max, shot.width), 0)

  let cursor = 0
  const placements = visible.map((shot) => {
    if (orientation === 'vertical') {
      const placement = {
        shot,
        x: (widest - shot.width) / 2,
        y: cursor,
      }
      cursor += shot.height + COMPARE_GAP
      return placement
    }
    const placement = { shot, x: cursor, y: 0 }
    cursor += shot.width + COMPARE_GAP
    return placement
  })

  const width =
    orientation === 'vertical'
      ? widest
      : placements.reduce(
          (max, placement) => Math.max(max, placement.x + placement.shot.width),
          0,
        )
  const height =
    orientation === 'vertical'
      ? placements.reduce(
          (max, placement) => Math.max(max, placement.y + placement.shot.height),
          0,
        )
      : placements.reduce(
          (max, placement) => Math.max(max, placement.shot.height),
          0,
        )

  return {
    placements,
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

export function getShotPlacement(board: Board, shotId: ShotId) {
  return board.placements.find((placement) => placement.shot.id === shotId)
}
