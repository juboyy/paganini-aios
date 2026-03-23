"use client";

import { useState } from "react";

// ─── DATA ───────────────────────────────────────────────────────────────────

const QUALITY_TREND = [
  { label: "Jan", score: 7.2 },
  { label: "Fev 1", score: 7.8 },
  { label: "Fev 15", score: 8.1 },
  { label: "Mar 1", score: 8.3 },
  { label: "Mar 15", score: 8.5 },
  { label: "Mar 23", score: 8.7 },
];

const CODE_ISSUES = [
  { label: "Unused imports", count: 89 },
  { label: "Missing error handling", count: 67 },
  { label: "Type safety gaps", count: 54 },
  { label: "Performance anti-patterns", count: 43 },
  { label: "Missing tests", count: 38 },
];

const FIDC_ISSUES = [
  { label: "Guardrail bypass risk", count: 72 },
  { label: "Missing CVM citation", count: 58 },
  { label: "PDD calculation edge case", count: 45 },
  { label: "Concentration limit unchecked", count: 41 },
  { label: "PLD pattern incomplete", count: 34 },
];

const CODE_AGENTS_QUALITY = [
  { name: "OraCLI", emoji: "🎯", reviews: 234, issues: 45, fixed: 38, score: 9.1, trend: "+0.3" },
  { name: "Code Agent", emoji: "💻", reviews: 189, issues: 67, fixed: 52, score: 8.8, trend: "+0.5" },
  { name: "Codex", emoji: "⚡", reviews: 156, issues: 34, fixed: 31, score: 9.3, trend: "+0.2" },
  { name: "Architect", emoji: "🏗️", reviews: 98, issues: 23, fixed: 18, score: 8.9, trend: "+0.4" },
  { name: "QA Agent", emoji: "🧪", reviews: 145, issues: 12, fixed: 11, score: 9.5, trend: "+0.1" },
  { name: "Security Agent", emoji: "🔒", reviews: 87, issues: 56, fixed: 43, score: 8.4, trend: "+0.6" },
  { name: "PM Agent", emoji: "📋", reviews: 76, issues: 8, fixed: 7, score: 9.2, trend: "+0.1" },
  { name: "Docs Agent", emoji: "📝", reviews: 112, issues: 15, fixed: 14, score: 9.0, trend: "+0.3" },
  { name: "Infra Agent", emoji: "🏗", reviews: 65, issues: 28, fixed: 21, score: 8.6, trend: "+0.4" },
  { name: "Data Agent", emoji: "📊", reviews: 54, issues: 19, fixed: 15, score: 8.7, trend: "+0.3" },
  { name: "General Agent", emoji: "🔧", reviews: 43, issues: 9, fixed: 8, score: 9.1, trend: "+0.2" },
  { name: "Context Scout", emoji: "🔍", reviews: 38, issues: 5, fixed: 5, score: 9.4, trend: "+0.1" },
];

const FIDC_AGENTS_QUALITY = [
  { name: "Administrador", emoji: "📋", reviews: 67, issues: 32, fixed: 21, score: 8.5, trend: "+0.4" },
  { name: "Compliance", emoji: "⚖️", reviews: 89, issues: 48, fixed: 34, score: 8.2, trend: "+0.7" },
  { name: "Custodiante", emoji: "🔐", reviews: 56, issues: 22, fixed: 16, score: 8.8, trend: "+0.3" },
  { name: "Due Diligence", emoji: "🔍", reviews: 45, issues: 28, fixed: 18, score: 8.4, trend: "+0.5" },
  { name: "Gestor", emoji: "📊", reviews: 78, issues: 35, fixed: 24, score: 8.6, trend: "+0.4" },
  { name: "Investor Relations", emoji: "💬", reviews: 34, issues: 11, fixed: 9, score: 9.0, trend: "+0.2" },
  { name: "Pricing Engine", emoji: "💰", reviews: 67, issues: 42, fixed: 28, score: 8.3, trend: "+0.6" },
  { name: "Regulatory Watch", emoji: "📡", reviews: 56, issues: 19, fixed: 15, score: 8.9, trend: "+0.3" },
  { name: "Reporting", emoji: "📄", reviews: 45, issues: 14, fixed: 11, score: 8.7, trend: "+0.2" },
];

const FINISHING_TOUCHES = [
  { name: "Autofix de Issues", icon: "🔧", runs: 621, success: 573, successRate: 92.3, desc: "Corrige automaticamente issues detectadas no review — imports, types, patterns" },
  { name: "Geração de Testes", icon: "🧪", runs: 234, success: 198, successRate: 84.6, desc: "Gera unit tests para código novo — edge cases, error conditions, mocks" },
  { name: "Geração de Docstrings", icon: "📝", runs: 156, success: 149, successRate: 95.5, desc: "Documenta funções, classes e módulos automaticamente — PT-BR + inglês" },
  { name: "Simplificação de Código", icon: "✨", runs: 89, success: 76, successRate: 85.4, desc: "Identifica oportunidades de simplificação — DRY, decomposição, reuse" },
  { name: "Resolução de Conflitos", icon: "🔀", runs: 45, success: 38, successRate: 84.4, desc: "Resolve merge conflicts analisando a intenção de ambas as mudanças" },
  { name: "Recipes Customizadas", icon: "📜", runs: 78, success: 72, successRate: 92.3, desc: "Tasks recorrentes: reindexar corpus, atualizar guardrails, regenerar skills" },
];

const CUSTOM_RECIPES = [
  { name: "guardrail-update", trigger: "Mudança regulatória CVM/BACEN", actions: ["Scan novas circulares", "Atualizar gates", "Reindexar corpus", "Testar compliance"], lastRun: "2026-03-22", status: "active" },
  { name: "metaclaw-regen", trigger: "Novo skill detectado pelo MetaClaw", actions: ["Avaliar score", "Gerar template", "Testar contra eval set", "Promover ou podar"], lastRun: "2026-03-23", status: "active" },
  { name: "corpus-reindex", trigger: "Novo documento adicionado ao corpus", actions: ["Chunk + embed", "Atualizar BM25 index", "Validar retrieval", "AutoResearch run"], lastRun: "2026-03-21", status: "active" },
  { name: "post-deploy-smoke", trigger: "Deploy em produção", actions: ["Health check endpoints", "Query de referência", "Guardrail test", "Notificar Slack"], lastRun: "2026-03-23", status: "active" },
];

const RECENT_LEARNINGS = [
  { date: "2026-03-23", type: "accepted", agent: "Compliance", pattern: "CVM 175 Art. 42 requer citação explícita de parágrafo", impact: "Reduzir false negatives em 12%" },
  { date: "2026-03-22", type: "rejected", agent: "Code Agent", pattern: "Sugestão de trocar for-loop por map() em hot paths", impact: "Pattern removido — map() mais lento em loops críticos" },
  { date: "2026-03-21", type: "accepted", agent: "Security", pattern: "Detect API keys em template literals f-string", impact: "3 vazamentos potenciais detectados" },
  { date: "2026-03-20", type: "rejected", agent: "Pricing", pattern: "Sugestão de arredondamento para 2 casas em PDD", impact: "FIDC usa 8 casas — arredondamento causa erro material" },
  { date: "2026-03-19", type: "accepted", agent: "Gestor", pattern: "Covenant subordinação deve checar PL atualizado, não PL T-1", impact: "Bug fix em cálculo de IS real-time" },
  { date: "2026-03-18", type: "accepted", agent: "QA Agent", pattern: "Testes de guardrail devem incluir adversarial prompts", impact: "+23 test cases de prompt injection adicionados" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score > 8.5) return "var(--accent)";
  if (score >= 7) return "var(--cyan)";
  return "#f97316";
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-card p-4" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
        {label}
      </div>
      <div className="stat-value">{value}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
        {sub}
      </div>
    </div>
  );
}

function QualityTrendChart() {
  const W = 600, H = 180, padX = 48, padY = 20;
  const minScore = 6.5, maxScore = 10;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const pts = QUALITY_TREND.map((d, i) => ({
    x: padX + (i / (QUALITY_TREND.length - 1)) * chartW,
    y: padY + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padY + chartH} L ${pts[0].x} ${padY + chartH} Z`;

  const gridScores = [7, 7.5, 8, 8.5, 9, 9.5];

  return (
    <div className="glass-card p-4" style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "1rem" }}>
        Evolução do Score de Qualidade
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridScores.map((s) => {
          const y = padY + chartH - ((s - minScore) / (maxScore - minScore)) * chartH;
          return (
            <g key={s}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padX - 6} y={y + 4} fontSize="10" fill="var(--text-4)" textAnchor="end" fontFamily="var(--font-mono)">{s}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {pts.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent)" />
            <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" />
            <text x={p.x} y={p.y - 12} fontSize="10" fill="var(--accent)" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="bold">{p.score}</text>
            <text x={p.x} y={H - 4} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--font-mono)">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function IssueBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = (count / max) * 100;
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function AgentRow({ agent, domain }: { agent: typeof CODE_AGENTS_QUALITY[0]; domain: "code" | "fidc" }) {
  const color = scoreColor(agent.score);
  const fixRate = Math.round((agent.fixed / agent.issues) * 100);
  const domainColor = domain === "code" ? "var(--accent)" : "var(--cyan)";

  return (
    <div className="glass-card p-4" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{agent.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-1)" }}>{agent.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: domainColor, letterSpacing: "0.06em" }}>
          {domain === "code" ? "CODE" : "FIDC"}
        </div>
      </div>
      <div style={{ textAlign: "center", minWidth: "56px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-1)", fontWeight: 600 }}>{agent.reviews}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>reviews</div>
      </div>
      <div style={{ textAlign: "center", minWidth: "56px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-2)", fontWeight: 600 }}>{agent.issues}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>issues</div>
      </div>
      <div style={{ textAlign: "center", minWidth: "56px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-2)", fontWeight: 600 }}>{agent.fixed}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>fixed</div>
      </div>
      <div style={{ textAlign: "center", minWidth: "48px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)" }}>{fixRate}%</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>autofix</div>
      </div>
      <div style={{ textAlign: "right", minWidth: "64px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color }}>{agent.score}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)" }}>{agent.trend} ↑</div>
      </div>
    </div>
  );
}

function FinishingTouchCard({ ft }: { ft: typeof FINISHING_TOUCHES[0] }) {
  return (
    <div className="glass-card p-4" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{ft.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-1)" }}>{ft.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>{ft.runs} runs</span>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-4)" }}>Taxa de sucesso</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>{ft.successRate}%</span>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px" }}>
              <div style={{ height: "100%", width: `${ft.successRate}%`, background: "var(--accent)", borderRadius: "3px" }} />
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>{ft.desc}</p>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: typeof CUSTOM_RECIPES[0] }) {
  return (
    <div className="glass-card p-4" style={{ borderLeft: "3px solid var(--cyan)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--cyan)" }}>{recipe.name}</span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.2rem" }}>
            Trigger: {recipe.trigger}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(var(--accent-rgb,0,255,136),0.12)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb,0,255,136),0.3)" }}>
            {recipe.status}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-4)" }}>last: {recipe.lastRun}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {recipe.actions.map((action, i) => (
          <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.06)", color: "var(--text-3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {i + 1}. {action}
          </span>
        ))}
      </div>
    </div>
  );
}

function LearningCard({ learning }: { learning: typeof RECENT_LEARNINGS[0] }) {
  const isAccepted = learning.type === "accepted";
  const borderColor = isAccepted ? "var(--accent)" : "#ef4444";
  const typeColor = isAccepted ? "var(--accent)" : "#ef4444";

  return (
    <div className="glass-card p-4" style={{ borderLeft: `3px solid ${borderColor}`, marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: isAccepted ? "rgba(0,255,136,0.12)" : "rgba(239,68,68,0.12)", color: typeColor, border: `1px solid ${typeColor}40` }}>
            {isAccepted ? "✓ accepted" : "✗ rejected"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.06)", color: "var(--cyan)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {learning.agent}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-4)" }}>{learning.date}</span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-1)", margin: "0 0 0.375rem" }}>{learning.pattern}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)", margin: 0 }}>
        <span style={{ color: "var(--text-4)" }}>Impact: </span>{learning.impact}
      </p>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function TabOverview() {
  const maxCode = Math.max(...CODE_ISSUES.map((i) => i.count));
  const maxFidc = Math.max(...FIDC_ISSUES.map((i) => i.count));

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <StatCard label="ISSUES DETECTADAS" value="847" sub="Desde o início do projeto" />
        <StatCard label="TAXA DE AUTOFIX" value="73.2%" sub="621 de 847 corrigidas automaticamente" />
        <StatCard label="COBERTURA DE REVIEW" value="94.8%" sub="PRs com review automatizado" />
        <StatCard label="SCORE MÉDIO" value="8.7/10" sub="+0.4 vs mês anterior" />
      </div>

      {/* Trend chart */}
      <QualityTrendChart />

      {/* Dual-domain breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Code domain */}
        <div className="glass-card p-4">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--accent)" }}>⌨️ CODE DOMAIN</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(0,255,136,0.1)", color: "var(--accent)", border: "1px solid rgba(0,255,136,0.25)" }}>
              78% autofix
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-4)", marginBottom: "0.75rem" }}>
            487 issues total · Top categorias:
          </div>
          {CODE_ISSUES.map((issue) => (
            <IssueBar key={issue.label} label={issue.label} count={issue.count} max={maxCode} color="var(--accent)" />
          ))}
        </div>

        {/* FIDC domain */}
        <div className="glass-card p-4">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--cyan)" }}>🏦 FIDC DOMAIN</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(0,229,255,0.1)", color: "var(--cyan)", border: "1px solid rgba(0,229,255,0.25)" }}>
              66% autofix
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-4)", marginBottom: "0.75rem" }}>
            360 issues total · Top categorias:
          </div>
          {FIDC_ISSUES.map((issue) => (
            <IssueBar key={issue.label} label={issue.label} count={issue.count} max={maxFidc} color="var(--cyan)" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabPerAgent() {
  return (
    <div>
      {/* Code agents */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Code Agents
          </h2>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(0,255,136,0.1)", color: "var(--accent)", border: "1px solid rgba(0,255,136,0.25)" }}>
            12 agentes
          </span>
        </div>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0 1rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ flex: 1 }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>AGENTE</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>REVIEWS</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>ISSUES</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>FIXED</span></div>
          <div style={{ minWidth: "48px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>FIX%</span></div>
          <div style={{ minWidth: "64px", textAlign: "right" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>SCORE</span></div>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          {CODE_AGENTS_QUALITY.map((agent) => (
            <AgentRow key={agent.name} agent={agent} domain="code" />
          ))}
        </div>
      </div>

      {/* FIDC agents */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            FIDC Agents
          </h2>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(0,229,255,0.1)", color: "var(--cyan)", border: "1px solid rgba(0,229,255,0.25)" }}>
            9 agentes
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0 1rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ flex: 1 }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>AGENTE</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>REVIEWS</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>ISSUES</span></div>
          <div style={{ minWidth: "56px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>FIXED</span></div>
          <div style={{ minWidth: "48px", textAlign: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>FIX%</span></div>
          <div style={{ minWidth: "64px", textAlign: "right" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>SCORE</span></div>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          {FIDC_AGENTS_QUALITY.map((agent) => (
            <AgentRow key={agent.name} agent={agent} domain="fidc" />
          ))}
        </div>
      </div>

      {/* Score legend */}
      <div className="section-help" style={{ display: "flex", gap: "1.5rem", marginTop: "1.25rem" }}>
        <span><span style={{ color: "var(--accent)", marginRight: "0.375rem" }}>●</span>Score &gt; 8.5 — Excelente</span>
        <span><span style={{ color: "var(--cyan)", marginRight: "0.375rem" }}>●</span>Score 7–8.5 — Bom</span>
        <span><span style={{ color: "#f97316", marginRight: "0.375rem" }}>●</span>Score &lt; 7 — Atenção</span>
      </div>
    </div>
  );
}

function TabAutofix() {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "0.375rem" }}>
        Finishing Touches Automatizados
      </h2>
      <p className="section-help" style={{ marginBottom: "1.5rem" }}>
        Ações pós-review executadas automaticamente para elevar a qualidade do código antes do merge.
      </p>

      <div style={{ marginBottom: "2rem" }}>
        {FINISHING_TOUCHES.map((ft) => (
          <FinishingTouchCard key={ft.name} ft={ft} />
        ))}
      </div>

      {/* Custom recipes */}
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "0.375rem" }}>
          Recipes Customizadas
        </h2>
        <p className="section-help" style={{ marginBottom: "1rem" }}>
          Automações configuradas para triggers específicos do projeto — regulatórios, de infra e de qualidade.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {CUSTOM_RECIPES.map((recipe) => (
            <RecipeCard key={recipe.name} recipe={recipe} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabFeedbackLoop() {
  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <StatCard label="FEEDBACKS PROCESSADOS" value="1.247" sub="Aceitos + rejeitados pelos agentes" />
        <StatCard label="PADRÕES APRENDIDOS" value="89" sub="Novos patterns incorporados" />
        <StatCard label="FALSOS POSITIVOS ELIMINADOS" value="156" sub="Issues que não eram issues" />
      </div>

      {/* Learning diagram */}
      <div className="glass-card p-4" style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "1rem" }}>
          Como o Sistema Aprende
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { step: "Review emitido", color: "var(--accent)" },
            { sep: "→" },
            { step: "Agente aceita/rejeita", color: "var(--cyan)" },
            { sep: "→" },
            { step: "Feedback para MetaClaw", color: "var(--accent)" },
            { sep: "→" },
            { step: "Pattern atualizado", color: "var(--cyan)" },
            { sep: "→" },
            { step: "Próximo review melhorado", color: "var(--accent)" },
          ].map((item, i) =>
            "sep" in item ? (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--text-4)" }}>{item.sep}</span>
            ) : (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.06)", color: item.color, border: `1px solid ${item.color}30` }}>
                {item.step}
              </span>
            )
          )}
        </div>
      </div>

      {/* Timeline */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "0.375rem" }}>
        Aprendizados Recentes
      </h2>
      <p className="section-help" style={{ marginBottom: "1rem" }}>
        Últimas atualizações ao sistema de review — padrões aceitos incorporados, padrões rejeitados removidos.
      </p>
      <div>
        {RECENT_LEARNINGS.map((learning, i) => (
          <LearningCard key={i} learning={learning} />
        ))}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "📊 VISÃO GERAL" },
  { id: "per-agent", label: "🤖 POR AGENTE" },
  { id: "autofix", label: "🔄 AUTOFIX" },
  { id: "feedback", label: "🧠 FEEDBACK LOOP" },
];

export default function CodeQualityPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.375rem" }}>
          Code Quality Analytics
        </h1>
        <p className="section-help">
          Métricas de qualidade de código em tempo real — Code Agents + FIDC Finance Agents.
          Review automatizado, autofix e feedback loop via MetaClaw.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                letterSpacing: "0.08em",
                padding: "0.625rem 1rem",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                color: isActive ? "var(--accent)" : "var(--text-3)",
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <TabOverview />}
      {activeTab === "per-agent" && <TabPerAgent />}
      {activeTab === "autofix" && <TabAutofix />}
      {activeTab === "feedback" && <TabFeedbackLoop />}
    </div>
  );
}
