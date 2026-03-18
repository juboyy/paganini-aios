"use client";

import { useState } from "react";

// ─── Dados ───────────────────────────────────────────────────────────────────

const STATS = [
  { label: "ENTIDADES", value: "1.847", sub: "nós do grafo de conhecimento", color: "var(--accent)" },
  { label: "RELACIONAMENTOS", value: "4.231", sub: "arestas do grafo", color: "#22d3ee" },
  { label: "DOCUMENTOS", value: "5.640", sub: "corpus ChromaDB EC2", color: "#a855f7" },
  { label: "CHUNKS", value: "28.420", sub: "média 5,0 chunks/doc", color: "#f59e0b" },
];

// Nós do grafo
const NODES: NodeData[] = [
  // EMPRESA (green)
  { id: "n1",  label: "Cimento Norte Ltda",   type: "EMPRESA",   x: 180, y: 120, detail: "CNPJ 34.567.890/0001-22 · Setor: Construção Civil · Sócios: 3" },
  { id: "n2",  label: "Metalúrgica ABC S/A",  type: "EMPRESA",   x: 720, y: 150, detail: "CNPJ 12.345.678/0001-99 · Setor: Metalurgia · Sócios: 5" },
  { id: "n3",  label: "Transportes Globo",    type: "EMPRESA",   x: 120, y: 350, detail: "CNPJ 45.678.901/0001-33 · Setor: Logística · Sócios: 2" },
  { id: "n4",  label: "Têxtil Paraná",        type: "EMPRESA",   x: 650, y: 380, detail: "CNPJ 56.789.012/0001-44 · Setor: Têxtil · Sócios: 4" },
  { id: "n5",  label: "Agro Cerrado",         type: "EMPRESA",   x: 350, y: 500, detail: "CNPJ 67.890.123/0001-55 · Setor: Agronegócio · Sócios: 2" },
  { id: "n6",  label: "Plásticos Delta",      type: "EMPRESA",   x: 550, y: 480, detail: "CNPJ 78.901.234/0001-66 · Setor: Plásticos · Sócios: 3" },
  { id: "n7",  label: "Engenharia Sigma",     type: "EMPRESA",   x: 100, y: 220, detail: "CNPJ 89.012.345/0001-77 · Setor: Engenharia · Sócios: 2" },
  { id: "n8",  label: "Farmácia Beta",        type: "EMPRESA",   x: 780, y: 280, detail: "CNPJ 90.123.456/0001-88 · Setor: Saúde · Sócios: 1" },
  // FUNDO (cyan)
  { id: "n9",  label: "Paganini I FIDC",      type: "FUNDO",     x: 450, y: 250, detail: "CNPJ 11.222.333/0001-00 · PL: R$ 480M · Cotas: Sênior + Sub." },
  { id: "n10", label: "Paganini II FIDC",     type: "FUNDO",     x: 380, y: 150, detail: "CNPJ 22.333.444/0001-11 · PL: R$ 210M · Cotas: Sênior" },
  { id: "n11", label: "Paganini III FIDC",    type: "FUNDO",     x: 520, y: 350, detail: "CNPJ 33.444.555/0001-22 · PL: R$ 95M · Cotas: Único" },
  // REGULAÇÃO (amber)
  { id: "n12", label: "CVM 175",              type: "REGULAÇÃO", x: 300, y: 60,  detail: "Resolução CVM 175/2022 · FIDCs em geral · Vigência: 2023" },
  { id: "n13", label: "BACEN 4.966",          type: "REGULAÇÃO", x: 600, y: 60,  detail: "Resolução BACEN 4.966/2021 · PDD obrigatório · Risco de crédito" },
  { id: "n14", label: "BACEN 3.978",          type: "REGULAÇÃO", x: 250, y: 440, detail: "Resolução BACEN 3.978/2020 · PLD/FT · KYC cedentes" },
  { id: "n15", label: "Lei 14.430",           type: "REGULAÇÃO", x: 750, y: 450, detail: "Lei 14.430/2022 · Securitização · Regime jurídico FIDCs" },
  { id: "n16", label: "CMN 4.557",            type: "REGULAÇÃO", x: 450, y: 550, detail: "Resolução CMN 4.557/2017 · Gestão de riscos · Governança" },
  // PESSOA (purple)
  { id: "n17", label: "Carlos Silva",         type: "PESSOA",    x: 200, y: 180, detail: "CPF 123.456.789-00 · Gestor Principal · CFA Level III" },
  { id: "n18", label: "Ana Costa",            type: "PESSOA",    x: 500, y: 100, detail: "CPF 234.567.890-11 · Administradora Fiduciária · ANCORD" },
  { id: "n19", label: "Roberto Lima",         type: "PESSOA",    x: 700, y: 200, detail: "CPF 345.678.901-22 · Custodiante · Banco XYZ" },
  { id: "n20", label: "Marina Santos",        type: "PESSOA",    x: 350, y: 350, detail: "CPF 456.789.012-33 · Gestora Substituta · CGA" },
  // OBRIGAÇÃO (red)
  { id: "n21", label: "CADOC 3040",           type: "OBRIGAÇÃO", x: 150, y: 480, detail: "Informe trimestral BACEN · Prazo: D+30 do trimestre" },
  { id: "n22", label: "Informe Mensal CVM",   type: "OBRIGAÇÃO", x: 550, y: 550, detail: "ICVM 356 Art. 8° · Prazo: até dia 15 do mês seguinte" },
  { id: "n23", label: "AGO Anual",            type: "OBRIGAÇÃO", x: 800, y: 380, detail: "Assembleia Geral Ordinária · Prazo: até 30/04 do exercício" },
  { id: "n24", label: "DARF IR",              type: "OBRIGAÇÃO", x: 680, y: 500, detail: "Retenção IR rendimentos · Cotistas PF/PJ · Prazo: D+3" },
  // MÓDULO (teal)
  { id: "n25", label: "pricing.py",           type: "MÓDULO",    x: 320, y: 280, detail: "Módulo de precificação · Python 3.11 · 1.240 linhas" },
  { id: "n26", label: "compliance.py",        type: "MÓDULO",    x: 580, y: 280, detail: "Verificação de conformidade · Regras CVM/BACEN · v2.4" },
  { id: "n27", label: "risk.py",              type: "MÓDULO",    x: 450, y: 400, detail: "Gestão de risco · PDD · VaR · Stress testing" },
  { id: "n28", label: "admin.py",             type: "MÓDULO",    x: 380, y: 200, detail: "Administração · Cotas · NAV · Relatórios" },
  // SKILL (white/dim)
  { id: "n29", label: "fidc-rules-base",      type: "SKILL",     x: 100, y: 550, detail: "Base de regras FIDC · 847 regras indexadas · v3.1" },
  { id: "n30", label: "fidc-orchestrator",    type: "SKILL",     x: 300, y: 580, detail: "Orquestrador de agentes · LangGraph · 12 nós" },
  { id: "n31", label: "compliance-agent",     type: "SKILL",     x: 500, y: 580, detail: "Agente de compliance · RAG + GPT-4o · Precisão: 97%" },
];

// Arestas do grafo
const EDGES: EdgeData[] = [
  // Empresas → Fundo I (cedente_de, green)
  { from: "n1",  to: "n9",  type: "cedente_de",  label: "cedente_de" },
  { from: "n2",  to: "n9",  type: "cedente_de",  label: "cedente_de" },
  { from: "n3",  to: "n9",  type: "cedente_de",  label: "cedente_de" },
  { from: "n4",  to: "n11", type: "cedente_de",  label: "cedente_de" },
  { from: "n5",  to: "n10", type: "cedente_de",  label: "cedente_de" },
  { from: "n6",  to: "n11", type: "cedente_de",  label: "cedente_de" },
  { from: "n7",  to: "n10", type: "cedente_de",  label: "cedente_de" },
  { from: "n8",  to: "n9",  type: "cedente_de",  label: "cedente_de" },
  // Regulações → Fundos (regula, amber)
  { from: "n12", to: "n9",  type: "regula",      label: "regula" },
  { from: "n12", to: "n10", type: "regula",      label: "regula" },
  { from: "n12", to: "n11", type: "regula",      label: "regula" },
  { from: "n13", to: "n9",  type: "regula",      label: "regula" },
  { from: "n13", to: "n11", type: "regula",      label: "regula" },
  { from: "n15", to: "n9",  type: "regula",      label: "regula" },
  { from: "n15", to: "n10", type: "regula",      label: "regula" },
  // Pessoas → Fundos (administra/gere/custodia, purple)
  { from: "n17", to: "n9",  type: "administra",  label: "administra" },
  { from: "n17", to: "n10", type: "gere",        label: "gere" },
  { from: "n18", to: "n9",  type: "administra",  label: "administra" },
  { from: "n18", to: "n11", type: "administra",  label: "administra" },
  { from: "n19", to: "n9",  type: "custodia",    label: "custodia" },
  { from: "n20", to: "n10", type: "gere",        label: "gere" },
  { from: "n20", to: "n11", type: "gere",        label: "gere" },
  // Obrigações → Fundos (obriga, red)
  { from: "n21", to: "n9",  type: "obriga",      label: "obriga" },
  { from: "n22", to: "n9",  type: "obriga",      label: "obriga" },
  { from: "n22", to: "n10", type: "obriga",      label: "obriga" },
  { from: "n23", to: "n9",  type: "obriga",      label: "obriga" },
  { from: "n23", to: "n11", type: "obriga",      label: "obriga" },
  { from: "n24", to: "n9",  type: "obriga",      label: "obriga" },
  { from: "n24", to: "n11", type: "obriga",      label: "obriga" },
  // Módulos → Fundos (implementa, teal)
  { from: "n25", to: "n9",  type: "implementa",  label: "implementa" },
  { from: "n25", to: "n10", type: "implementa",  label: "implementa" },
  { from: "n26", to: "n9",  type: "implementa",  label: "implementa" },
  { from: "n26", to: "n11", type: "implementa",  label: "implementa" },
  { from: "n27", to: "n9",  type: "implementa",  label: "implementa" },
  { from: "n28", to: "n10", type: "implementa",  label: "implementa" },
  { from: "n28", to: "n11", type: "implementa",  label: "implementa" },
  // Skills → Módulos (utiliza, white dim)
  { from: "n29", to: "n25", type: "utiliza",     label: "utiliza" },
  { from: "n29", to: "n27", type: "utiliza",     label: "utiliza" },
  { from: "n30", to: "n26", type: "utiliza",     label: "utiliza" },
  { from: "n30", to: "n28", type: "utiliza",     label: "utiliza" },
  { from: "n31", to: "n26", type: "utiliza",     label: "utiliza" },
  { from: "n31", to: "n27", type: "utiliza",     label: "utiliza" },
  // Regulações → Obrigações (exige, amber dim)
  { from: "n12", to: "n22", type: "exige",       label: "exige" },
  { from: "n13", to: "n21", type: "exige",       label: "exige" },
  { from: "n14", to: "n21", type: "exige",       label: "exige" },
  { from: "n15", to: "n23", type: "exige",       label: "exige" },
  { from: "n16", to: "n24", type: "exige",       label: "exige" },
  // Empresas → Pessoas (sócio_de, green dim)
  { from: "n1",  to: "n17", type: "sócio_de",   label: "sócio_de" },
  { from: "n2",  to: "n19", type: "sócio_de",   label: "sócio_de" },
  { from: "n7",  to: "n17", type: "sócio_de",   label: "sócio_de" },
  { from: "n4",  to: "n20", type: "sócio_de",   label: "sócio_de" },
];

const EDGE_STYLES: Record<string, { color: string; width: number; opacity: number }> = {
  cedente_de: { color: "#22c55e",  width: 2,   opacity: 0.55 },
  regula:     { color: "#f59e0b",  width: 2,   opacity: 0.55 },
  administra: { color: "#a855f7",  width: 2,   opacity: 0.55 },
  gere:       { color: "#a855f7",  width: 2,   opacity: 0.55 },
  custodia:   { color: "#a855f7",  width: 2,   opacity: 0.55 },
  obriga:     { color: "#ef4444",  width: 2,   opacity: 0.55 },
  implementa: { color: "#14b8a6",  width: 2,   opacity: 0.55 },
  utiliza:    { color: "#94a3b8",  width: 1,   opacity: 0.35 },
  exige:      { color: "#d97706",  width: 1,   opacity: 0.35 },
  "sócio_de": { color: "#16a34a",  width: 1,   opacity: 0.35 },
};

const NODE_STYLES: Record<string, { color: string; radius: number; glow: string }> = {
  EMPRESA:   { color: "#22c55e",  radius: 14, glow: "rgba(34,197,94,0.6)" },
  FUNDO:     { color: "#22d3ee",  radius: 18, glow: "rgba(34,211,238,0.7)" },
  REGULAÇÃO: { color: "#f59e0b",  radius: 14, glow: "rgba(245,158,11,0.6)" },
  PESSOA:    { color: "#a855f7",  radius: 10, glow: "rgba(168,85,247,0.6)" },
  OBRIGAÇÃO: { color: "#ef4444",  radius: 10, glow: "rgba(239,68,68,0.6)" },
  MÓDULO:    { color: "#14b8a6",  radius: 10, glow: "rgba(20,184,166,0.6)" },
  SKILL:     { color: "#94a3b8",  radius: 10, glow: "rgba(148,163,184,0.4)" },
};

interface NodeData {
  id: string; label: string; type: string; x: number; y: number; detail: string;
}
interface EdgeData {
  from: string; to: string; type: string; label: string;
}

const RAG_STAGES = [
  { id: "query",  label: "CONSULTA",      detail: "Entrada em linguagem natural",       color: "#a855f7" },
  { id: "embed",  label: "EMBED",         detail: "text-embedding-3-large · 3072d",     color: "#22d3ee" },
  { id: "vector", label: "VETORIAL",      detail: "ChromaDB · cosseno · top-20",        color: "var(--accent)" },
  { id: "bm25",   label: "BM25",          detail: "Busca esparsa · mesclagem top-10",   color: "var(--accent)" },
  { id: "rerank", label: "RERANK",        detail: "Cohere rerank-v3 · limiar 0,7",      color: "#f59e0b" },
  { id: "topk",   label: "TOP-K",         detail: "k=8 · contexto 8K tokens",           color: "var(--accent)" },
  { id: "agent",  label: "AGENTE",        detail: "GPT-4o · RAG response synthesis",    color: "var(--accent)" },
];

const RECENT_QUERIES = [
  { query: "Qual o CNAE da Cimento Norte Ltda e quais sócios aparecem no quadro societário?", agent: "due-diligence", confidence: 94, citations: 4, latency: "0.31s" },
  { query: "Resolução BACEN 4.966 covenants aplicáveis a FIDCs com cedente risco B",          agent: "compliance",    confidence: 97, citations: 7, latency: "0.28s" },
  { query: "Como calcular NAV ajustado por perdas esperadas no portfólio do Paganini I?",      agent: "gestor",        confidence: 88, citations: 3, latency: "0.44s" },
  { query: "Quais empresas do grupo têm dívida com o INSS acima de R$500K?",                  agent: "risk",          confidence: 91, citations: 5, latency: "0.37s" },
  { query: "Circular CVM 3.932 sobre informes periódicos de FIDCs — prazo de entrega",        agent: "reporting",     confidence: 99, citations: 1, latency: "0.19s" },
  { query: "Verifique PEP e sanções internacionais para sócios da Metalúrgica ABC S/A",        agent: "compliance",    confidence: 96, citations: 6, latency: "0.52s" },
  { query: "Calcule o índice de subordinação mínimo conforme CMN 4.557",                      agent: "gestor",        confidence: 85, citations: 4, latency: "0.61s" },
  { query: "Quais cedentes estão próximos do limite de concentração de 20%?",                  agent: "risk",          confidence: 92, citations: 3, latency: "0.34s" },
];

const INGEST_HISTORY = [
  { company: "Cimento Norte Ltda",          cnpj: "34.567.890/0001-22", docs: 12, chunks: 847,  entities: 38,  time: "7.2s",  ts: "13:04:19" },
  { company: "Fundo Paganini I",            cnpj: "N/A",               docs: 28, chunks: 2140, entities: 124, time: "18.4s", ts: "12:51:33" },
  { company: "BACEN Res. 4.966 Atualização",cnpj: "N/A",               docs: 5,  chunks: 412,  entities: 67,  time: "5.1s",  ts: "12:34:07" },
  { company: "Metalúrgica ABC S/A",         cnpj: "12.345.678/0001-99", docs: 8,  chunks: 544,  entities: 29,  time: "4.8s",  ts: "11:22:44" },
  { company: "CVM ICVM 356 (Rev.2025)",     cnpj: "N/A",               docs: 3,  chunks: 188,  entities: 41,  time: "2.9s",  ts: "10:08:12" },
];

const ENTITY_DISTRIBUTION = [
  { type: "EMPRESA",   count: 412, color: "#22c55e" },
  { type: "FUNDO",     count: 38,  color: "#22d3ee" },
  { type: "REGULAÇÃO", count: 287, color: "#f59e0b" },
  { type: "PESSOA",    count: 524, color: "#a855f7" },
  { type: "OBRIGAÇÃO", count: 198, color: "#ef4444" },
  { type: "MÓDULO",    count: 143, color: "#14b8a6" },
  { type: "SKILL",     count: 245, color: "#94a3b8" },
];

const DONUT_SEGMENTS = [
  { label: "cedente_de", pct: 28, color: "#22c55e" },
  { label: "regula",     pct: 18, color: "#f59e0b" },
  { label: "administra", pct: 12, color: "#a855f7" },
  { label: "implementa", pct: 10, color: "#14b8a6" },
  { label: "obriga",     pct:  8, color: "#ef4444" },
  { label: "utiliza",    pct:  8, color: "#94a3b8" },
  { label: "sócio_de",   pct:  6, color: "#16a34a" },
  { label: "exige",      pct:  5, color: "#d97706" },
  { label: "gere",       pct:  5, color: "#7c3aed" },
];

const RAG_METRICS = [
  { label: "Precisão",   value: "91.2%", sub: "top-K retrieval",  color: "var(--accent)" },
  { label: "Latência",   value: "105ms", sub: "p50 end-to-end",   color: "#22d3ee" },
  { label: "Top-K",      value: "8",     sub: "chunks por query",  color: "#f59e0b" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConnectedEdges(nodeId: string): Set<string> {
  const set = new Set<string>();
  EDGES.forEach((e, i) => {
    if (e.from === nodeId || e.to === nodeId) set.add(String(i));
  });
  return set;
}

function getConnectedNodes(nodeId: string): Set<string> {
  const set = new Set<string>([nodeId]);
  EDGES.forEach(e => {
    if (e.from === nodeId) set.add(e.to);
    if (e.to === nodeId)   set.add(e.from);
  });
  return set;
}

// ─── Donut chart helper ───────────────────────────────────────────────────────

function donutPath(startAngle: number, endAngle: number, cx: number, cy: number, r: number, innerR: number) {
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const ix1 = cx + innerR * Math.cos(toRad(endAngle));
  const iy1 = cy + innerR * Math.sin(toRad(endAngle));
  const ix2 = cx + innerR * Math.cos(toRad(startAngle));
  const iy2 = cy + innerR * Math.sin(toRad(startAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

// ─── Knowledge Graph Component ───────────────────────────────────────────────

function KnowledgeGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: NodeData } | null>(null);

  const connectedEdges = hoveredNode ? getConnectedEdges(hoveredNode) : null;
  const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : null;

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  function handleNodeEnter(node: NodeData) {
    setHoveredNode(node.id);
    setTooltip({ x: node.x, y: node.y, node });
  }
  function handleNodeLeave() {
    setHoveredNode(null);
    setTooltip(null);
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ minWidth: 700 }}>
        <svg
          viewBox="0 0 900 620"
          width="100%"
          style={{ display: "block", maxHeight: 620 }}
        >
          <defs>
            {/* Glow filters per type */}
            {Object.entries(NODE_STYLES).map(([type, style]) => (
              <filter key={type} id={`glow-${type.toLowerCase()}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor={style.glow} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            {/* Pulse animation filter */}
            <filter id="glow-pulse" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="rgba(34,211,238,0.8)" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Arrow markers */}
            {Object.entries(EDGE_STYLES).map(([type, style]) => (
              <marker
                key={type}
                id={`arrow-${type}`}
                markerWidth="7" markerHeight="5"
                refX="7" refY="2.5" orient="auto"
              >
                <polygon points="0 0, 7 2.5, 0 5" fill={style.color} opacity={0.7} />
              </marker>
            ))}
            {/* Background grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34,197,94,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* Background */}
          <rect width="900" height="620" fill="rgba(0,0,0,0.35)" rx="4" />
          <rect width="900" height="620" fill="url(#grid)" rx="4" />

          {/* Scan line effect */}
          <rect width="900" height="1" y="0" fill="rgba(34,197,94,0.08)" rx="0">
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="0 620"
              dur="6s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Edges */}
          {EDGES.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to   = nodeMap[edge.to];
            if (!from || !to) return null;
            const style = EDGE_STYLES[edge.type] || EDGE_STYLES["utiliza"];

            let opacity = style.opacity;
            if (hoveredNode) {
              opacity = connectedEdges?.has(String(i)) ? 0.9 : 0.05;
            }

            // Midpoint for slight curve
            const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.08;
            const my = (from.y + to.y) / 2 + (from.x - to.x) * 0.08;

            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke={style.color}
                strokeWidth={style.width}
                opacity={opacity}
                markerEnd={`url(#arrow-${edge.type})`}
                style={{ transition: "opacity 0.2s ease" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map(node => {
            const style = NODE_STYLES[node.type];
            const isCentral = node.id === "n9";
            const isHovered = hoveredNode === node.id;
            const isConnected = hoveredNode ? connectedNodes?.has(node.id) : true;
            const dimmed = hoveredNode && !isConnected;

            const r = isCentral ? 22 : style.radius;
            const filterId = isCentral ? "glow-pulse" : `glow-${node.type.toLowerCase()}`;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                opacity={dimmed ? 0.12 : 1}
                onMouseEnter={() => handleNodeEnter(node)}
                onMouseLeave={handleNodeLeave}
              >
                {/* Outer ring for hovered/central */}
                {(isHovered || isCentral) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 6}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={1}
                    opacity={0.4}
                    strokeDasharray="4 3"
                  >
                    {isCentral && (
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${node.x} ${node.y}`}
                        to={`360 ${node.x} ${node.y}`}
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                )}

                {/* Pulse ring for central node */}
                {isCentral && (
                  <circle cx={node.x} cy={node.y} r={r} fill={style.color} opacity={0.15}>
                    <animate attributeName="r" values={`${r};${r + 14};${r}`} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.15;0;0.15" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={`${style.color}22`}
                  stroke={style.color}
                  strokeWidth={isHovered ? 2.5 : isCentral ? 2.5 : 1.5}
                  filter={`url(#${filterId})`}
                />

                {/* Inner dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isCentral ? 5 : 3}
                  fill={style.color}
                  opacity={0.9}
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + r + 12}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: isCentral ? "0.55rem" : "0.45rem",
                    fill: isHovered ? style.color : dimmed ? "rgba(148,163,184,0.3)" : "rgba(203,213,225,0.85)",
                    fontWeight: isCentral || isHovered ? 700 : 400,
                    letterSpacing: "0.03em",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const n = tooltip.node;
            const style = NODE_STYLES[n.type];
            // Position tooltip: keep inside viewBox
            const tx = Math.min(Math.max(n.x - 110, 4), 680);
            const ty = n.y < 80 ? n.y + 32 : n.y - 70;
            return (
              <g>
                <rect
                  x={tx} y={ty}
                  width={220} height={56}
                  rx={4}
                  fill="rgba(2,8,20,0.96)"
                  stroke={style.color}
                  strokeWidth={1}
                  opacity={0.97}
                />
                <text x={tx + 10} y={ty + 16} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", fill: style.color, fontWeight: 700, letterSpacing: "0.08em" }}>
                  [{n.type}] {n.label}
                </text>
                <foreignObject x={tx + 8} y={ty + 22} width={205} height={30}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.42rem", color: "rgba(148,163,184,0.9)", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {n.detail}
                  </div>
                </foreignObject>
              </g>
            );
          })()}

          {/* Legend */}
          {Object.entries(NODE_STYLES).map(([type, style], i) => {
            const lx = 24 + i * 124;
            const ly = 596;
            return (
              <g key={type}>
                <circle cx={lx} cy={ly} r={5} fill={style.color} opacity={0.8} />
                <text x={lx + 10} y={ly + 4} style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", fill: "rgba(148,163,184,0.75)", letterSpacing: "0.06em" }}>
                  {type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Entity Distribution Bar Chart ───────────────────────────────────────────

function EntityDistribution() {
  const maxVal = Math.max(...ENTITY_DISTRIBUTION.map(d => d.count));
  return (
    <svg viewBox={`0 0 560 ${ENTITY_DISTRIBUTION.length * 36 + 20}`} width="100%" style={{ display: "block" }}>
      {ENTITY_DISTRIBUTION.map((item, i) => {
        const barW = (item.count / maxVal) * 360;
        const y = i * 36 + 10;
        return (
          <g key={item.type}>
            {/* Label */}
            <text x={0} y={y + 14} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", fill: item.color, letterSpacing: "0.08em" }}>
              {item.type}
            </text>
            {/* Bar background */}
            <rect x={110} y={y + 4} width={360} height={12} rx={2} fill="rgba(0,0,0,0.4)" />
            {/* Bar fill */}
            <rect x={110} y={y + 4} width={barW} height={12} rx={2} fill={item.color} opacity={0.7}>
              <animate attributeName="width" from={0} to={barW} dur="1s" fill="freeze" />
            </rect>
            {/* Value */}
            <text x={480} y={y + 14} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", fill: item.color, fontWeight: 700 }}>
              {item.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── RAG Pipeline ────────────────────────────────────────────────────────────

function RAGPipeline() {
  const nodeW = 100;
  const nodeH = 52;
  const gap = 18;
  const totalW = RAG_STAGES.length * nodeW + (RAG_STAGES.length - 1) * gap + 4;
  const svgH = 130;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={totalW} height={svgH} viewBox={`0 0 ${totalW} ${svgH}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="rag-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,197,94,0.18)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0.04)" />
          </linearGradient>
          <filter id="rag-glow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="rag-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="rgba(34,197,94,0.6)" />
          </marker>
        </defs>

        {RAG_STAGES.map((stage, i) => {
          const x = i * (nodeW + gap) + 2;
          const cy = svgH / 2;

          return (
            <g key={stage.id}>
              {i < RAG_STAGES.length - 1 && (
                <line
                  x1={x + nodeW} y1={cy}
                  x2={x + nodeW + gap - 2} y2={cy}
                  stroke="rgba(34,197,94,0.5)"
                  strokeWidth={1.5}
                  markerEnd="url(#rag-arrow)"
                />
              )}
              {/* Node box */}
              <rect
                x={x} y={cy - nodeH / 2}
                width={nodeW} height={nodeH} rx={3}
                fill="url(#rag-grad)"
                stroke={i === RAG_STAGES.length - 1 ? "var(--accent)" : "rgba(34,197,94,0.2)"}
                strokeWidth={i === RAG_STAGES.length - 1 ? 1.5 : 1}
                filter={i === RAG_STAGES.length - 1 ? "url(#rag-glow)" : ""}
              />
              {/* Stage number */}
              <text
                x={x + 6} y={cy - nodeH / 2 + 12}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.38rem", fill: stage.color, fontWeight: 700, letterSpacing: "0.06em" }}
              >
                {String(i + 1).padStart(2, "0")}
              </text>
              {/* Stage label */}
              <text
                x={x + nodeW / 2} y={cy - 4}
                textAnchor="middle"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", fill: i === RAG_STAGES.length - 1 ? "var(--accent)" : "rgba(203,213,225,0.9)", fontWeight: 700, letterSpacing: "0.05em" }}
              >
                {stage.label}
              </text>
              {/* Detail */}
              <foreignObject x={x + 4} y={cy + 4} width={nodeW - 8} height={nodeH / 2 - 4}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.35rem", color: "rgba(148,163,184,0.7)", lineHeight: 1.4, wordBreak: "break-word" }}>
                  {stage.detail}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = 110, cy = 110, r = 85, inner = 52;
  let cumulative = 0;

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
      <svg width={220} height={220} viewBox="0 0 220 220" style={{ flexShrink: 0 }}>
        <defs>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {DONUT_SEGMENTS.map((seg, i) => {
          const startAngle = cumulative * 3.6;
          cumulative += seg.pct;
          const endAngle = cumulative * 3.6;
          const isH = hovered === i;
          return (
            <path
              key={seg.label}
              d={donutPath(startAngle, endAngle, cx, cy, isH ? r + 6 : r, inner)}
              fill={seg.color}
              opacity={hovered === null ? 0.75 : isH ? 1 : 0.25}
              filter={isH ? "url(#donut-glow)" : ""}
              style={{ cursor: "pointer", transition: "opacity 0.2s, d 0.2s" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", fill: "rgba(148,163,184,0.7)", letterSpacing: "0.08em" }}>
          RELAÇÕES
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fill: "var(--accent)", fontWeight: 700 }}>
          4.231
        </text>
        {hovered !== null && (
          <>
            <text x={cx} y={cy + 26} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.42rem", fill: DONUT_SEGMENTS[hovered].color, fontWeight: 700 }}>
              {DONUT_SEGMENTS[hovered].label}
            </text>
            <text x={cx} y={cy + 38} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: DONUT_SEGMENTS[hovered].color, fontWeight: 700 }}>
              {DONUT_SEGMENTS[hovered].pct}%
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
        {DONUT_SEGMENTS.map((seg, i) => (
          <div
            key={seg.label}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", opacity: hovered === null || hovered === i ? 1 : 0.35, transition: "opacity 0.2s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0, boxShadow: `0 0 5px ${seg.color}` }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "rgba(148,163,184,0.85)", flex: 1 }}>{seg.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: seg.color, fontWeight: 700 }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Cabeçalho ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>
          PAGANINI AIOS · MOTOR DE CONHECIMENTO · GRAFO SEMÂNTICO
        </div>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--text-1)", margin: 0, lineHeight: 1.2 }}>
          Memória{" "}
          <span style={{ color: "var(--accent)" }}>+ Grafo de Conhecimento</span>
        </h1>
        <p className="section-help" style={{ marginTop: "0.375rem" }}>
          Visualização interativa do grafo de entidades e relacionamentos do corpus Paganini AIOS.
          Passe o mouse sobre um nó para destacar suas conexões.
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {STATS.map(s => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div className="mono-label" style={{ marginBottom: "0.25rem" }}>{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.5625rem", color: "var(--text-4)", marginTop: "0.25rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grafo Principal ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div className="mono-label" style={{ marginBottom: "2px" }}>
              GRAFO DE CONHECIMENTO · ENTIDADES E RELACIONAMENTOS
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>
              31 nós · 51 arestas · 7 tipos de entidade
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span className="tag-badge">SVG INTERATIVO</span>
            <span className="tag-badge-cyan">HOVER PARA DETALHES</span>
          </div>
        </div>
        <KnowledgeGraph />
      </div>

      {/* ── Distribuição + Pipeline ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1rem", alignItems: "start" }}>

        {/* Distribuição de Entidades */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
            DISTRIBUIÇÃO DE ENTIDADES · 7 TIPOS
          </div>
          <EntityDistribution />
          <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span className="mono-label">TOTAL</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)" }}>1.847 entidades</span>
          </div>
        </div>

        {/* Pipeline RAG */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
            PIPELINE RAG · CONSULTA → AGENTE · 7 ESTÁGIOS
          </div>
          <RAGPipeline />
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { stage: "EMBED",   detail: "text-embedding-3-large · 3072 dimensões",        color: "#22d3ee" },
              { stage: "VETORIAL",detail: "ChromaDB · similaridade de cosseno · top-20",    color: "var(--accent)" },
              { stage: "BM25",    detail: "Recuperação esparsa · mesclagem de resultados",  color: "var(--accent)" },
              { stage: "RERANK",  detail: "Cohere rerank-v3 · limiar 0,7",                  color: "#f59e0b" },
              { stage: "TOP-K",   detail: "k=8 · janela de contexto: 8K tokens",            color: "var(--accent)" },
            ].map(s => (
              <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: s.color, width: 56, flexShrink: 0, letterSpacing: "0.08em" }}>{s.stage}</span>
                <span style={{ fontSize: "0.5rem", color: "var(--text-3)" }}>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Métricas RAG ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {RAG_METRICS.map(m => (
          <div key={m.label} className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div className="mono-label" style={{ marginBottom: "0.5rem" }}>MÉTRICAS RAG · {m.label.toUpperCase()}</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: m.color, lineHeight: 1, marginBottom: "0.25rem" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "0.5625rem", color: "var(--text-4)" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Consultas Recentes ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div className="mono-label" style={{ marginBottom: "2px" }}>CONSULTAS RAG RECENTES · AO VIVO</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>Últimas 8 queries processadas pelo motor</div>
          </div>
          <span className="tag-badge">8 CONSULTAS</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.5625rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["CONSULTA", "AGENTE", "CONFIANÇA", "CITAÇÕES", "LATÊNCIA"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-4)", fontSize: "0.5rem", letterSpacing: "0.1em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_QUERIES.map((row, i) => {
                const confColor = row.confidence >= 96 ? "var(--accent)" : row.confidence >= 90 ? "#22d3ee" : "#f59e0b";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(34,197,94,0.05)", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.query}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span className="tag-badge" style={{ fontSize: "0.42rem" }}>{row.agent}</span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 48, height: 5, background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden" }}>
                          <div style={{ width: `${row.confidence}%`, height: "100%", background: confColor, borderRadius: "1px" }} />
                        </div>
                        <span style={{ color: confColor, fontWeight: 700 }}>{row.confidence}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#22d3ee" }}>{row.citations} fontes</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-3)" }}>{row.latency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Ingestão Recente ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div className="mono-label" style={{ marginBottom: "1rem" }}>
          INGESTÃO RECENTE · paganini ingest [--cnpj] [--source]
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {INGEST_HISTORY.map((row, i) => (
            <div
              key={i}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(34,197,94,0.12)",
                borderRadius: "var(--radius)",
                padding: "0.875rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", fontWeight: 600, flex: 1 }}>{row.company}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", flexShrink: 0, marginLeft: "0.5rem" }}>{row.ts}</div>
              </div>
              {row.cnpj !== "N/A" && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)" }}>{row.cnpj}</div>
              )}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)" }}>DOCS</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "#22d3ee", fontWeight: 700 }}>{row.docs}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)" }}>CHUNKS</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--accent)", fontWeight: 700 }}>{row.chunks.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)" }}>ENTIDADES</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "#a855f7", fontWeight: 700 }}>{row.entities}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)" }}>TEMPO</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "#f59e0b", fontWeight: 700 }}>{row.time}</div>
                </div>
              </div>
              {/* Progress bar visualization */}
              <div style={{ marginTop: "0.25rem", height: 3, background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min((row.chunks / 2140) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), #22d3ee)", borderRadius: "1px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tipos de Relacionamento ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div className="mono-label" style={{ marginBottom: "2px" }}>TIPOS DE RELACIONAMENTO · DISTRIBUIÇÃO</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>4.231 arestas · 9 tipos de relação</div>
          </div>
          <span className="tag-badge-cyan">HOVER PARA DETALHES</span>
        </div>
        <DonutChart />
      </div>

    </div>
  );
}
