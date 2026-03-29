# pixel-office

Pixel art office visualization for the Paganini AIOS dashboard. Renders 14 animated agents as pixel characters in a tiled office, powered by a Canvas 2D game loop.

## Quick Start

```tsx
import { PixelOffice } from '@/components/pixel-office/PixelOffice';
import { useAgentSync } from '@/components/pixel-office/useAgentSync';

export default function DashboardPage() {
  const agents = useAgentSync(); // demo mode by default
  
  return (
    <div style={{ width: '100%', height: 600 }}>
      <PixelOffice agents={agents} />
    </div>
  );
}
```

## Components

### `PixelOffice` — Main component

```tsx
interface PixelOfficeProps {
  agents: AgentStatus[];        // 14 Paganini agent states
  className?: string;           // optional CSS class
  showLabels?: boolean;         // show agent legend (default: true)
  initialZoom?: number;         // zoom level 1-6 (default: 2)
  backgroundColor?: string;     // canvas background (default: '#1a1a2e')
}
```

### `AgentStatus` — Agent state interface

```tsx
interface AgentStatus {
  id: string;              // "compliance", "gestor", "admin", etc.
  name: string;            // Display name
  state: "active" | "idle" | "waiting" | "error";
  currentTask?: string;    // What they're doing
  tool?: string;           // Current tool (Read, Write, Execute, Search, etc.)
  fund_id?: string;        // Fund being worked on
}
```

### `useAgentSync` — Agent state hook

```tsx
// Demo mode (default — cycles through mock states):
const agents = useAgentSync();

// Poll a real API endpoint:
const agents = useAgentSync({
  endpoint: '/api/agents/status',
  pollIntervalMs: 5000,
});

// Explicit demo mode:
const agents = useAgentSync({ demoMode: true });
```

## Architecture

```
pixel-office/
├── PixelOffice.tsx       # Main React component (canvas + UI overlay)
├── useAgentSync.ts       # Agent state hook (demo/API modes)
├── agentMapping.ts       # Agent ID → palette/hue/label/seat mapping
├── defaultLayout.ts      # Pre-designed 28×20 office layout
├── constants.ts          # All game engine constants
├── types.ts              # All shared TypeScript types
├── colorize.ts           # HSB sprite colorization
├── floorTiles.ts         # Floor sprite loading + colorization
├── wallTiles.ts          # Wall sprite rendering helpers
├── characters.ts         # Character FSM + animation
├── officeState.ts        # Office state manager (agents, seats, pathfinding)
├── gameLoop.ts           # RAF-based game loop
├── renderer.ts           # Canvas 2D draw calls
├── matrixEffect.ts       # Spawn/despawn digital rain effect
├── sprites/
│   ├── spriteCache.ts    # Canvas sprite cache (zoom-keyed)
│   └── spriteData.ts     # Character sprite loader + hue shift
└── layout/
    ├── tileMap.ts         # BFS pathfinding + walkability
    ├── layoutSerializer.ts # Layout ↔ JSON serialization
    └── furnitureCatalog.ts # Furniture asset catalog
```

## Agents & Areas

| Agent | Label | Area | Palette |
|-------|-------|------|---------|
| compliance | Compliance | Compliance | 0 |
| due_diligence | Due Diligence | Compliance | 1 |
| reg_watch | Reg Watch | Compliance | 2 |
| monitoring | Monitoramento | Compliance | 3 |
| onboard | Onboarding | Compliance | 4 |
| admin | Admin | Operações | 5 |
| gestor | Gestor | Operações | 0+60° |
| operations | Operações | Operações | 1+90° |
| pricing | Precificação | Operações | 2+120° |
| risk | Risco | Risco | 3+180° |
| auditor | Auditoria | Risco | 4+210° |
| custódia | Custódia | Risco | 5+240° |
| ir | Relações c/ Investidores | RI | 0+300° |
| reporting | Relatórios | RI | 1+330° |

## Character Behavior

| Agent State | Tool | Animation |
|-------------|------|-----------|
| `active` | Write / Execute | Typing at desk |
| `active` | Read / Search / Fetch | Reading pose |
| `waiting` | any | Idle + ⏳ speech bubble |
| `error` | any | Idle + ❌ speech bubble |
| `idle` | — | Wandering around office |

## Assets

Assets must be in `public/pixel-office/`:
- `characters/char_0.png` through `char_5.png` — character sprite sheets
- `floors/floor_0.png` through `floor_8.png` — floor tile textures
- `furniture-manifest.json` — furniture catalog (optional; uses placeholders if missing)

## Zoom & Controls

- Scroll wheel to zoom in/out
- `+` / `−` buttons (bottom-right corner)
- Click a character to show agent tooltip with current task, tool, and fund info

## Connecting to Real Agent Data

Replace demo mode with a real endpoint when the Paganini agent runtime exposes a status API:

```tsx
const agents = useAgentSync({
  endpoint: process.env.NEXT_PUBLIC_AGENTS_API + '/status',
  pollIntervalMs: 3000,
  demoMode: process.env.NODE_ENV === 'development',
});
```

The endpoint should return `AgentStatus[]` matching the interface above.
