/**
 * agentMapping.ts — Paganini agent ↔ pixel character mapping
 * Maps our 14 agents to character palettes, display labels, hue shifts, and desk positions.
 */

import type { Direction } from './types';
import { Direction as Dir } from './types';

// ── Agent IDs (matches Paganini agent registry) ──────────────────

export type PaganiniAgentId =
  | 'admin'
  | 'compliance'
  | 'custódia'
  | 'due_diligence'
  | 'gestor'
  | 'ir'
  | 'pricing'
  | 'reg_watch'
  | 'reporting'
  | 'auditor'
  | 'monitoring'
  | 'onboard'
  | 'risk'
  | 'operations';

// ── Agent → character palette mapping ────────────────────────────

export interface AgentCharacterConfig {
  /** Palette index 0-5 (which character sprite sheet) */
  palette: number;
  /** Hue shift in degrees. 0 = native palette colors. */
  hueShift: number;
  /** Portuguese display label */
  label: string;
  /** Desk furniture uid in the default layout */
  deskUid: string;
  /** Chair/seat uid in the default layout */
  seatUid: string;
  /** Facing direction when seated */
  facingDir: Direction;
  /** Numeric ID used internally by the engine */
  numericId: number;
  /** Functional area for grouping */
  area: 'compliance' | 'operations' | 'risk' | 'ir';
}

export const AGENT_CONFIGS: Record<PaganiniAgentId, AgentCharacterConfig> = {
  // ── COMPLIANCE AREA ───────────────────────────────────────────
  compliance: {
    palette: 0,
    hueShift: 0,
    label: 'Compliance',
    deskUid: 'paganini-desk-compliance',
    seatUid: 'paganini-chair-compliance',
    facingDir: Dir.UP,
    numericId: 1,
    area: 'compliance',
  },
  due_diligence: {
    palette: 1,
    hueShift: 0,
    label: 'Due Diligence',
    deskUid: 'paganini-desk-due',
    seatUid: 'paganini-chair-due',
    facingDir: Dir.UP,
    numericId: 2,
    area: 'compliance',
  },
  reg_watch: {
    palette: 2,
    hueShift: 0,
    label: 'Reg Watch',
    deskUid: 'paganini-desk-reg',
    seatUid: 'paganini-chair-reg',
    facingDir: Dir.UP,
    numericId: 3,
    area: 'compliance',
  },
  monitoring: {
    palette: 3,
    hueShift: 0,
    label: 'Monitoramento',
    deskUid: 'paganini-desk-mon',
    seatUid: 'paganini-chair-mon',
    facingDir: Dir.UP,
    numericId: 4,
    area: 'compliance',
  },
  onboard: {
    palette: 4,
    hueShift: 0,
    label: 'Onboarding',
    deskUid: 'paganini-desk-onboard',
    seatUid: 'paganini-chair-onboard',
    facingDir: Dir.RIGHT,
    numericId: 5,
    area: 'compliance',
  },

  // ── OPERATIONS / ADMIN AREA ───────────────────────────────────
  admin: {
    palette: 5,
    hueShift: 0,
    label: 'Admin',
    deskUid: 'paganini-desk-admin',
    seatUid: 'paganini-chair-admin',
    facingDir: Dir.UP,
    numericId: 6,
    area: 'operations',
  },
  gestor: {
    palette: 0,
    hueShift: 60,
    label: 'Gestor',
    deskUid: 'paganini-desk-gestor',
    seatUid: 'paganini-chair-gestor',
    facingDir: Dir.UP,
    numericId: 7,
    area: 'operations',
  },
  operations: {
    palette: 1,
    hueShift: 90,
    label: 'Operações',
    deskUid: 'paganini-desk-ops',
    seatUid: 'paganini-chair-ops',
    facingDir: Dir.UP,
    numericId: 8,
    area: 'operations',
  },
  pricing: {
    palette: 2,
    hueShift: 120,
    label: 'Precificação',
    deskUid: 'paganini-desk-pricing',
    seatUid: 'paganini-chair-pricing',
    facingDir: Dir.UP,
    numericId: 9,
    area: 'operations',
  },

  // ── RISK AREA ─────────────────────────────────────────────────
  risk: {
    palette: 3,
    hueShift: 180,
    label: 'Risco',
    deskUid: 'paganini-desk-risk',
    seatUid: 'paganini-chair-risk',
    facingDir: Dir.UP,
    numericId: 10,
    area: 'risk',
  },
  auditor: {
    palette: 4,
    hueShift: 210,
    label: 'Auditoria',
    deskUid: 'paganini-desk-auditor',
    seatUid: 'paganini-chair-auditor',
    facingDir: Dir.UP,
    numericId: 11,
    area: 'risk',
  },
  'custódia': {
    palette: 5,
    hueShift: 240,
    label: 'Custódia',
    deskUid: 'paganini-desk-custodia',
    seatUid: 'paganini-chair-custodia',
    facingDir: Dir.RIGHT,
    numericId: 12,
    area: 'risk',
  },

  // ── IR / REPORTING AREA ───────────────────────────────────────
  ir: {
    palette: 0,
    hueShift: 300,
    label: 'Relações com Investidores',
    deskUid: 'paganini-desk-ir',
    seatUid: 'paganini-chair-ir',
    facingDir: Dir.UP,
    numericId: 13,
    area: 'ir',
  },
  reporting: {
    palette: 1,
    hueShift: 330,
    label: 'Relatórios',
    deskUid: 'paganini-desk-reporting',
    seatUid: 'paganini-chair-reporting',
    facingDir: Dir.UP,
    numericId: 14,
    area: 'ir',
  },
};

/** All agent IDs in a consistent order */
export const ALL_AGENT_IDS: PaganiniAgentId[] = [
  'compliance',
  'due_diligence',
  'reg_watch',
  'monitoring',
  'onboard',
  'admin',
  'gestor',
  'operations',
  'pricing',
  'risk',
  'auditor',
  'custódia',
  'ir',
  'reporting',
];

/** Get agent config by string ID, with fallback for unknown agents */
export function getAgentConfig(id: string): AgentCharacterConfig | null {
  return AGENT_CONFIGS[id as PaganiniAgentId] ?? null;
}

/** Map string agent ID to numeric engine ID */
export function agentStringToNumericId(id: string): number {
  const config = getAgentConfig(id);
  return config?.numericId ?? 0;
}
