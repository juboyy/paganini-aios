"use client";
import { useState, useEffect } from "react";

/* ── Dados de Evolução de Skills MetaClaw ── */
const SKILLS_EVOLUTION = [
  {
    name: "compliance-pdd-check",
    discovered: "2026-02-14",
    scores: [0.12, 0.31, 0.48, 0.67, 0.79, 0.87],
    status: "promoted",
    uses: 342,
    description: "Valida cálculos de PDD contra regras BACEN e regulamento do fundo",
  },
  {
    name: "covenant-subordination-calc",
    discovered: "2026-02-18",
    scores: [0.15, 0.45, 0.62, 0.72, 0.85, 0.91],
    status: "promoted",
    uses: 287,
    description: "Calcula e monitora índice de subordinação sênior/sub em tempo real",
  },
  {
    name: "cedente-cnpj-validator",
    discovered: "2026-02-25",
    scores: [0.08, 0.28, 0.42, 0.55, 0.63, 0.71],
    status: "learning",
    uses: 156,
    description: "Valida CNPJ com dígitos verificadores e cruzamento Receita Federal",
  },
  {
    name: "nav-reconciliation-check",
    discovered: "2026-03-01",
    scores: [0.05, 0.19, 0.33, 0.41, 0.52],
    status: "learning",
    uses: 89,
    description: "Reconcilia NAV calculado vs NAV reportado, detecta discrepâncias",
  },
  {
    name: "cvm-circular-parser",
    discovered: "2026-03-08",
    scores: [0.04, 0.12, 0.21],
    status: "observing",
    uses: 23,
    description: "Extrai obrigações e prazos de circulares CVM automaticamente",
  },
  {
    name: "pld-pattern-detector",
    discovered: "2026-03-10",
    scores: [0.06, 0.14, 0.28, 0.39],
    status: "learning",
    uses: 67,
    description: "Detecta padrões de lavagem de dinheiro e transações atípicas",
  },
  {
    name: "bacen-3040-formatter",
    discovered: "2026-02-20",
    scores: [0.03, 0.08, 0.06, 0.04],
    status: "pruned",
    uses: 5,
    description: "Formatava dados para CADOC 3040 — substituído por template nativo",
  },
  {
    name: "receivable-aging-predictor",
    discovered: "2026-03-12",
    scores: [0.07, 0.18, 0.34, 0.47, 0.58],
    status: "learning",
    uses: 112,
    description: "Prediz migração de faixas de aging usando padrões históricos",
  },
];

/* ── Iterações AutoResearch ── */
const AUTORESEARCH_RUNS = [
  {
    id: "AR-007",
    date: "2026-03-17",
    iterations: 10,
    start_precision: 0.72,
    end_precision: 0.91,
    best_params: { chunk_size: 1024, overlap: 128, top_k: 8, similarity: 0.75 },
    duration: "4m 23s",
    improvements: [
      "chunk_size 512→1024: +8,3% de precisão",
      "top_k 5→8: +4,1% de precisão",
      "similarity 0,70→0,75: +2,8% de precisão",
    ],
  },
  {
    id: "AR-006",
    date: "2026-03-14",
    iterations: 8,
    start_precision: 0.68,
    end_precision: 0.72,
    best_params: { chunk_size: 512, overlap: 64, top_k: 5, similarity: 0.70 },
    duration: "3m 12s",
    improvements: ["overlap 32→64: +2,1% de precisão", "Remoção de chunks de baixa qualidade: +1,9%"],
  },
  {
    id: "AR-005",
    date: "2026-03-10",
    iterations: 15,
    start_precision: 0.58,
    end_precision: 0.68,
    best_params: { chunk_size: 512, overlap: 32, top_k: 5, similarity: 0.65 },
    duration: "6m 45s",
    improvements: [
      "Adição de híbrido BM25: +5,2% de precisão",
      "chunk_size 256→512: +3,1% de precisão",
      "Reranking habilitado: +1,4% de precisão",
    ],
  },
];

/* ── Tópicos de Pesquisa ── */
const RESEARCH_TOPICS = [
  {
    topic: "CVM 175 — Impacto na Subordinação Mínima",
    status: "completed",
    agent: "RegWatch",
    findings: 4,
    date: "2026-03-16",
    summary:
      "Identificou que Art. 42 §3º permite subordinação mínima de 20% para fundos com rating AA+. Fundo atual opera com 28,5% — dentro do limite com margem.",
  },
  {
    topic: "Padrões de Inadimplência por Setor — Q1 2026",
    status: "in_progress",
    agent: "Risk",
    findings: 2,
    date: "2026-03-17",
    summary:
      "Setor de varejo mostra aumento de 1,8% na inadimplência. Setor de serviços estável. Recomendação: reduzir exposição a varejo para ≤15% do PL.",
  },
  {
    topic: "Otimização de Pricing por Safra",
    status: "in_progress",
    agent: "Pricing",
    findings: 3,
    date: "2026-03-18",
    summary:
      "Safras com cedentes score >80 apresentam inadimplência 40% menor. Modelo de pricing deve incorporar score do cedente como variável.",
  },
  {
    topic: "BACEN Circular 3.978 — Novas Regras PLD/AML",
    status: "queued",
    agent: "Compliance",
    findings: 0,
    date: "—",
    summary: "Análise pendente das novas regras de monitoramento de transações atípicas.",
  },
];

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  promoted: { color: "var(--accent)", label: "PROMOVIDA", bg: "hsl(150 100% 50% / 0.1)" },
  learning: { color: "var(--cyan)", label: "APRENDENDO", bg: "hsl(180 100% 50% / 0.1)" },
  observing: { color: "var(--text-3)", label: "OBSERVANDO", bg: "hsl(220 10% 48% / 0.1)" },
  pruned: { color: "hsl(0 84% 60%)", label: "PODADA", bg: "hsl(0 84% 60% / 0.1)" },
  completed: { color: "var(--accent)", label: "COMPLETO", bg: "hsl(150 100% 50% / 0.1)" },
  in_progress: { color: "var(--cyan)", label: "EM ANDAMENTO", bg: "hsl(180 100% 50% / 0.1)" },
  queued: { color: "var(--text-3)", label: "NA FILA", bg: "hsl(220 10% 48% / 0.1)" },
};

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<"metaclaw" | "autoresearch" | "research">("metaclaw");
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  const promoted = SKILLS_EVOLUTION.filter((s) => s.status === "promoted").length;
  const learning = SKILLS_EVOLUTION.filter((s) => s.status === "learning").length;
  const totalUses = SKILLS_EVOLUTION.reduce((sum, s) => sum + s.uses, 0);
  const bestPrecision = Math.max(...AUTORESEARCH_RUNS.map((r) => r.end_precision));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-1)",
            marginBottom: "0.5rem",
          }}
        >
          Autoaprendizado &amp; Pesquisa
        </h1>
        <p className="section-help">
          O Paganini aprende continuamente. O MetaClaw descobre padrões de uso e promove skills
          automaticamente. O AutoResearch otimiza parâmetros do RAG contra um eval set gold. Agentes
          de pesquisa investigam temas regulatórios e financeiros de forma autônoma.
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "SKILLS DESCOBERTAS", value: String(SKILLS_EVOLUTION.length), sub: `${promoted} promovidas, ${learning} aprendendo` },
          { label: "USOS TOTAIS", value: totalUses.toLocaleString(), sub: "Invocações de skills aprendidas" },
          { label: "PRECISÃO RAG", value: `${(bestPrecision * 100).toFixed(1)}%`, sub: `Após ${AUTORESEARCH_RUNS.length} ciclos AutoResearch` },
          { label: "PESQUISAS ATIVAS", value: String(RESEARCH_TOPICS.filter((t) => t.status === "in_progress").length), sub: `${RESEARCH_TOPICS.length} temas no total` },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "8px" }}>
              {s.label}
            </div>
            <div className="stat-value" style={{ color: "var(--text-1)" }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: "4px" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["metaclaw", "autoresearch", "research"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              letterSpacing: "0.08em",
              padding: "0.75rem 1.25rem",
              color: activeTab === tab ? "var(--accent)" : "var(--text-3)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {tab === "metaclaw" ? "🧠 METACLAW" : tab === "autoresearch" ? "🔬 AUTORESEARCH" : "📚 PESQUISA"}
          </button>
        ))}
      </div>

      {/* Aba MetaClaw */}
      {activeTab === "metaclaw" && (
        <div className="space-y-4">
          <p className="section-help">
            O MetaClaw observa interações dos agentes e identifica padrões recorrentes. Quando um
            padrão atinge pontuação &gt; 0,80, é promovido a skill permanente. Skills com baixo uso são
            podadas. É como o sistema imunológico do AIOS — aprende o que funciona e descarta o que
            não funciona.
          </p>

          <div className="space-y-3">
            {SKILLS_EVOLUTION.map((skill) => {
              const config = STATUS_CONFIG[skill.status];
              const maxScore = skill.scores[skill.scores.length - 1];
              return (
                <div
                  key={skill.name}
                  className="glass-card p-4"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: config.color,
                    opacity: skill.status === "pruned" ? 0.5 : 1,
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--text-1)",
                            textDecoration: skill.status === "pruned" ? "line-through" : "none",
                          }}
                        >
                          {skill.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.6875rem",
                            padding: "2px 8px",
                            borderRadius: "var(--radius)",
                            background: config.bg,
                            color: config.color,
                            border: `1px solid ${config.color}40`,
                          }}
                        >
                          {config.label}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                          {skill.uses} usos
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginBottom: "0.5rem" }}>
                        {skill.description}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)" }}>
                        Descoberto em {skill.discovered}
                      </div>
                    </div>

                    {/* Progressão da Pontuação */}
                    <div style={{ minWidth: "280px" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)", marginBottom: "6px" }}>
                        EVOLUÇÃO DA PONTUAÇÃO
                      </div>
                      <div className="flex items-end gap-1" style={{ height: "40px" }}>
                        {skill.scores.map((score, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${score * 40}px`,
                              background:
                                score >= 0.8
                                  ? "var(--accent)"
                                  : score >= 0.5
                                  ? "var(--cyan)"
                                  : "var(--text-4)",
                              borderRadius: "1px 1px 0 0",
                              transition: "height 0.3s",
                              opacity: skill.status === "pruned" ? 0.4 : 1,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-4)", marginTop: "2px" }}>
                        <span>{skill.scores[0]}</span>
                        <span style={{ color: maxScore >= 0.8 ? "var(--accent)" : "var(--cyan)", fontWeight: 600 }}>
                          {maxScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba AutoResearch */}
      {activeTab === "autoresearch" && (
        <div className="space-y-4">
          <p className="section-help">
            O AutoResearch roda N iterações otimizando parâmetros do pipeline RAG contra um eval set
            de perguntas e respostas gold-standard. Cada iteração testa variações de chunk_size,
            overlap, top_k e similarity threshold. O melhor config é salvo automaticamente.
            Inspirado no método Karpathy de auto-melhoria.
          </p>

          {/* Gráfico de Precisão ao Longo do Tempo */}
          <div className="glass-card p-5">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "16px" }}>
              EVOLUÇÃO DA PRECISÃO DO RAG
            </div>
            <svg viewBox="0 0 600 160" style={{ width: "100%", height: "160px" }}>
              <defs>
                <linearGradient id="precGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Linhas de grade */}
              {[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => {
                const y = 140 - (v - 0.5) * 280;
                return (
                  <g key={v}>
                    <line x1="50" y1={y} x2="580" y2={y} stroke="hsl(150 30% 15%)" strokeWidth="0.5" />
                    <text x="40" y={y + 4} textAnchor="end" fill="hsl(220 10% 32%)" fontSize="10" fontFamily="var(--font-mono)">
                      {(v * 100).toFixed(0)}%
                    </text>
                  </g>
                );
              })}
              {/* Pontos de dados */}
              <path
                d={`M80,${140 - (0.58 - 0.5) * 280} L180,${140 - (0.68 - 0.5) * 280} L320,${140 - (0.72 - 0.5) * 280} L520,${140 - (0.91 - 0.5) * 280} L520,140 L80,140 Z`}
                fill="url(#precGrad)"
              />
              <polyline
                points={`80,${140 - (0.58 - 0.5) * 280} 180,${140 - (0.68 - 0.5) * 280} 320,${140 - (0.72 - 0.5) * 280} 520,${140 - (0.91 - 0.5) * 280}`}
                fill="none"
                stroke="hsl(150 100% 50%)"
                strokeWidth="2.5"
              />
              {[
                { x: 80, p: 0.58, label: "AR-005" },
                { x: 180, p: 0.68, label: "AR-006" },
                { x: 320, p: 0.72, label: "AR-006→007" },
                { x: 520, p: 0.91, label: "AR-007" },
              ].map((d) => (
                <g key={d.label}>
                  <circle cx={d.x} cy={140 - (d.p - 0.5) * 280} r="5" fill="hsl(150 100% 50%)" />
                  <circle cx={d.x} cy={140 - (d.p - 0.5) * 280} r="8" fill="none" stroke="hsl(150 100% 50%)" strokeWidth="1" opacity="0.4" />
                  <text x={d.x} y={140 - (d.p - 0.5) * 280 - 14} textAnchor="middle" fill="hsl(150 80% 90%)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">
                    {(d.p * 100).toFixed(0)}%
                  </text>
                </g>
              ))}
            </svg>
            <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginTop: "4px" }}>
              <span>Mar 10</span>
              <span>Mar 14</span>
              <span>Mar 17</span>
            </div>
          </div>

          {/* Histórico de Execuções */}
          <div className="space-y-3">
            {AUTORESEARCH_RUNS.map((run) => (
              <div
                key={run.id}
                className="glass-card p-4 cursor-pointer"
                onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
                style={{ borderLeftWidth: "3px", borderLeftColor: "var(--accent)" }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>
                        {run.id}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                        {run.date}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
                        {run.iterations} iterações • {run.duration}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)" }}>
                        {(run.start_precision * 100).toFixed(0)}%
                      </span>
                      <span style={{ color: "var(--accent)", fontSize: "0.875rem" }}>→</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)" }}>
                        {(run.end_precision * 100).toFixed(0)}%
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>
                        (+{((run.end_precision - run.start_precision) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                    {selectedRun === run.id ? "▼" : "▶"} detalhes
                  </div>
                </div>

                {selectedRun === run.id && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "8px" }}>
                      MELHORIAS IDENTIFICADAS
                    </div>
                    {run.improvements.map((imp, i) => (
                      <div
                        key={i}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8125rem",
                          color: "var(--text-2)",
                          padding: "4px 0",
                          borderBottom: i < run.improvements.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        ✓ {imp}
                      </div>
                    ))}
                    <div style={{ marginTop: "12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                      MELHOR CONFIG
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color: "var(--cyan)",
                        background: "var(--bg)",
                        padding: "8px 12px",
                        borderRadius: "var(--radius)",
                        marginTop: "4px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      chunk_size={run.best_params.chunk_size} | overlap={run.best_params.overlap} | top_k=
                      {run.best_params.top_k} | similarity={run.best_params.similarity}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba Pesquisa */}
      {activeTab === "research" && (
        <div className="space-y-4">
          <p className="section-help">
            Agentes de pesquisa investigam temas regulatórios e financeiros de forma autônoma. O
            RegWatch monitora publicações da CVM e BACEN. O Risk analisa padrões de mercado. O
            Pricing otimiza modelos. Os resultados alimentam o grafo de conhecimento e melhoram as
            respostas do sistema.
          </p>

          <div className="space-y-3">
            {RESEARCH_TOPICS.map((topic, i) => {
              const config = STATUS_CONFIG[topic.status];
              return (
                <div key={i} className="glass-card p-5" style={{ borderLeftWidth: "3px", borderLeftColor: config.color }}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1rem",
                            fontWeight: 600,
                            color: "var(--text-1)",
                          }}
                        >
                          {topic.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.6875rem",
                            padding: "2px 8px",
                            borderRadius: "var(--radius)",
                            background: config.bg,
                            color: config.color,
                            border: `1px solid ${config.color}40`,
                          }}
                        >
                          {config.label}
                        </span>
                        <span className="tag-badge-cyan">{topic.agent}</span>
                        {topic.findings > 0 && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
                            {topic.findings} achados
                          </span>
                        )}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                          {topic.date}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.6 }}>
                        {topic.summary}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
