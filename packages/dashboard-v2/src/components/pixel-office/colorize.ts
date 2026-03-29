/**
 * colorize.ts — Sprite colorization utilities
 * Implements HSB (hue, saturation, brightness) adjustments on SpriteData arrays.
 */

import type { FloorColor, SpriteData } from './types';

// ── HSL helpers ──────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  if (clean.length === 8) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function getAlpha(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length === 8) {
    return parseInt(clean.slice(6, 8), 16) / 255;
  }
  return 1;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h /= 6;
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360;
  const sn = s / 100;
  const ln = l / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function toHex2(v: number): string {
  return Math.round(clamp(v, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

// ── Core pixel adjustment ─────────────────────────────────────────

/** Apply HSB adjustments to a single hex color pixel. Returns adjusted hex string. */
function adjustPixel(hex: string, color: FloorColor): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const alpha = getAlpha(hex);

  const [r, g, b] = rgb;
  let [h, s, l] = rgbToHsl(r, g, b);

  if (color.colorize) {
    // Photoshop-style colorize: set hue+sat, keep relative lightness
    h = ((color.h % 360) + 360) % 360;
    s = clamp(color.s, 0, 100);
    // Brightness offset: keep existing L but shift it
    l = clamp(l + color.b, 0, 100);
  } else {
    // Adjust mode: shift hue, saturation, brightness, contrast
    h = ((h + color.h) % 360 + 360) % 360;
    s = clamp(s + color.s, 0, 100);
    l = clamp(l + color.b, 0, 100);

    // Contrast: expand/compress L around 50
    if (color.c !== 0) {
      const factor = (color.c + 100) / 100; // 0..2
      l = clamp((l - 50) * factor + 50, 0, 100);
    }
  }

  const [nr, ng, nb] = hslToRgb(h, s, l);
  const alphaHex = alpha < 1 ? toHex2(alpha * 255) : '';
  return `#${toHex2(nr)}${toHex2(ng)}${toHex2(nb)}${alphaHex}`;
}

// ── Exported helpers ──────────────────────────────────────────────

/** Adjust a whole sprite using a FloorColor. Returns a new SpriteData with adjusted colors. */
export function adjustSprite(sprite: SpriteData, color: FloorColor): SpriteData {
  if (color.h === 0 && color.s === 0 && color.b === 0 && color.c === 0 && !color.colorize) {
    return sprite;
  }
  return sprite.map((row) =>
    row.map((pixel) => {
      if (!pixel || pixel === '') return pixel;
      return adjustPixel(pixel, color);
    }),
  );
}

/** Colorize a sprite using a FloorColor. Returns a new SpriteData. */
export function getColorizedSprite(sprite: SpriteData, color: FloorColor): SpriteData {
  return adjustSprite(sprite, color);
}

// ── Per-sprite cache ──────────────────────────────────────────────

const colorizeCache = new WeakMap<SpriteData, Map<string, SpriteData>>();

/** Cached version of getColorizedSprite — avoids repeated pixel work for the same input. */
export function getCachedColorizedSprite(sprite: SpriteData, color: FloorColor): SpriteData {
  if (color.h === 0 && color.s === 0 && color.b === 0 && color.c === 0 && !color.colorize) {
    return sprite;
  }
  const key = `${color.h},${color.s},${color.b},${color.c},${color.colorize ? 1 : 0}`;
  let spriteMap = colorizeCache.get(sprite);
  if (!spriteMap) {
    spriteMap = new Map();
    colorizeCache.set(sprite, spriteMap);
  }
  const cached = spriteMap.get(key);
  if (cached) return cached;
  const result = adjustSprite(sprite, color);
  spriteMap.set(key, result);
  return result;
}
