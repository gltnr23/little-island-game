/** Isometric (2:1) projection helpers. Grid coords are continuous: tile (i, j) spans [i, i+1) x [j, j+1). */
export const TILE_W = 96;
export const TILE_H = 48;
/** Visible thickness of a ground tile's side faces. */
export const TILE_DEPTH = 16;
/** Extra height of a raised hill block. */
export const HILL_HEIGHT = 34;

export function isoToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Converts a screen-space vector into the matching grid-space vector. */
export function screenVecToGrid(sx: number, sy: number): { x: number; y: number } {
  return {
    x: sx / TILE_W + sy / TILE_H,
    y: sy / TILE_H - sx / TILE_W,
  };
}
