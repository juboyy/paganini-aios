'use client';

/**
 * PixelOffice.tsx — Main Paganini pixel office visualization component
 *
 * Standalone canvas-based office with 14 animated agent characters.
 * No VS Code dependencies. Works in Next.js App Router context.
 *
 * Usage:
 *   import { PixelOffice } from '@/components/pixel-office/PixelOffice';
 *   import { useAgentSync } from '@/components/pixel-office/useAgentSync';
 *
 *   const agents = useAgentSync();
 *   <PixelOffice agents={agents} />
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { AgentStatus } from './useAgentSync';
import { AGENT_CONFIGS, ALL_AGENT_IDS } from './agentMapping';
import { DEFAULT_PAGANINI_LAYOUT } from './defaultLayout';
import { setCharacterTemplates } from './sprites/spriteData';
import { setFloorSprites, loadPngToSpriteData } from './floorTiles';
import { OfficeState } from './officeState';
import { startGameLoop } from './gameLoop';
import { renderFrame } from './renderer';
import { TILE_SIZE } from './types';
import type { SpriteData } from './types';
import { buildDynamicCatalog } from './layout/furnitureCatalog';
import type { LoadedAssetData } from './layout/furnitureCatalog';

// ── Constants ─────────────────────────────────────────────────────

const ZOOM_DEFAULT = 2;
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const CHAR_SPRITE_BASE = '/pixel-office/characters/';
const FLOOR_SPRITE_BASE = '/pixel-office/floors/';
const NUM_CHAR_SPRITES = 6;
const NUM_FLOOR_SPRITES = 9;

// ── Speech bubble overlay (drawn in HTML, not canvas) ─────────────

interface BubbleInfo {
  id: string;
  name: string;
  task: string;
  state: AgentStatus['state'];
  x: number; // canvas pixel x
  y: number; // canvas pixel y
}

// ── Loader ────────────────────────────────────────────────────────

async function loadCharacterSprites(basePath: string): Promise<boolean> {
  const chars: Array<{ down: SpriteData[]; up: SpriteData[]; right: SpriteData[] }> = [];

  for (let i = 0; i < NUM_CHAR_SPRITES; i++) {
    // Each character sheet: char_N_walk_down.png, char_N_walk_up.png, char_N_walk_right.png
    // Each contains multiple frames stacked vertically: walk(3) + type(2) + read(2) = 7 frames × 16px = 112px tall, 16px wide
    const dirs = ['down', 'up', 'right'] as const;
    const dirSprites: Record<string, SpriteData[]> = {};

    for (const dir of dirs) {
      const url = `${basePath}char_${i}.png`;
      const sheet = await loadPngToSpriteData(url);
      if (!sheet) {
        // Fallback: empty sprites
        dirSprites[dir] = Array(7).fill([['']]);
        continue;
      }
      // Slice sprite sheet into frames. Each character frame is 16px tall.
      const FRAME_H = 16;
      const frameCount = Math.floor(sheet.length / FRAME_H);
      const frames: SpriteData[] = [];
      for (let f = 0; f < frameCount; f++) {
        frames.push(sheet.slice(f * FRAME_H, (f + 1) * FRAME_H));
      }
      // Pad to at least 7 frames
      while (frames.length < 7) frames.push(frames[0] ?? [['']]);
      dirSprites[dir] = frames;
    }

    chars.push({
      down: dirSprites['down'],
      up: dirSprites['up'],
      right: dirSprites['right'],
    });
  }

  setCharacterTemplates(chars);
  return true;
}

async function loadFloorSpriteSheets(basePath: string): Promise<boolean> {
  const sprites: SpriteData[] = [];
  for (let i = 0; i < NUM_FLOOR_SPRITES; i++) {
    const url = `${basePath}floor_${i}.png`;
    const sprite = await loadPngToSpriteData(url);
    // If not found, push a 16x16 grey fallback
    sprites.push(sprite ?? Array(16).fill(Array(16).fill('#808080')));
  }
  setFloorSprites(sprites);
  return true;
}

// ── Props ─────────────────────────────────────────────────────────

export interface PixelOfficeProps {
  /** Current state of all Paganini agents */
  agents: AgentStatus[];
  /** Optional CSS class */
  className?: string;
  /** Show agent name labels. Default: true */
  showLabels?: boolean;
  /** Initial zoom level. Default: 2 */
  initialZoom?: number;
  /** Background color behind the canvas. Default: '#1a1a2e' */
  backgroundColor?: string;
}

// ── Component ─────────────────────────────────────────────────────

export function PixelOffice({
  agents,
  className,
  showLabels = true,
  initialZoom = ZOOM_DEFAULT,
  backgroundColor = '#1a1a2e',
}: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const officeStateRef = useRef<OfficeState | null>(null);
  const agentsRef = useRef<AgentStatus[]>(agents);

  const [zoom, setZoom] = useState(initialZoom);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltipAgent, setTooltipAgent] = useState<AgentStatus | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Keep agents ref current without triggering re-renders
  agentsRef.current = agents;

  // ── Initialize assets + office state ──────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Load sprites (character + floor) in parallel
        await Promise.all([
          loadCharacterSprites(CHAR_SPRITE_BASE),
          loadFloorSpriteSheets(FLOOR_SPRITE_BASE),
        ]);

        // Try to load furniture assets (may fail gracefully if manifest not available)
        try {
          const manifestRes = await fetch('/pixel-office/furniture-manifest.json');
          if (manifestRes.ok) {
            const assetData: LoadedAssetData = await manifestRes.json();
            buildDynamicCatalog(assetData);
          } else {
            console.warn('[PixelOffice] Furniture manifest not found — using placeholders');
          }
        } catch {
          console.warn('[PixelOffice] Furniture assets not loaded — using placeholders');
        }

        if (cancelled) return;

        // Initialize office state with the Paganini default layout
        const state = new OfficeState(DEFAULT_PAGANINI_LAYOUT);
        officeStateRef.current = state;

        // Add all 14 agents with their configured palette/hueShift/seat
        for (const agentId of ALL_AGENT_IDS) {
          const config = AGENT_CONFIGS[agentId];
          state.addAgent(
            config.numericId,
            config.palette,
            config.hueShift,
            config.seatUid,
            true, // skip spawn effect on init
          );
        }

        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pixel office');
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync agent states → office engine ─────────────────────────

  useEffect(() => {
    const state = officeStateRef.current;
    if (!state || !loaded) return;

    for (const agent of agents) {
      const config = AGENT_CONFIGS[agent.id as keyof typeof AGENT_CONFIGS];
      if (!config) continue;

      const numericId = config.numericId;
      const isActive = agent.state === 'active';

      // Update active state
      state.setAgentActive(numericId, isActive);

      // Update tool
      state.setAgentTool(numericId, agent.tool ?? null);

      // Bubbles: waiting → waiting bubble, error → permission bubble (shows as alert)
      const ch = state.characters.get(numericId);
      if (ch) {
        if (agent.state === 'waiting' && ch.bubbleType !== 'waiting') {
          state.showWaitingBubble(numericId);
        } else if (agent.state === 'error' && ch.bubbleType !== 'permission') {
          state.showPermissionBubble(numericId);
        } else if (agent.state !== 'waiting' && agent.state !== 'error' && ch.bubbleType) {
          state.clearPermissionBubble(numericId);
        }
      }
    }
  }, [agents, loaded]);

  // ── Game loop ──────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const state = officeStateRef.current;
    if (!canvas || !state || !loaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let panX = 0;
    let panY = 0;

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        state.update(dt);
      },
      render: (renderCtx) => {
        const w = canvas.width;
        const h = canvas.height;

        renderFrame(
          renderCtx,
          w,
          h,
          state.tileMap,
          state.furniture,
          state.getCharacters(),
          zoom,
          panX,
          panY,
          undefined, // no selection/hover state
          undefined, // no editor state
          state.layout.tileColors ?? undefined,
          state.layout.cols,
          state.layout.rows,
        );
      },
    });

    return stop;
  }, [loaded, zoom]);

  // ── Canvas resize observer ─────────────────────────────────────

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // Integer scaling: use DPR but keep pixel-art crisp
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.imageSmoothingEnabled = false;
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Zoom controls ──────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -1 : 1;
        return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + delta));
      });
    },
    [],
  );

  // ── Canvas click → agent tooltip ──────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const state = officeStateRef.current;
      const canvas = canvasRef.current;
      if (!state || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const clickX = (e.clientX - rect.left) * dpr;
      const clickY = (e.clientY - rect.top) * dpr;

      // Convert to world coords (accounting for centering)
      const mapW = state.layout.cols * TILE_SIZE * zoom;
      const mapH = state.layout.rows * TILE_SIZE * zoom;
      const offsetX = Math.floor((canvas.width - mapW) / 2);
      const offsetY = Math.floor((canvas.height - mapH) / 2);
      const worldX = (clickX - offsetX) / zoom;
      const worldY = (clickY - offsetY) / zoom;

      const clickedId = state.getCharacterAt(worldX, worldY);
      if (clickedId !== null) {
        // Find agent status
        const config = Object.values(AGENT_CONFIGS).find((c) => c.numericId === clickedId);
        if (config) {
          const agent = agentsRef.current.find((a) => {
            const cfg = AGENT_CONFIGS[a.id as keyof typeof AGENT_CONFIGS];
            return cfg?.numericId === clickedId;
          });
          if (agent) {
            setTooltipAgent(agent);
            setTooltipPos({ x: e.clientX, y: e.clientY });
          }
        }
      } else {
        setTooltipAgent(null);
      }
    },
    [zoom],
  );

  // ── State indicator colors ─────────────────────────────────────

  const stateColor = (state: AgentStatus['state']) => {
    switch (state) {
      case 'active':  return '#22c55e'; // green
      case 'idle':    return '#64748b'; // slate
      case 'waiting': return '#f59e0b'; // amber
      case 'error':   return '#ef4444'; // red
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: backgroundColor,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
      ref={containerRef}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          cursor: 'crosshair',
          imageRendering: 'pixelated',
        }}
      />

      {/* Loading state */}
      {!loaded && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: 14,
            fontFamily: 'monospace',
            background: backgroundColor,
          }}
        >
          <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            Inicializando escritório...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            fontSize: 13,
            fontFamily: 'monospace',
            background: backgroundColor,
            padding: 16,
            textAlign: 'center',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Zoom controls */}
      {loaded && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 1))}
            style={zoomBtnStyle}
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 1))}
            style={zoomBtnStyle}
            title="Zoom out"
          >
            −
          </button>
        </div>
      )}

      {/* Agent status legend */}
      {loaded && showLabels && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 6,
            padding: '6px 10px',
            backdropFilter: 'blur(4px)',
            maxHeight: 'calc(100% - 32px)',
            overflowY: 'auto',
          }}
        >
          {agents.map((agent) => {
            const config = AGENT_CONFIGS[agent.id as keyof typeof AGENT_CONFIGS];
            if (!config) return null;
            return (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: stateColor(agent.state),
                    flexShrink: 0,
                    boxShadow: agent.state === 'active'
                      ? `0 0 4px ${stateColor(agent.state)}`
                      : 'none',
                  }}
                />
                <span style={{ color: '#94a3b8', minWidth: 80 }}>{config.label}</span>
                {agent.currentTask && (
                  <span
                    style={{ color: '#64748b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={agent.currentTask}
                  >
                    {agent.currentTask.length > 24
                      ? agent.currentTask.slice(0, 24) + '…'
                      : agent.currentTask}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Click tooltip */}
      {tooltipAgent && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 8,
            background: 'rgba(15, 23, 42, 0.95)',
            border: `1px solid ${stateColor(tooltipAgent.state)}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: 12,
            fontFamily: 'monospace',
            zIndex: 1000,
            maxWidth: 220,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, color: stateColor(tooltipAgent.state) }}>
            {tooltipAgent.name}
          </div>
          <div style={{ color: '#94a3b8', marginBottom: 2 }}>
            Estado: <span style={{ color: stateColor(tooltipAgent.state) }}>{tooltipAgent.state}</span>
          </div>
          {tooltipAgent.currentTask && (
            <div style={{ color: '#94a3b8', marginBottom: 2 }}>
              Tarefa: <span style={{ color: '#e2e8f0' }}>{tooltipAgent.currentTask}</span>
            </div>
          )}
          {tooltipAgent.tool && (
            <div style={{ color: '#94a3b8', marginBottom: 2 }}>
              Tool: <span style={{ color: '#e2e8f0' }}>{tooltipAgent.tool}</span>
            </div>
          )}
          {tooltipAgent.fund_id && (
            <div style={{ color: '#94a3b8' }}>
              Fundo: <span style={{ color: '#e2e8f0' }}>{tooltipAgent.fund_id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const zoomBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  background: 'rgba(30, 41, 59, 0.9)',
  border: '1px solid rgba(100, 116, 139, 0.4)',
  borderRadius: 6,
  color: '#94a3b8',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
  fontFamily: 'monospace',
};

export default PixelOffice;
