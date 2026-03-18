export const AGENTS = [
  { id: "administrador", name: "Administrador", status: "active", tasks: 142, latency: "1.2s", role: "NAV & Cotas", color: "var(--accent)" },
  { id: "compliance", name: "Compliance", status: "active", tasks: 284, latency: "0.8s", role: "6-Gate Guardrails", color: "var(--accent)" },
  { id: "custodia", name: "Custódia", status: "active", tasks: 89, latency: "1.5s", role: "Títulos & Lastro", color: "var(--accent)" },
  { id: "due-diligence", name: "Due Diligence", status: "active", tasks: 56, latency: "2.1s", role: "Cedente Scoring", color: "var(--accent)" },
  { id: "gestor", name: "Gestor", status: "active", tasks: 167, latency: "1.1s", role: "Alocação & Risco", color: "var(--accent)" },
  { id: "ir", name: "Investor Relations", status: "idle", tasks: 34, latency: "0.9s", role: "Cotistas & Perf", color: "var(--text-4)" },
  { id: "pricing", name: "Pricing", status: "active", tasks: 112, latency: "0.9s", role: "PDD & Mark-to-Market", color: "var(--accent)" },
  { id: "regwatch", name: "Reg Watch", status: "watching", tasks: 12, latency: "—", role: "CVM & BACEN", color: "var(--cyan)" },
  { id: "reporting", name: "Reporting", status: "active", tasks: 78, latency: "1.4s", role: "Demonstrações Fin", color: "var(--accent)" },
];

export const GUARDRAILS = [
  { id: "eligibility", name: "ELIGIBILITY", status: "pass", checks: 1847, pass_rate: 98.2, last_check: "2 min ago" },
  { id: "concentration", name: "CONCENTRATION", status: "pass", checks: 1847, pass_rate: 94.5, last_check: "2 min ago" },
  { id: "covenant", name: "COVENANT", status: "pass", checks: 1847, pass_rate: 100, last_check: "2 min ago" },
  { id: "pld_aml", name: "PLD/AML", status: "pass", checks: 1847, pass_rate: 99.8, last_check: "2 min ago" },
  { id: "compliance", name: "COMPLIANCE", status: "pass", checks: 1847, pass_rate: 96.4, last_check: "2 min ago" },
  { id: "risk", name: "RISK", status: "pass", checks: 1847, pass_rate: 95.1, last_check: "2 min ago" },
];

export const FUND_STATS = {
  nav: "R$ 245.8M",
  cota_senior: "R$ 1.0234",
  cota_subordinada: "R$ 0.9876",
  subordination: "28.5%",
  total_receivables: "R$ 312.4M",
  pdd: "R$ 4.7M",
  net_portfolio: "R$ 307.7M",
};

export const ACTIVITY = [
  { time: "13:04", agent: "Compliance", action: "Covenant check passed — subordination ratio 28.5%", type: "pass" },
  { time: "13:01", agent: "Pricing", action: "PDD recalculated — portfolio aging updated", type: "info" },
  { time: "12:58", agent: "Due Diligence", action: "New cedente scored: CNPJ 12.345.678/0001-90 → Score 87", type: "info" },
  { time: "12:55", agent: "Guardrail", action: "Concentration alert: Cedente ABC at 13.8% (limit 15%)", type: "warn" },
  { time: "12:50", agent: "Gestor", action: "Allocation rebalanced — R$ 4.2M reallocated to lower risk", type: "info" },
  { time: "12:45", agent: "Reg Watch", action: "New CVM publication detected — Circular 4.021", type: "alert" },
];
