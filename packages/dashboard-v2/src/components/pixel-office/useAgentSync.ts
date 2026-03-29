/**
 * useAgentSync.ts — Hook for Paganini agent state synchronization
 * 
 * Currently runs in demo mode: cycles through agent states every few seconds.
 * TODO: Replace mockData with real API polling or WebSocket connection.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { ALL_AGENT_IDS, type PaganiniAgentId } from './agentMapping';

// ── Types ─────────────────────────────────────────────────────────

export interface AgentStatus {
  /** Agent ID: "compliance", "gestor", "admin", etc. */
  id: string;
  /** Display name in Portuguese */
  name: string;
  /** Current operational state */
  state: 'active' | 'idle' | 'waiting' | 'error';
  /** What the agent is currently doing */
  currentTask?: string;
  /** Current tool being used (Read, Write, Execute, Search, etc.) */
  tool?: string;
  /** Fund being worked on */
  fund_id?: string;
}

// ── Portuguese display names ───────────────────────────────────────

const DISPLAY_NAMES: Record<PaganiniAgentId, string> = {
  admin: 'Admin',
  compliance: 'Compliance',
  'custódia': 'Custódia',
  due_diligence: 'Due Diligence',
  gestor: 'Gestor',
  ir: 'Relações c/ Investidores',
  pricing: 'Precificação',
  reg_watch: 'Reg Watch',
  reporting: 'Relatórios',
  auditor: 'Auditoria',
  monitoring: 'Monitoramento',
  onboard: 'Onboarding',
  risk: 'Risco',
  operations: 'Operações',
};

// ── Mock data for demo mode ────────────────────────────────────────

const MOCK_TASKS: Record<PaganiniAgentId, string[]> = {
  admin: ['Processando documentos', 'Verificando cadastros', 'Atualizando registros'],
  compliance: ['Revisando políticas', 'Verificando compliance PL 4.656', 'Auditando transações'],
  'custódia': ['Conciliando posições', 'Verificando ativos', 'Processando liquidações'],
  due_diligence: ['Analisando fundo FIDC-X', 'Verificando documentação', 'Relatório DD'],
  gestor: ['Analisando portfólio', 'Rebalanceando posições', 'Reunião de estratégia'],
  ir: ['Preparando relatório trimestral', 'Comunicado aos cotistas', 'Apresentação a investidores'],
  pricing: ['Calculando NAV', 'Precificando ativos', 'Verificando preços de mercado'],
  reg_watch: ['Monitorando CVM 175', 'Analisando circular BACEN', 'Atualizando regulamentos'],
  reporting: ['Gerando relatório mensal', 'Exportando demonstrações', 'Consolidando dados'],
  auditor: ['Verificando lançamentos', 'Conferindo balancete', 'Auditoria de controles'],
  monitoring: ['Monitorando limites', 'Verificando drawdown', 'Alertas de risco'],
  onboard: ['Processando novo cotista', 'Verificando KYC', 'Cadastrando fundo'],
  risk: ['Calculando VaR', 'Stress test portfólio', 'Avaliando concentração'],
  operations: ['Processando ordem', 'Verificando liquidação D+2', 'Reconciliação operacional'],
};

const TOOLS = ['Read', 'Write', 'Execute', 'Search', 'Fetch', 'Analyze'];
const FUNDS = ['FIDC-Paganini-I', 'FIA-Alpha', 'FII-Urbano', 'FIC-Conservador'];

function mockAgentStatus(id: PaganiniAgentId, phase: number): AgentStatus {
  const tasks = MOCK_TASKS[id];
  const name = DISPLAY_NAMES[id];

  // Spread agents across states so the demo looks varied
  const hash = id.charCodeAt(0) + id.length;
  const statePhase = (phase + hash) % 12;

  let state: AgentStatus['state'];
  let currentTask: string | undefined;
  let tool: string | undefined;
  let fund_id: string | undefined;

  if (statePhase < 6) {
    state = 'active';
    currentTask = tasks[(phase + hash) % tasks.length];
    tool = TOOLS[(phase + hash * 2) % TOOLS.length];
    fund_id = FUNDS[hash % FUNDS.length];
  } else if (statePhase < 8) {
    state = 'waiting';
    currentTask = 'Aguardando aprovação...';
  } else if (statePhase === 11) {
    state = 'error';
    currentTask = 'Falha na conexão';
  } else {
    state = 'idle';
  }

  return { id, name, state, currentTask, tool, fund_id };
}

// ── Hook ──────────────────────────────────────────────────────────

export interface UseAgentSyncOptions {
  /**
   * API endpoint to poll for agent status.
   * If omitted, runs in demo mode with mock data.
   */
  endpoint?: string;
  /** Polling interval in ms. Default: 5000 */
  pollIntervalMs?: number;
  /**
   * If true, always use mock data (demo mode).
   * Default: true when no endpoint is provided.
   */
  demoMode?: boolean;
}

export function useAgentSync(options: UseAgentSyncOptions = {}): AgentStatus[] {
  const { endpoint, pollIntervalMs = 5000, demoMode } = options;
  const useMock = demoMode !== false || !endpoint;

  const [agents, setAgents] = useState<AgentStatus[]>(() =>
    ALL_AGENT_IDS.map((id) => mockAgentStatus(id, 0)),
  );

  const phaseRef = useRef(0);

  useEffect(() => {
    if (useMock) {
      // Demo mode: cycle through states every pollInterval
      const interval = setInterval(() => {
        phaseRef.current += 1;
        const phase = phaseRef.current;
        setAgents(ALL_AGENT_IDS.map((id) => mockAgentStatus(id, phase)));
      }, pollIntervalMs);

      return () => clearInterval(interval);
    }

    // Real API mode: poll endpoint
    let cancelled = false;

    const fetchAgents = async () => {
      if (!endpoint) return;
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: AgentStatus[] = await res.json();
        if (!cancelled) setAgents(data);
      } catch (err) {
        console.warn('[useAgentSync] fetch error:', err);
        // Degrade gracefully: keep last known state
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [useMock, endpoint, pollIntervalMs]);

  return agents;
}
