import type { Mode, Shot, ShotId } from '../types'

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
): Board {
  const active = shots.find((shot) => shot.id === activeId)
  const visible =
    mode === 'compare' ? shots : active ? [active] : shots.slice(0, 1)

  let cursor = 0
  const placements = visible.map((shot) => {
    const placement = { shot, x: cursor, y: 0 }
    cursor += shot.width + COMPARE_GAP
    return placement
  })

  const width = placements.reduce(
    (max, placement) => Math.max(max, placement.x + placement.shot.width),
    0,
  )
  const height = placements.reduce(
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
