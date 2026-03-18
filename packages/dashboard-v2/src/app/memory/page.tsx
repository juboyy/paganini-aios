"use client";

import { useState, useEffect, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type NodeType = "EMPRESA" | "FUNDO" | "REGULAÇÃO" | "PESSOA" | "OBRIGAÇÃO" | "MÓDULO" | "SKILL";

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  detail: string;
  lastUpdated: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  important?: boolean;
}

interface TooltipState {
  node: GraphNode | null;
  x: number;
  y: number;
}

// ─── NODE COLORS & CONFIG ─────────────────────────────────────────────────────
const NODE_CONFIG: Record<NodeType, { color: string; label: string }> = {
  EMPRESA:   { color: "#22c55e", label: "Empresa Cedente" },
  FUNDO:     { color: "#22d3ee", label: "Fundo FIDC" },
  REGULAÇÃO: { color: "#f59e0b", label: "Regulação" },
  PESSOA:    { color: "#a855f7", label: "Pessoa" },
  OBRIGAÇÃO: { color: "#ef4444", label: "Obrigação" },
  MÓDULO:    { color: "#14b8a6", label: "Módulo de Software" },
  SKILL:     { color: "#94a3b8", label: "Skill/Agent" },
};

// ─── GRAPH DATA ───────────────────────────────────────────────────────────────
const NODES: GraphNode[] = [
  // EMPRESA
  { id: "cimento-norte",    label: "Cimento Norte",    type: "EMPRESA",   x: 180, y: 140, detail: "Cedente de recebíveis industriais. CNPJ 12.345.678/0001-90. Rating AA-.", lastUpdated: "2026-03-10" },
  { id: "metalurgica-abc",  label: "Metalúrgica ABC",  type: "EMPRESA",   x: 720, y: 160, detail: "Cedente do segmento metalúrgico. Capital aberto B3: MABC3.", lastUpdated: "2026-03-12" },
  { id: "transportes-globo",label: "Transportes Globo",type: "EMPRESA",   x: 100, y: 370, detail: "Cedente de CCBs de transporte rodoviário.", lastUpdated: "2026-02-28" },
  { id: "textil-parana",   label: "Têxtil Paraná",    type: "EMPRESA",   x: 680, y: 400, detail: "Cedente têxtil. Carteira de duplicatas mercantis.", lastUpdated: "2026-03-05" },
  { id: "agro-cerrado",    label: "Agro Cerrado",     type: "EMPRESA",   x: 320, y: 520, detail: "Cedente agronegócio. CPRs e CRAs como lastro.", lastUpdated: "2026-03-15" },
  { id: "plasticos-delta",  label: "Plásticos Delta",  type: "EMPRESA",   x: 560, y: 500, detail: "Cedente de NFs do setor de plásticos e embalagens.", lastUpdated: "2026-03-11" },
  { id: "engenharia-sigma", label: "Engenharia Sigma", type: "EMPRESA",   x: 80,  y: 240, detail: "Cedente de contratos de engenharia civil.", lastUpdated: "2026-02-20" },
  { id: "farmacia-beta",    label: "Farmácia Beta",    type: "EMPRESA",   x: 800, y: 300, detail: "Cedente farmacêutico. Notas promissórias de distribuição.", lastUpdated: "2026-03-08" },
  { id: "construtora-alfa", label: "Construtora Alfa", type: "EMPRESA",   x: 250, y: 280, detail: "Cedente de recebíveis imobiliários e CRIs.", lastUpdated: "2026-03-14" },
  { id: "energia-solar",    label: "Energia Solar",    type: "EMPRESA",   x: 620, y: 240, detail: "Cedente de recebíveis de energia renovável.", lastUpdated: "2026-03-16" },

  // FUNDO
  { id: "paganini-i",   label: "Paganini I FIDC",   type: "FUNDO", x: 450, y: 300, detail: "Fundo master. R$ 250M PL. Senior AAA + Subordinada. Gestão ativa pela Paganini Capital.", lastUpdated: "2026-03-18" },
  { id: "paganini-ii",  label: "Paganini II FIDC",  type: "FUNDO", x: 350, y: 170, detail: "Fundo feeder multissetorial. R$ 80M PL. Cota única.", lastUpdated: "2026-03-17" },
  { id: "paganini-iii", label: "Paganini III FIDC", type: "FUNDO", x: 550, y: 430, detail: "Fundo especializado em agronegócio. R$ 40M PL.", lastUpdated: "2026-03-16" },

  // REGULAÇÃO
  { id: "cvm-175",     label: "CVM 175",      type: "REGULAÇÃO", x: 280, y: 60,  detail: "Resolução CVM 175/2022. Norma geral de fundos de investimento.", lastUpdated: "2026-01-01" },
  { id: "bacen-4966",  label: "BACEN 4.966",  type: "REGULAÇÃO", x: 620, y: 60,  detail: "Resolução BCB 4.966/2021. Instrumentos financeiros — IFRS 9 local.", lastUpdated: "2026-01-01" },
  { id: "bacen-3978",  label: "BACEN 3.978",  type: "REGULAÇÃO", x: 200, y: 460, detail: "Resolução 3.978/2020. Política de PLD/FT para fundos.", lastUpdated: "2026-01-01" },
  { id: "lei-14430",   label: "Lei 14.430",   type: "REGULAÇÃO", x: 750, y: 470, detail: "Lei 14.430/2022. Securitização e mercado de capitais.", lastUpdated: "2026-01-01" },
  { id: "cmn-4557",    label: "CMN 4.557",    type: "REGULAÇÃO", x: 450, y: 580, detail: "Resolução CMN 4.557/2017. Gestão de riscos para IFs.", lastUpdated: "2026-01-01" },
  { id: "ifrs-9",      label: "IFRS 9",       type: "REGULAÇÃO", x: 140, y: 520, detail: "Padrão internacional de instrumentos financeiros. ECL model.", lastUpdated: "2026-01-01" },

  // PESSOA
  { id: "carlos-silva",  label: "Carlos Silva",  type: "PESSOA", x: 220, y: 200, detail: "Administrador Fiduciário. CPA-20. ANBIMA cert. 15 anos de experiência.", lastUpdated: "2026-03-01" },
  { id: "ana-costa",     label: "Ana Costa",     type: "PESSOA", x: 500, y: 100, detail: "Gestora Sênior. CGA. Responsável pela política de investimentos.", lastUpdated: "2026-03-01" },
  { id: "roberto-lima",  label: "Roberto Lima",  type: "PESSOA", x: 700, y: 220, detail: "Custodiante. CPA-20. Responsável pela guarda dos ativos.", lastUpdated: "2026-03-01" },
  { id: "marina-santos", label: "Marina Santos", type: "PESSOA", x: 380, y: 380, detail: "Compliance Officer. CFP. Responsável pelo monitoramento regulatório.", lastUpdated: "2026-03-10" },
  { id: "pedro-mendes",  label: "Pedro Mendes",  type: "PESSOA", x: 580, y: 160, detail: "Analista de Risco Sênior. FRM. Modelos de PDD e ECL.", lastUpdated: "2026-03-05" },

  // OBRIGAÇÃO
  { id: "cadoc-3040",     label: "CADOC 3040",     type: "OBRIGAÇÃO", x: 120, y: 500, detail: "Documento BACEN. Reporte mensal de carteira de crédito.", lastUpdated: "2026-03-01" },
  { id: "informe-mensal", label: "Informe Mensal",  type: "OBRIGAÇÃO", x: 520, y: 560, detail: "Informe mensal de carteira CVM. Prazo: dia 5 de cada mês.", lastUpdated: "2026-03-05" },
  { id: "ago-anual",      label: "AGO Anual",       type: "OBRIGAÇÃO", x: 800, y: 400, detail: "Assembleia Geral Ordinária. Aprovação de demonstrações financeiras.", lastUpdated: "2026-03-12" },
  { id: "darf-ir",        label: "DARF IR",         type: "OBRIGAÇÃO", x: 680, y: 520, detail: "Guia DARF para IR sobre rendimentos. Último dia útil do mês.", lastUpdated: "2026-03-15" },

  // MÓDULO
  { id: "pricing-py",    label: "pricing.py",    type: "MÓDULO", x: 340, y: 300, detail: "Motor de precificação. WACC, duration, PDD. Python 3.12.", lastUpdated: "2026-03-18" },
  { id: "compliance-py", label: "compliance.py", type: "MÓDULO", x: 580, y: 300, detail: "Engine de compliance. Checks CVM/BACEN em tempo real.", lastUpdated: "2026-03-17" },
  { id: "risk-py",       label: "risk.py",       type: "MÓDULO", x: 460, y: 420, detail: "Módulo de risco. VAR, CVaR, stress tests. Integra com pricing.", lastUpdated: "2026-03-16" },
  { id: "admin-py",      label: "admin.py",      type: "MÓDULO", x: 380, y: 220, detail: "Módulo de administração. Gestão de cotistas e movimentos.", lastUpdated: "2026-03-15" },
  { id: "custody-py",    label: "custody.py",    type: "MÓDULO", x: 520, y: 220, detail: "Módulo de custódia. Liquidação, conciliação e guarda digital.", lastUpdated: "2026-03-14" },

  // SKILL
  { id: "fidc-rules-base",    label: "fidc-rules-base",    type: "SKILL", x: 80,  y: 570, detail: "Base de regras FIDC. 2.400+ regras regulatórias indexadas em pgvector.", lastUpdated: "2026-03-18" },
  { id: "fidc-orchestrator",  label: "fidc-orchestrator",  type: "SKILL", x: 280, y: 600, detail: "Agente orquestrador FIDC. Coordena 9 sub-agentes do pack vertical.", lastUpdated: "2026-03-18" },
  { id: "compliance-agent",   label: "compliance-agent",   type: "SKILL", x: 480, y: 600, detail: "Agente compliance. Monitora 24/7 desvios regulatórios em tempo real.", lastUpdated: "2026-03-18" },
];

const EDGES: GraphEdge[] = [
  // EMPRESA → FUNDO (cedente_de)
  { id: "e1",  source: "cimento-norte",    target: "paganini-i",   label: "cedente_de",  important: true },
  { id: "e2",  source: "metalurgica-abc",  target: "paganini-i",   label: "cedente_de",  important: true },
  { id: "e3",  source: "transportes-globo",target: "paganini-ii",  label: "cedente_de" },
  { id: "e4",  source: "textil-parana",    target: "paganini-i",   label: "cedente_de" },
  { id: "e5",  source: "agro-cerrado",     target: "paganini-iii", label: "cedente_de" },
  { id: "e6",  source: "plasticos-delta",  target: "paganini-iii", label: "cedente_de" },
  { id: "e7",  source: "engenharia-sigma", target: "paganini-ii",  label: "cedente_de" },
  { id: "e8",  source: "farmacia-beta",    target: "paganini-i",   label: "cedente_de",  important: true },
  { id: "e9",  source: "construtora-alfa", target: "paganini-ii",  label: "cedente_de" },
  { id: "e10", source: "energia-solar",    target: "paganini-i",   label: "cedente_de" },

  // REGULAÇÃO → Paganini I (regula)
  { id: "e11", source: "cvm-175",    target: "paganini-i", label: "regula",  important: true },
  { id: "e12", source: "bacen-4966", target: "paganini-i", label: "regula",  important: true },
  { id: "e13", source: "bacen-3978", target: "paganini-i", label: "regula" },
  { id: "e14", source: "lei-14430",  target: "paganini-i", label: "regula" },
  { id: "e15", source: "cmn-4557",   target: "paganini-i", label: "regula" },
  { id: "e16", source: "ifrs-9",     target: "paganini-i", label: "regula" },

  // PESSOA → FUNDO
  { id: "e17", source: "carlos-silva",  target: "paganini-i",  label: "administra",  important: true },
  { id: "e18", source: "ana-costa",     target: "paganini-i",  label: "gere",        important: true },
  { id: "e19", source: "roberto-lima",  target: "paganini-i",  label: "custodia" },
  { id: "e20", source: "marina-santos", target: "paganini-i",  label: "supervisiona" },
  { id: "e21", source: "pedro-mendes",  target: "paganini-ii", label: "analisa" },

  // OBRIGAÇÃO → FUNDO (obriga)
  { id: "e22", source: "cadoc-3040",     target: "paganini-i", label: "obriga" },
  { id: "e23", source: "informe-mensal", target: "paganini-i", label: "obriga",  important: true },
  { id: "e24", source: "ago-anual",      target: "paganini-i", label: "obriga" },
  { id: "e25", source: "darf-ir",        target: "paganini-i", label: "obriga" },

  // MÓDULO → Paganini I (implementa)
  { id: "e26", source: "pricing-py",    target: "paganini-i", label: "implementa",  important: true },
  { id: "e27", source: "compliance-py", target: "paganini-i", label: "implementa",  important: true },
  { id: "e28", source: "risk-py",       target: "paganini-i", label: "implementa" },
  { id: "e29", source: "admin-py",      target: "paganini-i", label: "implementa" },
  { id: "e30", source: "custody-py",    target: "paganini-i", label: "implementa" },

  // SKILL → MÓDULO (utiliza)
  { id: "e31", source: "fidc-rules-base",   target: "compliance-py", label: "utiliza",  important: true },
  { id: "e32", source: "fidc-orchestrator", target: "admin-py",      label: "utiliza" },
  { id: "e33", source: "compliance-agent",  target: "compliance-py", label: "utiliza" },
  { id: "e34", source: "fidc-rules-base",   target: "risk-py",       label: "utiliza" },
  { id: "e35", source: "compliance-agent",  target: "risk-py",       label: "utiliza" },

  // REGULAÇÃO → OBRIGAÇÃO (exige)
  { id: "e36", source: "bacen-4966", target: "cadoc-3040",     label: "exige" },
  { id: "e37", source: "cvm-175",    target: "informe-mensal", label: "exige",  important: true },
  { id: "e38", source: "cmn-4557",   target: "ago-anual",      label: "exige" },
  { id: "e39", source: "lei-14430",  target: "darf-ir",        label: "exige" },
  { id: "e40", source: "bacen-3978", target: "cadoc-3040",     label: "exige" },

  // EMPRESA → PESSOA (sócio_de)
  { id: "e41", source: "cimento-norte",    target: "carlos-silva",  label: "sócio_de" },
  { id: "e42", source: "metalurgica-abc",  target: "roberto-lima",  label: "sócio_de" },
  { id: "e43", source: "construtora-alfa", target: "carlos-silva",  label: "sócio_de" },
  { id: "e44", source: "energia-solar",    target: "pedro-mendes",  label: "sócio_de" },
  { id: "e45", source: "farmacia-beta",    target: "marina-santos", label: "sócio_de" },

  // Cross-fund
  { id: "e46", source: "paganini-i",  target: "paganini-ii",  label: "alimenta",  important: true },
  { id: "e47", source: "paganini-ii", target: "paganini-iii", label: "alimenta",  important: true },
  { id: "e48", source: "paganini-i",  target: "paganini-iii", label: "alimenta" },

  // Extra regulação cruzada
  { id: "e49", source: "ifrs-9",   target: "bacen-4966",  label: "adotado_por" },
  { id: "e50", source: "cvm-175",  target: "paganini-ii", label: "regula" },
  { id: "e51", source: "cvm-175",  target: "paganini-iii",label: "regula" },
  { id: "e52", source: "lei-14430",target: "paganini-ii", label: "regula" },
  { id: "e53", source: "risk-py",  target: "pricing-py",  label: "depende_de" },
  { id: "e54", source: "fidc-orchestrator", target: "pricing-py",    label: "utiliza" },
  { id: "e55", source: "compliance-agent",  target: "fidc-rules-base",label: "treina_em" },
  { id: "e56", source: "carlos-silva",  target: "paganini-ii",  label: "administra" },
  { id: "e57", source: "marina-santos", target: "paganini-iii", label: "supervisiona" },
];

// ─── SHAPE RENDERERS ──────────────────────────────────────────────────────────
function renderNodeShape(node: GraphNode, isHovered: boolean, isHighlighted: boolean, isDimmed: boolean, isSearchMatch: boolean) {
  const cfg = NODE_CONFIG[node.type];
  const color = cfg.color;
  const opacity = isDimmed ? 0.15 : 1;
  const glowId = `glow-${node.type.toLowerCase().replace("ã","a").replace("ç","c").replace("ó","o").replace("é","e").replace("ú","u")}`;
  const filterId = isSearchMatch ? "glow-search" : (isHovered || isHighlighted) ? glowId : "none";
  const strokeColor = isSearchMatch ? "#facc15" : color;
  const strokeW = isHovered || isHighlighted || isSearchMatch ? 2.5 : 1.5;
  const sz = node.type === "FUNDO" ? 32 : 22;

  const baseProps = {
    fill: `${color}18`,
    stroke: strokeColor,
    strokeWidth: strokeW,
    filter: filterId !== "none" ? `url(#${filterId})` : undefined,
    opacity,
    style: { transition: "opacity 0.3s" },
  };

  if (node.type === "FUNDO") {
    // Hexagon
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${sz * Math.cos(angle)},${sz * Math.sin(angle)}`;
    }).join(" ");
    return <polygon points={pts} {...baseProps} />;
  } else if (node.type === "EMPRESA") {
    return <rect x={-sz} y={-sz * 0.65} width={sz * 2} height={sz * 1.3} rx="5" {...baseProps} />;
  } else if (node.type === "REGULAÇÃO") {
    const d2 = sz * 1.1;
    return <polygon points={`0,${-d2} ${d2},0 0,${d2} ${-d2},0`} {...baseProps} />;
  } else if (node.type === "PESSOA") {
    return <circle r={sz * 0.85} {...baseProps} />;
  } else if (node.type === "OBRIGAÇÃO") {
    // Octagon
    const r = sz;
    const o = r * 0.38;
    const pts = `${-o},${-r} ${o},${-r} ${r},${-o} ${r},${o} ${o},${r} ${-o},${r} ${-r},${o} ${-r},${-o}`;
    return <polygon points={pts} {...baseProps} />;
  } else if (node.type === "MÓDULO") {
    // Pill/stadium
    return <rect x={-sz * 1.1} y={-sz * 0.55} width={sz * 2.2} height={sz * 1.1} rx={sz * 0.55} {...baseProps} />;
  } else if (node.type === "SKILL") {
    // Star (5-pointed)
    const outerR = sz;
    const innerR = sz * 0.45;
    const pts = Array.from({ length: 10 }, (_, i) => {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r2 = i % 2 === 0 ? outerR : innerR;
      return `${r2 * Math.cos(angle)},${r2 * Math.sin(angle)}`;
    }).join(" ");
    return <polygon points={pts} {...baseProps} />;
  }
  return <circle r={sz * 0.85} {...baseProps} />;
}

// ─── QUADRATIC BEZIER PATH ────────────────────────────────────────────────────
function getEdgePath(src: GraphNode, tgt: GraphNode): string {
  const mx = (src.x + tgt.x) / 2;
  const my = (src.y + tgt.y) / 2;
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const curve = len * 0.18;
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);
  const cx = mx + nx * curve;
  const cy = my + ny * curve;
  return `M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`;
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{val.toLocaleString("pt-BR")}{suffix}</>;
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80; const h = 28;
  const max = Math.max(...data); const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}20`} stroke="none" />
    </svg>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MemoryPage() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ node: null, x: 0, y: 0 });
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    new Set(["EMPRESA", "FUNDO", "REGULAÇÃO", "PESSOA", "OBRIGAÇÃO", "MÓDULO", "SKILL"])
  );
  const [searchText, setSearchText] = useState("");
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 640 });
  const [hoveredDonut, setHoveredDonut] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const nodeMap = new Map(NODES.map(n => [n.id, n]));

  // Connected edges per node
  const edgesByNode = new Map<string, string[]>();
  NODES.forEach(n => edgesByNode.set(n.id, []));
  EDGES.forEach(e => {
    edgesByNode.get(e.source)?.push(e.id);
    edgesByNode.get(e.target)?.push(e.id);
  });

  const connectedEdgeIds = hoveredNode
    ? new Set(edgesByNode.get(hoveredNode) ?? [])
    : new Set<string>();

  const filteredNodes = NODES.filter(n => activeFilters.has(n.type));
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = EDGES.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

  const searchLower = searchText.toLowerCase();
  const matchingNodeIds = searchText
    ? new Set(filteredNodes.filter(n => n.label.toLowerCase().includes(searchLower)).map(n => n.id))
    : null;

  function toggleFilter(type: NodeType) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function zoom(delta: number) {
    setViewBox(v => ({
      ...v,
      w: Math.max(300, v.w + delta),
      h: Math.max(200, v.h + delta * (640 / 900)),
    }));
  }

  function handleNodeEnter(node: GraphNode) {
    setHoveredNode(node.id);
    setTooltip({ node, x: node.x, y: node.y });
  }

  function handleNodeLeave() {
    setHoveredNode(null);
    setTooltip({ node: null, x: 0, y: 0 });
  }

  // Count edges
  const edgeLabelCounts: Record<string, number> = {};
  EDGES.forEach(e => { edgeLabelCounts[e.label] = (edgeLabelCounts[e.label] || 0) + 1; });
  const donutData = [
    { label: "cedente_de",  count: edgeLabelCounts["cedente_de"] || 0,  color: "#22c55e" },
    { label: "regula",      count: edgeLabelCounts["regula"] || 0,       color: "#f59e0b" },
    { label: "implementa",  count: edgeLabelCounts["implementa"] || 0,   color: "#14b8a6" },
    { label: "obriga",      count: edgeLabelCounts["obriga"] || 0,       color: "#ef4444" },
    { label: "outros",      count: EDGES.length - (edgeLabelCounts["cedente_de"] || 0) - (edgeLabelCounts["regula"] || 0) - (edgeLabelCounts["implementa"] || 0) - (edgeLabelCounts["obriga"] || 0), color: "#a855f7" },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.count, 0);

  const typeCounts: Record<NodeType, number> = {} as Record<NodeType, number>;
  NODES.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

  // Donut chart angles
  let cumAngle = -Math.PI / 2;
  const donutSlices = donutData.map(d => {
    const angle = (d.count / donutTotal) * Math.PI * 2;
    const startA = cumAngle;
    cumAngle += angle;
    return { ...d, startA, endA: cumAngle };
  });

  function arcPath(cx: number, cy: number, r: number, startA: number, endA: number) {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const stats = [
    { label: "Total de Entidades", value: NODES.length, suffix: "", icon: "🗂️", color: "#22d3ee", sparkData: [28,30,30,32,33,34,34,35] },
    { label: "Relacionamentos",    value: EDGES.length, suffix: "+", icon: "🔗", color: "#22c55e", sparkData: [40,44,48,50,51,53,55,57] },
    { label: "Consultas RAG/dia",  value: 1243, suffix: "", icon: "⚡", color: "#a855f7", sparkData: [900,1100,1050,1200,1150,1243,1300,1243] },
    { label: "Precisão Semântica", value: 91, suffix: ".2%", icon: "🎯", color: "#f59e0b", sparkData: [85,87,88,89,90,90,91,91] },
  ];

  const recentQueries = [
    { query: "Quais empresas são cedentes do Paganini I?", confidence: 0.97, agent: "Gestor", time: "2min" },
    { query: "CVM 175 impacta quais obrigações?",          confidence: 0.94, agent: "Compliance", time: "5min" },
    { query: "Listar todos os módulos de risco",            confidence: 0.99, agent: "OraCLI", time: "8min" },
    { query: "Sócio da Metalúrgica ABC?",                   confidence: 0.88, agent: "Due Diligence", time: "12min" },
    { query: "BACEN 3.978 exige quais documentos?",         confidence: 0.92, agent: "Regulatory Watch", time: "18min" },
    { query: "PDD do Agro Cerrado — cálculo atual",        confidence: 0.85, agent: "Pricing Engine", time: "25min" },
    { query: "Compliance check Têxtil Paraná",              confidence: 0.96, agent: "Compliance", time: "31min" },
    { query: "Relatório AGO Paganini I",                    confidence: 0.93, agent: "Reporting", time: "44min" },
  ];

  const ragStages = [
    { label: "Query Input",       icon: "📥", color: "#22d3ee" },
    { label: "Embedding",         icon: "🧠", color: "#a855f7" },
    { label: "pgvector Search",   icon: "🔍", color: "#22c55e" },
    { label: "Context Merge",     icon: "🔗", color: "#f59e0b" },
    { label: "Reranking",         icon: "⚡", color: "#14b8a6" },
    { label: "LLM Synthesis",     icon: "🤖", color: "#a855f7" },
    { label: "Response",          icon: "📤", color: "#22c55e" },
  ];

  const barData: Array<{ type: NodeType; count: number }> = (Object.keys(NODE_CONFIG) as NodeType[]).map(t => ({
    type: t,
    count: typeCounts[t] || 0,
  }));
  const barMax = Math.max(...barData.map(b => b.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div
        className="glass-card"
        style={{
          padding: "2rem",
          position: "relative",
          overflow: "hidden",
          borderTop: "2px solid #22d3ee80",
        }}
      >
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, #22d3ee0a 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="mono-label" style={{ marginBottom: "0.5rem", color: "#22d3ee" }}>
            PAGANINI AIOS · KNOWLEDGE GRAPH v4.0
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 900,
            fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
            color: "var(--text-1)", letterSpacing: "-0.03em",
            margin: "0 0 0.5rem", lineHeight: 1.1,
          }}>
            Grafo de Conhecimento{" "}
            <span style={{ color: "#22d3ee", textShadow: "0 0 30px #22d3ee60" }}>Empresarial</span>
          </h1>
          <p className="section-help" style={{ marginBottom: "1.25rem", maxWidth: 580 }}>
            {NODES.length} entidades · {EDGES.length} relacionamentos · Motor RAG semântico com pgvector · Atualizado em tempo real
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="tag-badge-cyan">KNOWLEDGE GRAPH</span>
            <span className="tag-badge">RAG ENGINE</span>
            <span className="tag-badge" style={{ background: "#a855f710", color: "#a855f7", borderColor: "#a855f740" }}>pgvector</span>
            <span className="tag-badge" style={{ background: "#22c55e10", color: "#22c55e", borderColor: "#22c55e40" }}>TEMPO REAL</span>
          </div>
        </div>
      </div>

      {/* ═══ GRAPH SECTION ════════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ padding: "1.25rem", overflow: "hidden" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <div className="mono-label" style={{ marginBottom: "0.25rem" }}>GRAFO DE ENTIDADES</div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.75rem" }}>
            Mapa Relacional Interativo — {filteredNodes.length} entidades visíveis
          </h2>

          {/* Controls row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            {/* Search */}
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar entidade..."
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                background: "#ffffff08", border: "1px solid #ffffff15",
                color: "var(--text-1)", borderRadius: "var(--radius)",
                padding: "5px 12px", outline: "none", width: 180,
                letterSpacing: "0.04em",
              }}
            />
            {/* Zoom */}
            {[
              { label: "＋", delta: -100 },
              { label: "－", delta: 100 },
              { label: "↺",  delta: 0, reset: true },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => btn.reset ? setViewBox({ x: 0, y: 0, w: 900, h: 640 }) : zoom(btn.delta)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                  background: "#ffffff08", border: "1px solid #ffffff15",
                  color: "var(--text-2)", borderRadius: "var(--radius)",
                  padding: "4px 10px", cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {btn.label}
              </button>
            ))}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", marginLeft: 4 }}>
              ZOOM: {Math.round((900 / viewBox.w) * 100)}%
            </span>
          </div>

          {/* Filter toggles */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
            {(Object.keys(NODE_CONFIG) as NodeType[]).map(type => {
              const cfg = NODE_CONFIG[type];
              const active = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.4375rem",
                    padding: "3px 10px", borderRadius: "var(--radius)",
                    cursor: "pointer", transition: "all 0.2s",
                    background: active ? `${cfg.color}18` : "#ffffff04",
                    border: `1px solid ${active ? cfg.color + "60" : "#ffffff12"}`,
                    color: active ? cfg.color : "var(--text-4)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {type} ({typeCounts[type] || 0})
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG Graph */}
        <div style={{ position: "relative", background: "#030712", borderRadius: 8, overflow: "hidden" }}>
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ display: "block", width: "100%", height: "auto", minHeight: 420 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Node glow filters */}
              {(Object.entries(NODE_CONFIG) as [NodeType, { color: string; label: string }][]).map(([type, cfg]) => {
                const filtId = `glow-${type.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
                return (
                  <filter key={type} id={filtId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feFlood floodColor={cfg.color} floodOpacity="0.6" result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                );
              })}
              {/* Search highlight filter */}
              <filter id="glow-search" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#facc15" floodOpacity="0.9" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow markers per type */}
              {(Object.entries(NODE_CONFIG) as [NodeType, { color: string; label: string }][]).map(([type, cfg]) => (
                <marker
                  key={type}
                  id={`arrow-${type.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                  markerWidth="6" markerHeight="5"
                  refX="6" refY="2.5" orient="auto"
                >
                  <polygon points="0 0, 6 2.5, 0 5" fill={cfg.color} opacity="0.6" />
                </marker>
              ))}
              <marker id="arrow-default" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 6 2.5, 0 5" fill="#ffffff" opacity="0.3" />
              </marker>

              {/* Background gradient */}
              <radialGradient id="nebula-grad" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#0c1a2e" />
                <stop offset="50%" stopColor="#060d1a" />
                <stop offset="100%" stopColor="#020508" />
              </radialGradient>
              <pattern id="grid-pat" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22d3ee08" strokeWidth="0.5" />
              </pattern>

              {/* Pulse animation for central node */}
              <style>{`
                @keyframes pulse-ring {
                  0%   { opacity: 0.5; transform: scale(1); }
                  100% { opacity: 0; transform: scale(2.2); }
                }
                @keyframes node-breathe {
                  0%, 100% { transform: scale(1); }
                  50%       { transform: scale(1.02); }
                }
                @keyframes edge-flow {
                  0%   { stroke-dashoffset: 0; }
                  100% { stroke-dashoffset: -20; }
                }
                @keyframes scan-line {
                  0%   { transform: translateY(-640px); }
                  100% { transform: translateY(640px); }
                }
                .node-group { cursor: pointer; }
                .node-group:hover .node-label { opacity: 1 !important; }
              `}</style>
            </defs>

            {/* Background */}
            <rect x="-100" y="-100" width="1200" height="900" fill="url(#nebula-grad)" />
            <rect x="-100" y="-100" width="1200" height="900" fill="url(#grid-pat)" />

            {/* Scan line */}
            <rect x="-100" y="0" width="1200" height="2" fill="#22d3ee" opacity="0.04" style={{ animation: "scan-line 8s linear infinite" }} />

            {/* Stats donut in top-right corner */}
            <g transform="translate(840, 60)">
              {donutSlices.map((slice, i) => {
                const rOuter = 28;
                const rInner = 18;
                const hover = hoveredDonut === i;
                const rO = hover ? rOuter + 3 : rOuter;
                return (
                  <g key={i}
                    onMouseEnter={() => setHoveredDonut(i)}
                    onMouseLeave={() => setHoveredDonut(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <path
                      d={`${arcPath(0, 0, rO, slice.startA + 0.05, slice.endA - 0.05)} ${arcPath(0, 0, rInner, slice.endA - 0.05, slice.startA + 0.05).replace("M", "L")} Z`}
                      fill={slice.color}
                      opacity={hover ? 0.9 : 0.6}
                      style={{ transition: "all 0.2s" }}
                    />
                  </g>
                );
              })}
              <text textAnchor="middle" y="-4" style={{ fontFamily: "var(--font-mono)", fontSize: "0.3125rem", fill: "#22d3ee", fontWeight: 700, letterSpacing: "0.05em" }}>
                {hoveredDonut !== null ? donutSlices[hoveredDonut].label : "RELAÇÕES"}
              </text>
              <text textAnchor="middle" y="6" style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", fill: "var(--text-3)" }}>
                {hoveredDonut !== null ? donutSlices[hoveredDonut].count : donutTotal}
              </text>
            </g>

            {/* Edges */}
            {filteredEdges.map(edge => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;
              const srcCfg = NODE_CONFIG[src.type];
              const isConnected = connectedEdgeIds.has(edge.id);
              const isInactive = hoveredNode && !isConnected;
              const path = getEdgePath(src, tgt);
              const markerType = src.type.toLowerCase().replace(/[^a-z0-9]/g, "");
              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={srcCfg.color}
                    strokeWidth={isConnected ? 2 : edge.important ? 1.2 : 0.8}
                    opacity={isInactive ? 0.05 : isConnected ? 0.85 : 0.22}
                    strokeDasharray={isConnected ? "5 3" : undefined}
                    markerEnd={`url(#arrow-${markerType})`}
                    style={{
                      transition: "opacity 0.25s, stroke-width 0.2s",
                      animation: isConnected ? "edge-flow 0.6s linear infinite" : undefined,
                    }}
                  />
                  {/* Particle on important edges */}
                  {edge.important && mounted && !isInactive && (
                    <circle r="2.5" fill={srcCfg.color} opacity="0.8">
                      <animateMotion
                        dur={`${2 + Math.random() * 1.5}s`}
                        repeatCount="indefinite"
                        path={path}
                        begin={`${Math.random() * 2}s`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Pulse rings for central node */}
            {[0, 1, 2].map(i => {
              const central = nodeMap.get("paganini-i");
              if (!central) return null;
              return (
                <circle
                  key={i}
                  cx={central.x}
                  cy={central.y}
                  r={36 + i * 8}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={1.5 - i * 0.4}
                  style={{
                    animation: `pulse-ring 2.4s ${i * 0.8}s ease-out infinite`,
                    transformOrigin: `${central.x}px ${central.y}px`,
                  }}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const isHighlighted = hoveredNode ? edgesByNode.get(hoveredNode)?.some(eId => {
                const e = EDGES.find(e => e.id === eId);
                return e && (e.source === node.id || e.target === node.id);
              }) ?? false : false;
              const isDimmed = !!hoveredNode && !isHovered && !isHighlighted;
              const isSearchMatch = !!matchingNodeIds && matchingNodeIds.has(node.id);
              const isSearchDimmed = !!matchingNodeIds && !matchingNodeIds.has(node.id);
              const cfg = NODE_CONFIG[node.type];

              return (
                <g
                  key={node.id}
                  className="node-group"
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => handleNodeEnter(node)}
                  onMouseLeave={handleNodeLeave}
                  style={{
                    animation: !isDimmed ? "node-breathe 4s ease-in-out infinite" : undefined,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                >
                  {renderNodeShape(node, isHovered, isHighlighted, isDimmed || isSearchDimmed, isSearchMatch)}

                  {/* Node icon/emoji substitute - just type initial */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={0}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: node.type === "FUNDO" ? "0.375rem" : "0.3125rem",
                      fill: isSearchDimmed ? "#ffffff20" : cfg.color,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      pointerEvents: "none",
                      opacity: isDimmed || isSearchDimmed ? 0.2 : 1,
                    }}
                  >
                    {node.type === "FUNDO" ? "FIDC" : node.type.slice(0, 3)}
                  </text>

                  {/* Label via foreignObject */}
                  <foreignObject
                    x={-55}
                    y={node.type === "FUNDO" ? 34 : node.type === "REGULAÇÃO" ? 26 : 24}
                    width={110}
                    height={36}
                    style={{ pointerEvents: "none", opacity: isDimmed || isSearchDimmed ? 0.2 : 1 }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.3125rem",
                        color: isSearchMatch ? "#facc15" : cfg.color,
                        textAlign: "center",
                        lineHeight: 1.35,
                        textShadow: `0 0 6px ${cfg.color}80`,
                      }}
                    >
                      <div style={{ fontWeight: 700, letterSpacing: "0.03em", wordBreak: "break-word" }}>
                        {node.label}
                      </div>
                      <div style={{ fontSize: "0.25rem", opacity: 0.6, letterSpacing: "0.06em", marginTop: 1 }}>
                        {node.type}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip.node && (() => {
            const n = tooltip.node;
            const cfg = NODE_CONFIG[n.type];
            const connCount = (edgesByNode.get(n.id) ?? []).length;
            // Position tooltip: offset from node, keep in bounds
            const pctX = (n.x / 900) * 100;
            const toLeft = pctX > 60;
            return (
              <div
                style={{
                  position: "absolute",
                  top: `${((n.y - viewBox.y) / viewBox.h) * 100}%`,
                  left: toLeft ? undefined : `${((n.x - viewBox.x) / viewBox.w) * 100}%`,
                  right: toLeft ? `${100 - ((n.x - viewBox.x) / viewBox.w) * 100}%` : undefined,
                  transform: "translate(12px, -50%)",
                  pointerEvents: "none",
                  zIndex: 10,
                  minWidth: 200,
                  maxWidth: 240,
                }}
              >
                <div style={{
                  background: "rgba(3, 7, 18, 0.92)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${cfg.color}50`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${cfg.color}20`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.375rem",
                      padding: "2px 7px", borderRadius: 3,
                      background: `${cfg.color}20`, border: `1px solid ${cfg.color}50`,
                      color: cfg.color, letterSpacing: "0.08em",
                    }}>{n.type}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", letterSpacing: "0.04em" }}>
                      {connCount} relações
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
                    {n.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: "var(--text-3)", lineHeight: 1.5, marginBottom: 8 }}>
                    {n.detail}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.3125rem", color: "var(--text-4)", letterSpacing: "0.06em" }}>
                    ATUALIZADO: {n.lastUpdated}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Legend */}
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
          {(Object.entries(NODE_CONFIG) as [NodeType, { color: string; label: string }][]).map(([type, cfg]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                {type === "FUNDO"     && <polygon points="7,1 13,4 13,10 7,13 1,10 1,4" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "EMPRESA"   && <rect x="1" y="3" width="12" height="8" rx="2" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "REGULAÇÃO" && <polygon points="7,1 13,7 7,13 1,7" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "PESSOA"    && <circle cx="7" cy="7" r="5.5" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "OBRIGAÇÃO" && <polygon points="4,1 10,1 13,4 13,10 10,13 4,13 1,10 1,4" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "MÓDULO"    && <rect x="1" y="4" width="12" height="6" rx="3" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
                {type === "SKILL"     && <polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 10.5,13 7,10 3.5,13 4.5,8.5 1,5.5 5.5,5.5" fill={`${cfg.color}25`} stroke={cfg.color} strokeWidth="1.2" />}
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: cfg.color, letterSpacing: "0.05em" }}>
                {type} ({typeCounts[type] || 0})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ STATS ROW ════════════════════════════════════════════════════════ */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>MÉTRICAS DO GRAFO</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {stats.map(s => (
            <div key={s.label} className="glass-card" style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}80, transparent)` }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "1.5rem", marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>
                    {mounted ? <AnimatedCounter target={s.value} suffix={s.suffix} /> : `${s.value}${s.suffix}`}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", letterSpacing: "0.1em", marginTop: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
                <Sparkline data={s.sparkData} color={s.color} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ENTITY DISTRIBUTION ══════════════════════════════════════════════ */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>DISTRIBUIÇÃO DE ENTIDADES</div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1.25rem" }}>
          Composição por Tipo de Nó
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {barData.map(b => {
            const cfg = NODE_CONFIG[b.type];
            const pct = Math.round((b.count / barMax) * 100);
            return (
              <div key={b.type} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: cfg.color, minWidth: 80, letterSpacing: "0.06em" }}>
                  {b.type}
                </div>
                <div style={{ flex: 1, height: 22, background: "#ffffff06", borderRadius: 4, overflow: "hidden", border: "1px solid #ffffff08", position: "relative" }}>
                  <div style={{
                    height: "100%",
                    width: mounted ? `${pct}%` : "0%",
                    background: `linear-gradient(90deg, ${cfg.color}50, ${cfg.color}90)`,
                    borderRadius: 4,
                    boxShadow: `0 0 10px ${cfg.color}50`,
                    transition: "width 1.2s ease",
                    display: "flex", alignItems: "center", paddingLeft: 8,
                  }}>
                    {pct > 25 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: "#fff", fontWeight: 700, opacity: 0.9 }}>
                        {b.count} {b.count === 1 ? "entidade" : "entidades"}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: cfg.color, fontWeight: 700, minWidth: 20, textAlign: "right" }}>
                  {b.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ RAG PIPELINE ═════════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>PIPELINE RAG</div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          Motor de Recuperação Semântica — 7 Estágios
        </h2>
        <p className="section-help" style={{ marginBottom: "1.25rem" }}>
          Cada query percorre 7 estágios de processamento. Latência média: 105ms end-to-end.
        </p>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 760 90" style={{ display: "block", minWidth: 500, width: "100%" }}>
            <defs>
              <marker id="rag-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#22d3ee60" />
              </marker>
            </defs>
            {ragStages.map((stage, i) => {
              const nodeW = 86; const nodeH = 60; const gap = 20;
              const x = 8 + i * (nodeW + gap);
              return (
                <g key={i}>
                  {/* Connector */}
                  {i < ragStages.length - 1 && (
                    <g>
                      <line
                        x1={x + nodeW} y1={nodeH / 2 + 8}
                        x2={x + nodeW + gap - 2} y2={nodeH / 2 + 8}
                        stroke="#22d3ee40" strokeWidth="1.5"
                        markerEnd="url(#rag-arrow)"
                      />
                      {/* Animated particle */}
                      {mounted && (
                        <circle r="2" fill={stage.color} opacity="0.9">
                          <animateMotion
                            path={`M ${x + nodeW} ${nodeH / 2 + 8} L ${x + nodeW + gap} ${nodeH / 2 + 8}`}
                            dur={`${0.4 + i * 0.08}s`}
                            begin={`${i * 0.35}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  )}
                  <rect x={x} y={8} width={nodeW} height={nodeH} rx={6}
                    fill={`${stage.color}12`} stroke={`${stage.color}45`} strokeWidth="1"
                  />
                  <text x={x + nodeW / 2} y={28} textAnchor="middle" style={{ fontSize: "1.1rem" }}>{stage.icon}</text>
                  <text x={x + nodeW / 2} y={47} textAnchor="middle"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.3125rem", fill: stage.color, fontWeight: 700, letterSpacing: "0.04em" }}>
                    {stage.label}
                  </text>
                  <text x={x + nodeW / 2} y={58} textAnchor="middle"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.25rem", fill: "#ffffff40", letterSpacing: "0.06em" }}>
                    ESTÁGIO {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ═══ RAG METRICS ══════════════════════════════════════════════════════ */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>MÉTRICAS RAG</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Precisão Semântica", value: "91.2%", sub: "Precision@K — Top-8", color: "#22c55e", icon: "🎯" },
            { label: "Latência Média",      value: "105ms", sub: "P95: 220ms · P99: 380ms", color: "#22d3ee", icon: "⚡" },
            { label: "Top-K Retrieval",     value: "8",     sub: "Chunks por query · HNSW", color: "#a855f7", icon: "🔍" },
          ].map(m => (
            <div key={m.label} className="glass-card" style={{ padding: "1.75rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${m.color}08, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{m.icon}</div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "2.25rem",
                fontWeight: 900, color: m.color, letterSpacing: "-0.04em",
                textShadow: `0 0 20px ${m.color}50`, marginBottom: "0.375rem",
              }}>
                {m.value}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", fontWeight: 700, marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", letterSpacing: "0.06em" }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECENT QUERIES ═══════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>CONSULTAS RECENTES</div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1rem" }}>
          Últimas 8 Queries ao Knowledge Graph
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recentQueries.map((q, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.625rem 0.875rem",
              background: "#ffffff04", border: "1px solid #ffffff08",
              borderRadius: 6,
              transition: "background 0.2s",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", minWidth: 28 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-2)", lineHeight: 1.4 }}>
                {q.query}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.375rem",
                padding: "2px 7px", borderRadius: 3,
                background: "#22d3ee12", border: "1px solid #22d3ee30",
                color: "#22d3ee", whiteSpace: "nowrap", letterSpacing: "0.05em",
              }}>
                {q.agent}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
                <div style={{ flex: 1, height: 4, background: "#ffffff08", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: mounted ? `${q.confidence * 100}%` : "0%",
                    background: q.confidence > 0.92
                      ? "linear-gradient(90deg, #22c55e80, #22c55e)"
                      : q.confidence > 0.85
                      ? "linear-gradient(90deg, #f59e0b80, #f59e0b)"
                      : "linear-gradient(90deg, #ef444480, #ef4444)",
                    borderRadius: 2,
                    transition: `width ${1 + i * 0.1}s ease`,
                  }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: "var(--text-3)", minWidth: 30 }}>
                  {Math.round(q.confidence * 100)}%
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: "var(--text-4)", minWidth: 28 }}>
                {q.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RELATIONSHIP DONUT ═══════════════════════════════════════════════ */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>DISTRIBUIÇÃO DE RELACIONAMENTOS</div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1.25rem" }}>
          Tipos de Relação no Knowledge Graph
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center" }}>
          {/* Interactive Donut */}
          <svg viewBox="-60 -60 120 120" style={{ width: 180, height: 180, flexShrink: 0 }}>
            {donutSlices.map((slice, i) => {
              const hover = hoveredDonut === i;
              const rO = hover ? 52 : 48;
              const rI = 30;
              return (
                <g key={i}
                  onMouseEnter={() => setHoveredDonut(i)}
                  onMouseLeave={() => setHoveredDonut(null)}
                  style={{ cursor: "pointer" }}
                >
                  <path
                    d={`${arcPath(0, 0, rO, slice.startA + 0.04, slice.endA - 0.04)} ${arcPath(0, 0, rI, slice.endA - 0.04, slice.startA + 0.04).replace("M", "L")} Z`}
                    fill={slice.color}
                    opacity={hover ? 0.95 : hoveredDonut !== null ? 0.35 : 0.7}
                    style={{ transition: "all 0.2s" }}
                    stroke={hover ? slice.color : "transparent"}
                    strokeWidth={hover ? 1 : 0}
                  />
                </g>
              );
            })}
            <text textAnchor="middle" y="-5"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", fill: "var(--text-1)", fontWeight: 900 }}>
              {hoveredDonut !== null ? donutSlices[hoveredDonut].count : donutTotal}
            </text>
            <text textAnchor="middle" y="8"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.3rem", fill: "var(--text-4)", letterSpacing: "0.06em" }}>
              {hoveredDonut !== null ? donutSlices[hoveredDonut].label.toUpperCase() : "TOTAL"}
            </text>
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", flex: 1 }}>
            {donutData.map((d, i) => (
              <div
                key={d.label}
                onMouseEnter={() => setHoveredDonut(i)}
                onMouseLeave={() => setHoveredDonut(null)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  cursor: "pointer", padding: "4px 0",
                  opacity: hoveredDonut !== null && hoveredDonut !== i ? 0.4 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-2)" }}>
                  {d.label}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: d.color, fontWeight: 700, minWidth: 24, textAlign: "right" }}>
                  {d.count}
                </div>
                <div style={{ width: 80, height: 5, background: "#ffffff08", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: mounted ? `${(d.count / donutTotal) * 100}%` : "0%",
                    background: d.color,
                    borderRadius: 3,
                    transition: "width 1s ease",
                  }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.375rem", color: "var(--text-4)", minWidth: 32, textAlign: "right" }}>
                  {Math.round((d.count / donutTotal) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
