/**
 * wallTiles.ts — Wall sprite loading and rendering helpers
 * Handles loading wall PNG sprites and generating wall FurnitureInstance-like objects
 * for z-sorted rendering.
 */

import type { FloorColor, FurnitureInstance, SpriteData, TileType as TileTypeVal } from './types';
import { TileType, TILE_SIZE } from './types';
import { getCachedColorizedSprite } from './colorize';

// ── Wall color helpers ────────────────────────────────────────────

const DEFAULT_WALL_HEX = '#3a3a4a';

/** Convert a FloorColor wall config to a hex color string */
export function wallColorToHex(color: FloorColor): string {
  // Simple implementation: shift the base wall color by HSB
  // For walls, we use a dark blue-grey base
  const base = { h: 240, s: 15, b: -60, c: 0 };
  const h = Math.round(((base.h + color.h) % 360 + 360) % 360);
  const s = Math.max(0, Math.min(100, base.s + color.s));
  const l = Math.max(0, Math.min(100, 20 + color.b * 0.4));
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = h / 360;
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2 = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 0.5) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const r = Math.round(hue2(hn + 1 / 3) * 255);
  const g = Math.round(hue2(hn) * 255);
  const b = Math.round(hue2(hn - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Wall sprite storage ───────────────────────────────────────────

let wallSprite: SpriteData | null = null;

/**
 * Set a pre-loaded wall sprite (called by PixelOffice after loading wall_0.png).
 */
export function setWallSprite(sprite: SpriteData): void {
  wallSprite = sprite;
}

/** Returns true if a wall sprite has been loaded */
export function hasWallSprites(): boolean {
  return wallSprite !== null;
}

/**
 * Generate FurnitureInstance-like objects for wall tiles so they can be z-sorted
 * with furniture and characters. Each wall tile gets a wall-sprite instance.
 */
export function getWallInstances(
  tileMap: TileTypeVal[][],
  tileColors?: Array<FloorColor | null>,
  layoutCols?: number,
): FurnitureInstance[] {
  if (!wallSprite) return [];

  const instances: FurnitureInstance[] = [];
  const tmRows = tileMap.length;
  const tmCols = tmRows > 0 ? tileMap[0].length : 0;
  const cols = layoutCols ?? tmCols;

  for (let r = 0; r < tmRows; r++) {
    for (let c = 0; c < tmCols; c++) {
      if (tileMap[r][c] !== TileType.WALL) continue;

      const colorIdx = r * cols + c;
      const wallColor = tileColors?.[colorIdx];

      let sprite = wallSprite;
      if (wallColor) {
        sprite = getCachedColorizedSprite(wallSprite, wallColor);
      }

      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      const spriteH = sprite.length;

      instances.push({
        sprite,
        x,
        y,
        // Wall zY: walls sort at the bottom of their tile so furniture/chars in front appear over them
        zY: y + spriteH,
      });
    }
  }

  return instances;
}
