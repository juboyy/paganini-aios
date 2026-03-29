/**
 * defaultLayout.ts — Pre-designed Paganini office layout
 * 30x22 open-plan office with 14 desks grouped by function:
 * - Compliance area (top-left)
 * - Operations/Admin area (top-right)  
 * - Risk/Auditor area (bottom-left)
 * - IR/Reporting area (bottom-right)
 */

import type { OfficeLayout } from './types';

// Grid: 28 cols × 20 rows
// TileType: 0=wall, 1-9=floor variants, 255=void
// We use:
//   1 = warm beige floor (compliance)
//   2 = warm brown floor (ops/admin)
//   3 = cool blue floor  (risk)
//   4 = grey floor       (IR)
//   7 = corridor/common

// prettier-ignore
const TILES: number[] = [
  // Row 0 — top wall
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  // Row 1 — compliance + ops rooms start
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 2
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 3
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 4
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 5
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 6
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 7
  0,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,
  // Row 8 — corridor between top and bottom
  0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,
  // Row 9 — corridor
  0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,
  // Row 10 — risk + IR rooms start
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 11
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 12
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 13
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 14
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 15
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 16
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 17
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 18
  0,3,3,3,3,3,3,3,3,3,3,3,3,0,4,4,4,4,4,4,4,4,4,4,4,4,4,0,
  // Row 19 — bottom wall
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
];

const COLS = 28;
const ROWS = 20;

// Tile colors
function makeColor(h: number, s: number, b: number, c: number) {
  return { h, s, b, c };
}

const C_WALL = null;
const C_COMPLIANCE = makeColor(25, 48, -43, -88); // warm beige
const C_OPS = makeColor(209, 39, -25, -80);        // cool blue-grey
const C_RISK = makeColor(280, 35, -30, -60);       // purple-grey
const C_IR = makeColor(35, 30, -20, -40);          // warm tan
const C_CORRIDOR = makeColor(0, 0, -30, -20);      // neutral grey

const TILE_COLORS = TILES.map((t) => {
  if (t === 0) return C_WALL;
  if (t === 1) return C_COMPLIANCE;
  if (t === 2) return C_OPS;
  if (t === 3) return C_RISK;
  if (t === 4) return C_IR;
  if (t === 7) return C_CORRIDOR;
  return C_CORRIDOR;
});

// Furniture layout
// Compliance area (cols 1-12, rows 1-7): agents: compliance, due_diligence, reg_watch, monitoring, onboard
// Ops/Admin area (cols 14-26, rows 1-7): agents: admin, gestor, operations, pricing
// Risk area (cols 1-12, rows 10-18): agents: risk, auditor, custódia
// IR area (cols 14-26, rows 10-18): agents: ir, reporting

const FURNITURE = [
  // ── COMPLIANCE AREA (top-left) ─────────────────────────────────────
  // Desk row 1: compliance + due_diligence
  { uid: 'desk-compliance', type: 'DESK_FRONT', col: 2, row: 2 },
  { uid: 'chair-compliance', type: 'WOODEN_CHAIR_BACK', col: 2, row: 3 },
  { uid: 'pc-compliance', type: 'PC_FRONT_OFF', col: 3, row: 2 },

  { uid: 'desk-due', type: 'DESK_FRONT', col: 6, row: 2 },
  { uid: 'chair-due', type: 'WOODEN_CHAIR_BACK', col: 6, row: 3 },
  { uid: 'pc-due', type: 'PC_FRONT_OFF', col: 7, row: 2 },

  // Desk row 2: reg_watch + monitoring
  { uid: 'desk-reg', type: 'DESK_FRONT', col: 2, row: 5 },
  { uid: 'chair-reg', type: 'WOODEN_CHAIR_BACK', col: 2, row: 6 },
  { uid: 'pc-reg', type: 'PC_FRONT_OFF', col: 3, row: 5 },

  { uid: 'desk-mon', type: 'DESK_FRONT', col: 6, row: 5 },
  { uid: 'chair-mon', type: 'WOODEN_CHAIR_BACK', col: 6, row: 6 },
  { uid: 'pc-mon', type: 'PC_FRONT_OFF', col: 7, row: 5 },

  // onboard desk
  { uid: 'desk-onboard', type: 'DESK_SIDE', col: 10, row: 3 },
  { uid: 'chair-onboard', type: 'WOODEN_CHAIR_SIDE', col: 10, row: 4 },
  { uid: 'pc-onboard', type: 'PC_SIDE', col: 11, row: 3 },

  // Compliance area decor
  { uid: 'plant-c1', type: 'PLANT', col: 1, row: 1 },
  { uid: 'shelf-c1', type: 'BOOKSHELF', col: 10, row: 1 },
  { uid: 'wb-c1', type: 'WHITEBOARD', col: 9, row: 6 },

  // ── OPS / ADMIN AREA (top-right) ───────────────────────────────────
  // admin + gestor desks
  { uid: 'desk-admin', type: 'DESK_FRONT', col: 15, row: 2 },
  { uid: 'chair-admin', type: 'WOODEN_CHAIR_BACK', col: 15, row: 3 },
  { uid: 'pc-admin', type: 'PC_FRONT_OFF', col: 16, row: 2 },

  { uid: 'desk-gestor', type: 'DESK_FRONT', col: 19, row: 2 },
  { uid: 'chair-gestor', type: 'WOODEN_CHAIR_BACK', col: 19, row: 3 },
  { uid: 'pc-gestor', type: 'PC_FRONT_OFF', col: 20, row: 2 },

  // operations + pricing desks
  { uid: 'desk-ops', type: 'DESK_FRONT', col: 15, row: 5 },
  { uid: 'chair-ops', type: 'WOODEN_CHAIR_BACK', col: 15, row: 6 },
  { uid: 'pc-ops', type: 'PC_FRONT_OFF', col: 16, row: 5 },

  { uid: 'desk-pricing', type: 'DESK_FRONT', col: 19, row: 5 },
  { uid: 'chair-pricing', type: 'WOODEN_CHAIR_BACK', col: 19, row: 6 },
  { uid: 'pc-pricing', type: 'PC_FRONT_OFF', col: 20, row: 5 },

  // Ops area decor
  { uid: 'coffee-ops', type: 'COFFEE', col: 25, row: 2 },
  { uid: 'table-ops', type: 'SMALL_TABLE_FRONT', col: 24, row: 2 },
  { uid: 'plant-o1', type: 'LARGE_PLANT', col: 25, row: 6 },
  { uid: 'clock-o1', type: 'CLOCK', col: 23, row: 1 },

  // ── RISK AREA (bottom-left) ─────────────────────────────────────────
  // risk + auditor desks
  { uid: 'desk-risk', type: 'DESK_FRONT', col: 2, row: 11 },
  { uid: 'chair-risk', type: 'WOODEN_CHAIR_BACK', col: 2, row: 12 },
  { uid: 'pc-risk', type: 'PC_FRONT_OFF', col: 3, row: 11 },

  { uid: 'desk-auditor', type: 'DESK_FRONT', col: 6, row: 11 },
  { uid: 'chair-auditor', type: 'WOODEN_CHAIR_BACK', col: 6, row: 12 },
  { uid: 'pc-auditor', type: 'PC_FRONT_OFF', col: 7, row: 11 },

  // custodia desk
  { uid: 'desk-custodia', type: 'DESK_SIDE', col: 10, row: 13 },
  { uid: 'chair-custodia', type: 'WOODEN_CHAIR_SIDE', col: 10, row: 14 },
  { uid: 'pc-custodia', type: 'PC_SIDE', col: 11, row: 13 },

  // Risk area decor
  { uid: 'plant-r1', type: 'CACTUS', col: 11, row: 17 },
  { uid: 'shelf-r1', type: 'DOUBLE_BOOKSHELF', col: 1, row: 10 },
  { uid: 'bin-r1', type: 'BIN', col: 1, row: 18 },

  // ── IR / REPORTING AREA (bottom-right) ─────────────────────────────
  // ir + reporting desks
  { uid: 'desk-ir', type: 'DESK_FRONT', col: 15, row: 11 },
  { uid: 'chair-ir', type: 'WOODEN_CHAIR_BACK', col: 15, row: 12 },
  { uid: 'pc-ir', type: 'PC_FRONT_OFF', col: 16, row: 11 },

  { uid: 'desk-reporting', type: 'DESK_FRONT', col: 19, row: 11 },
  { uid: 'chair-reporting', type: 'WOODEN_CHAIR_BACK', col: 19, row: 12 },
  { uid: 'pc-reporting', type: 'PC_FRONT_OFF', col: 20, row: 11 },

  // IR area decor
  { uid: 'plant-ir1', type: 'HANGING_PLANT', col: 26, row: 10 },
  { uid: 'painting-ir1', type: 'LARGE_PAINTING', col: 22, row: 10 },
  { uid: 'sofa-ir1', type: 'SOFA_FRONT', col: 22, row: 15 },
  { uid: 'table-ir1', type: 'COFFEE_TABLE', col: 23, row: 16 },

  // ── CORRIDOR / COMMON AREA ─────────────────────────────────────────
  { uid: 'plant-cor1', type: 'PLANT_2', col: 13, row: 8 },
  { uid: 'plant-cor2', type: 'PLANT_2', col: 14, row: 9 },
  { uid: 'bench-cor1', type: 'CUSHIONED_BENCH', col: 5, row: 8 },
  { uid: 'bench-cor2', type: 'CUSHIONED_BENCH', col: 19, row: 9 },
];

export const DEFAULT_PAGANINI_LAYOUT: OfficeLayout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  tiles: TILES as number[] as never,
  tileColors: TILE_COLORS,
  furniture: FURNITURE.map((f) => ({
    uid: `paganini-${f.uid}`,
    type: f.type,
    col: f.col,
    row: f.row,
  })),
  layoutRevision: 1,
};
