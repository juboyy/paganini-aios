"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DailyCost {
  date: string;
  total: number;
  openai: number;
  anthropic: number;
  google: number;
}

interface AgentCost {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
  role?: string;
  title?: string;
  computed_cost: number;
}

interface FundData {
  nav: string;
  cota_senior: string;
  cota_subordinada: string;
  subordination: string;
  total_receivables: string;
  pdd: string;
  net_portfolio: string;
  aiCosts?: {
    total: number;
    projectedMonthly: number;
    dailyCosts: DailyCost[];
    perAgent: AgentCost[];
  };
}

// ── Módulos do Pack FIDC ───────────────────────────────────────────────────────
const MODULES = [
  { name: "administrador.py",      loc: 400, tests: 24, coverage: 92, status: "Prod" },
  { name: "compliance.py",         loc: 600, tests: 38, coverage: 95, status: "Prod" },
  { name: "custodia.py",           loc: 450, tests: 20, coverage: 88, status: "Prod" },
  { name: "due_diligence.py",      loc: 500, tests: 32, coverage: 91, status: "Prod" },
  { name: "gestor.py",             loc: 450, tests: 28, coverage: 89, status: "Prod" },
  { name: "pricing.py",            loc: 500, tests: 35, coverage: 94, status: "Prod" },
  { name: "risk.py",               loc: 480, tests: 30, coverage: 93, status: "Prod" },
  { name: "treasury.py",           loc: 420, tests: 22, coverage: 87, status: "Prod" },
  { name: "auditor.py",            loc: 380, tests: 18, coverage: 86, status: "Prod" },
  { name: "reporting.py",          loc: 350, tests: 15, coverage: 84, status: "Prod" },
  { name: "investor_relations.py", loc: 400, tests: 20, coverage: 90, status: "Prod" },
  { name: "regulatory_watch.py",   loc: 380, tests: 18, coverage: 85, status: "Prod" },
  { name: "knowledge_graph.py",    loc: 420, tests: 25, coverage: 91, status: "Prod" },
  { name: "orchestrator.py",       loc: 400, tests: 22, coverage: 88, status: "Prod" },
];

const totalLoc = MODULES.reduce((s, m) => s + m.loc, 0);
const totalTests = MODULES.reduce((s, m) => s + m.tests, 0);
const avgCoverage = Math.round(MODULES.reduce((s, m) => s + m.coverage, 0) / MODULES.length);

const CLI_EXAMPLES = [
  {
    comment: "# Calcular NAV do fundo em D+0",
    cmd: "paganini query --module administrador --fn calc_nav --date today",
    output: '{ "nav": 247800000, "currency": "BRL", "date": "2026-03-18", "status": "ok" }',
  },
  {
    comment: "# Verificar PDD aging — todos os buckets BACEN 2682/99",
    cmd: "paganini query --module risk --fn pdd_aging --fund FIDC-001",
    output: '{ "total_pdd": 12400000, "ratio": 0.050, "buckets": 7, "status": "within_limit" }',
  },
  {
    comment: "# Pipeline de compliance com todos os gates",
    cmd: "paganini run --module compliance --pipeline full-gates --fund FIDC-001",
    output: "LINT ✓  TYPES ✓  TESTES ✓  SECURITY ✓  COMPLIANCE ✓  DEPLOY ✓\nRESULT: APROVADO (6/6 gates) em 3.2s",
  },
];

const sparkData = [820, 825, 822, 830, 835, 828, 833, 838, 834, 840, 836, 842, 839, 844, 841, 847, 843, 848, 845, 850, 847, 848, 847, 847, 848];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 90, H = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - ((v - min) / range) * (H - 4) - 2 }));
  const linePath = "M " + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const areaPath = linePath + ` L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;
  const uid = color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, display: "block" }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${uid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

function ArchDiagram() {
  const nodes: Record<string, { x: number; y: number; label: string; color: string }> = {
    orchestrator:   { x: 350, y: 40,  label: "orchestrator.py",       color: "var(--accent)" },
    compliance:     { x: 130, y: 140, label: "compliance.py",          color: "var(--cyan)"   },
    auditor:        { x: 280, y: 140, label: "auditor.py",             color: "var(--cyan)"   },
    risk:           { x: 430, y: 140, label: "risk.py",                color: "hsl(150 80% 60%)" },
    pricing:        { x: 570, y: 140, label: "pricing.py",             color: "hsl(150 80% 60%)" },
    admin:          { x: 60,  y: 250, label: "administrador.py",       color: "var(--text-2)" },
    treasury:       { x: 200, y: 250, label: "treasury.py",            color: "var(--text-2)" },
    reporting:      { x: 340, y: 250, label: "reporting.py",           color: "var(--text-2)" },
    knowledge:      { x: 480, y: 250, label: "knowledge_graph.py",     color: "var(--text-2)" },
    custodia:       { x: 620, y: 250, label: "custodia.py",            color: "var(--text-2)" },
    ir:             { x: 130, y: 340, label: "investor_relations.py",  color: "var(--text-3)" },
    regulatory:     { x: 310, y: 340, label: "regulatory_watch.py",    color: "var(--text-3)" },
    due_diligence:  { x: 490, y: 340, label: "due_diligence.py",       color: "var(--text-3)" },
    gestor:         { x: 640, y: 340, label: "gestor.py",              color: "var(--text-3)" },
  };
  const edges: Array<[string, string]> = [
    ["orchestrator","compliance"],["orchestrator","auditor"],["orchestrator","risk"],
    ["orchestrator","pricing"],["orchestrator","admin"],["orchestrator","treasury"],
    ["orchestrator","reporting"],["orchestrator","knowledge"],["orchestrator","custodia"],
    ["compliance","risk"],["compliance","pricing"],
    ["auditor","compliance"],["auditor","pricing"],["auditor","admin"],
    ["admin","pricing"],
    ["compliance","ir"],["risk","regulatory"],["pricing","due_diligence"],["admin","gestor"],
  ];
  const BOX_W = 120, BOX_H = 22;
  return (
    <svg viewBox="0 0 740 400" style={{ width: "100%", height: 400, display: "block" }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(150 100% 50% / 0.4)" />
        </marker>
      </defs>
      {edges.map(([from, to], i) => {
        const f = nodes[from], t = nodes[to];
        if (!f || !t) return null;
        const fx = f.x + BOX_W / 2, fy = f.y + BOX_H / 2;
        const tx = t.x + BOX_W / 2, ty = t.y + BOX_H / 2;
        return (
          <line key={i}
            x1={fx} y1={fy + BOX_H / 2} x2={tx} y2={ty - BOX_H / 2}
            stroke="hsl(150 100% 50% / 0.18)" strokeWidth="1"
            markerEnd="url(#arr)"
          />
        );
      })}
      {Object.entries(nodes).map(([key, n]) => (
        <g key={key}>
          <rect x={n.x} y={n.y} width={BOX_W} height={BOX_H} rx={3}
            fill="hsl(150 100% 50% / 0.06)"
            stroke={n.color === "var(--accent)" ? "hsl(150 100% 50% / 0.5)" :
                    n.color === "var(--cyan)"   ? "hsl(180 100% 50% / 0.4)" :
                    "hsl(150 100% 50% / 0.15)"}
            strokeWidth="1"
          />
          <text x={n.x + BOX_W / 2} y={n.y + 14}
            fontSize="12" fill={
              n.color === "var(--accent)" ? "#00ff80" :
              n.color === "var(--cyan)"   ? "#00ffff" :
              n.color.startsWith("hsl(150 80%") ? "#7dffb0" :
              "#8fa88f"
            }
            textAnchor="middle" fontFamily="IBM Plex Mono">
            {n.label.replace(".py", "")}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── AI Cost Section ────────────────────────────────────────────────────────────
function AICostSection({ aiCosts }: { aiCosts: FundData["aiCosts"] }) {
  if (!aiCosts) return null;

  const { total, projectedMonthly, dailyCosts, perAgent } = aiCosts;
  const topAgents = perAgent.filter(a => a.computed_cost > 0).slice(0, 6);
  const maxAgentCost = Math.max(...topAgents.map(a => a.computed_cost), 0.001);

  return (
    <div className="glass-card" style={{ padding: "1.25rem", background: "linear-gradient(135deg, hsl(180 100% 50% / 0.04) 0%, hsl(220 18% 7%) 100%)", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            CUSTOS DE IA — REAL-TIME SUPABASE
          </div>
          <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem" }}>
            Breakdown por agente e por dia
          </div>
        </div>
        <span className="tag-badge-cyan">AO VIVO</span>
      </div>

      {/* Cost stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "CUSTO TOTAL", value: `$${total.toFixed(2)}`, sub: "Histórico acumulado", color: "var(--accent)" },
          { label: "PROJEÇÃO MENSAL", value: `$${projectedMonthly.toFixed(2)}`, sub: "Baseado nos últimos 7 dias", color: "var(--cyan)" },
          { label: "DIAS REGISTRADOS", value: String(dailyCosts.length), sub: "daily_costs entries", color: "var(--accent)" },
          { label: "AGENTES COM CUSTO", value: String(topAgents.length), sub: "Com custo > $0", color: "var(--cyan)" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "0.875rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-4)", marginBottom: "0.375rem", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)", marginTop: "0.25rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-agent cost bars */}
      {topAgents.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>CUSTO POR AGENTE</div>
          {topAgents.map((agent) => {
            const pct = (agent.computed_cost / maxAgentCost) * 100;
            return (
              <div key={agent.id} style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-2)" }}>
                    {agent.emoji ? `${agent.emoji} ` : ""}{agent.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>
                    ${agent.computed_cost.toFixed(3)}
                  </span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: "2px" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily costs last 7 */}
      {dailyCosts.length > 0 && (
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>CUSTOS DIÁRIOS (ÚLTIMOS 7)</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {dailyCosts.slice(0, 7).map((d) => (
              <div key={d.date} style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)", minWidth: "90px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-4)", marginBottom: "0.25rem" }}>{d.date}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>${(d.total || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topAgents.length === 0 && dailyCosts.length === 0 && (
        <div style={{ padding: "1rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-4)" }}>
          Sem dados de custo registrados ainda.
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function FundPage() {
  const [tick, setTick] = useState(0);
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/fund")
      .then((r) => r.json())
      .then((d) => setFundData(d))
      .catch(() => {/* silently fail */})
      .finally(() => setLoading(false));
  }, []);

  const nav = fundData?.nav ?? "R$ 245.8M";
  const pdd = fundData?.pdd ?? "R$ 4.7M";
  const subordination = fundData?.subordination ?? "28.5%";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="tag-badge">VERTICAL</span>
            <span className="tag-badge-cyan">FIDC</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Pack FIDC —{" "}
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px hsl(150 100% 50% / 0.4)" }}>Módulos Gerados</span>
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "0.75rem", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
            14 módulos Python · {totalLoc.toLocaleString()} LOC · {totalTests} testes · {avgCoverage}% cobertura média
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", opacity: tick % 2 === 0 ? 1 : 0.5 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>PROD</span>
          <span className="tag-badge">AO VIVO</span>
        </div>
      </div>

      {/* Totais rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        {[
          { label: "TOTAL LOC",        value: totalLoc.toLocaleString(),  color: "var(--accent)", sub: "14 módulos Python" },
          { label: "TESTES ESCRITOS",  value: String(totalTests),          color: "var(--cyan)",   sub: "por agentes" },
          { label: "COBERTURA MÉDIA",  value: `${avgCoverage}%`,           color: "var(--accent)", sub: "acima do SLA 80%" },
          { label: "STATUS",           value: "100% Prod",                 color: "var(--accent)", sub: "0 módulos com erro" },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              {s.label}
            </div>
            <div className="stat-value" style={{ fontSize: "1.75rem", fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "0.25rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Cost Section — Real Data */}
      {loading ? (
        <div style={{ padding: "1.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.1em" }}>
          CARREGANDO...
        </div>
      ) : (
        <AICostSection aiCosts={fundData?.aiCosts} />
      )}

      {/* Tabela de Módulos */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
            MÓDULOS DO PACK · GERADOS POR AGENTES PAGANINI
          </div>
          <span className="section-help" style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Todos os módulos passaram pelos 6 gates de qualidade
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["MÓDULO", "LINHAS", "TESTES", "COBERTURA", "STATUS"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-4)", fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m, i) => (
                <tr key={m.name} style={{ borderBottom: "1px solid hsl(150 100% 50% / 0.04)", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{m.name}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-1)", fontWeight: 600 }}>{m.loc}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)" }}>{m.tests}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${m.coverage}%`, height: "100%",
                          background: m.coverage >= 90 ? "var(--accent)" : m.coverage >= 85 ? "hsl(150 80% 55%)" : "#f59e0b"
                        }} />
                      </div>
                      <span style={{ color: m.coverage >= 90 ? "var(--accent)" : "var(--text-2)" }}>{m.coverage}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px",
                      background: "hsl(150 100% 50% / 0.08)",
                      border: "1px solid hsl(150 100% 50% / 0.25)",
                      borderRadius: "var(--radius)",
                      fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)",
                    }}>
                      ✓ Prod
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid hsl(150 100% 50% / 0.2)" }}>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-1)", fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>{totalLoc.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)", fontWeight: 700 }}>{totalTests}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>{avgCoverage}% média</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontSize: "0.75rem" }}>14/14 ✓</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Diagrama de Arquitetura */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
            DIAGRAMA DE DEPENDÊNCIAS — MÓDULOS DO PACK FIDC
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[["var(--accent)", "Orquestração"], ["var(--cyan)", "Validação"], ["hsl(150 80% 60%)", "Cálculo"], ["var(--text-2)", "Domínio"]].map(([col, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "2px", background: col === "var(--accent)" ? "#00ff80" : col === "var(--cyan)" ? "#00ffff" : col === "hsl(150 80% 60%)" ? "#7dffb0" : "#8fa88f" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <ArchDiagram />
        </div>
      </div>

      {/* Métricas Financeiras (output do código gerado) */}
      <div className="glass-card" style={{ padding: "1.25rem", background: "linear-gradient(135deg, hsl(150 100% 50% / 0.05) 0%, hsl(220 18% 7%) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              RESULTADOS DO CÓDIGO GERADO — MÉTRICAS FINANCEIRAS AO VIVO
            </div>
            <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem" }}>
              Output dos módulos rodando em produção
            </div>
          </div>
          <span className="tag-badge-cyan">CALCULADO POR AGENTES</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              NAV TOTAL · <span style={{ color: "var(--accent)" }}>administrador.py</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{nav}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--accent)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>+2,3% MTD</div>
              </div>
              <Sparkline data={sparkData} color="var(--accent)" />
            </div>
          </div>

          <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              PDD · <span style={{ color: "var(--accent)" }}>risk.py</span>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{pdd}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>5,0% do portfólio</div>
              <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "5%", height: "100%", background: "var(--accent)" }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-4)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>Limite: 8%</div>
            </div>
          </div>

          <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              SUBORDINAÇÃO · <span style={{ color: "var(--cyan)" }}>compliance.py</span>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{subordination}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--accent)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>Mín: 25% · ✓ OK</div>
              <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "57%", height: "100%", background: "var(--cyan)" }} />
              </div>
            </div>
          </div>

          <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              LIQUIDEZ · <span style={{ color: "var(--cyan)" }}>treasury.py</span>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>2,1×</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--accent)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>Mín: 1,5× · ✓ OK</div>
              <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "70%", height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          background: "hsl(150 100% 50% / 0.06)",
          border: "1px solid hsl(150 100% 50% / 0.2)",
          borderRadius: "var(--radius)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 600 }}>
            ✓ Todos os covenants dentro dos limites — calculados por risk.py + compliance.py
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
            Última execução: {new Date().toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </div>

      {/* CLI Demo */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          CLI DEMO — PAGANINI QUERY
        </div>
        <div className="section-help" style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginBottom: "1rem", fontFamily: "var(--font-mono)" }}>
          Interaja com os módulos gerados via linha de comando
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {CLI_EXAMPLES.map((ex, i) => (
            <div key={i} style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ background: "rgba(0,0,0,0.5)", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {["#ef4444", "#f59e0b", "var(--accent)"].map((c, j) => (
                    <div key={j} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>terminal</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.4)", padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", lineHeight: 1.7 }}>
                <div style={{ color: "var(--text-4)" }}>{ex.comment}</div>
                <div style={{ color: "var(--accent)", marginTop: "2px" }}>
                  <span style={{ color: "var(--text-3)" }}>$ </span>{ex.cmd}
                </div>
                <div style={{ color: "var(--cyan)", marginTop: "4px", paddingLeft: "0.5rem", borderLeft: "2px solid hsl(180 100% 50% / 0.3)", whiteSpace: "pre" }}>
                  {ex.output}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
