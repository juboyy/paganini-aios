/**
 * floorTiles.ts — Floor sprite loading and colorization
 * Loads character PNG sprite sheets and provides colorized floor tile sprites.
 */

import type { FloorColor, SpriteData, TileType as TileTypeVal } from './types';
import { TileType } from './types';
import { getCachedColorizedSprite } from './colorize';

// ── Wall color ────────────────────────────────────────────────────

export const WALL_COLOR = '#2a2a3a';

// ── Floor sprite storage ──────────────────────────────────────────

/** Loaded floor sprites: index 0 = floor_0.png, etc. Populated by loadFloorSprites(). */
let floorSprites: SpriteData[] | null = null;

/**
 * Set pre-loaded floor sprites (called by PixelOffice after loading PNGs via canvas).
 * sprites[0] corresponds to floor_0.png, sprites[1] to floor_1.png, etc.
 */
export function setFloorSprites(sprites: SpriteData[]): void {
  floorSprites = sprites;
}

/** Returns true if floor sprites have been loaded */
export function hasFloorSprites(): boolean {
  return floorSprites !== null && floorSprites.length > 0;
}

/**
 * Get the colorized floor sprite for a given tile type and color config.
 * TileType enum values 1-9 map to floor_0.png through floor_8.png.
 */
export function getColorizedFloorSprite(tile: TileTypeVal, color: FloorColor): SpriteData {
  if (!floorSprites || floorSprites.length === 0) {
    // Fallback: empty sprite
    return [['#808080']];
  }

  // Map tile type to sprite index: FLOOR_1(1) → index 0, FLOOR_9(9) → index 8
  const idx = (tile as number) - 1;
  const sprite = floorSprites[Math.max(0, Math.min(idx, floorSprites.length - 1))];

  return getCachedColorizedSprite(sprite, color);
}

// ── PNG → SpriteData loader ───────────────────────────────────────

/**
 * Load a PNG image URL and convert it to a SpriteData (2D array of hex colors).
 * Returns null if loading fails.
 */
export function loadPngToSpriteData(url: string): Promise<SpriteData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const sprite: SpriteData = [];
      for (let y = 0; y < img.height; y++) {
        const row: string[] = [];
        for (let x = 0; x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 10) {
            row.push('');
          } else if (a < 255) {
            row.push(
              `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`,
            );
          } else {
            row.push(
              `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            );
          }
        }
        sprite.push(row);
      }
      resolve(sprite);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
