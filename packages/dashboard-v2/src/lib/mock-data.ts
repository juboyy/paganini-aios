export const AGENTS = [
  { slug: "admin", name: "Admin", icon: "🏛", type: "FIDC", role: "Fund administration", status: "online", lastAction: "NAV calc updated", tokens24h: 4200, cost24h: 0.31, domains: ["nav", "aum", "quotas"] },
  { slug: "compliance", name: "Compliance", icon: "✅", type: "FIDC", role: "Regulatory compliance", status: "online", lastAction: "Op #1847 approved", tokens24h: 8900, cost24h: 0.42, domains: ["cvm", "bacen", "covenant"] },
  { slug: "custody", name: "Custody", icon: "🔐", type: "FIDC", role: "Asset custody", status: "online", lastAction: "Titles registered", tokens24h: 3100, cost24h: 0.18, domains: ["titles", "collateral"] },
  { slug: "due_diligence", name: "Due Diligence", icon: "🔍", type: "FIDC", role: "Credit analysis", status: "working", lastAction: "Cedent ABC scoring", tokens24h: 12400, cost24h: 0.68, domains: ["scoring", "cedent"] },
  { slug: "gestor", name: "Gestor", icon: "📊", type: "FIDC", role: "Fund management", status: "online", lastAction: "Allocation adjusted", tokens24h: 6700, cost24h: 0.35, domains: ["allocation", "cashflow"] },
  { slug: "ir", name: "Investor Relations", icon: "💼", type: "FIDC", role: "Investor communications", status: "idle", lastAction: "Monthly report sent", tokens24h: 2100, cost24h: 0.12, domains: ["reports", "investors"] },
  { slug: "pricing", name: "Pricing", icon: "💰", type: "FIDC", role: "Asset pricing", status: "online", lastAction: "PDD calc updated", tokens24h: 5300, cost24h: 0.28, domains: ["fees", "pdd", "rates"] },
  { slug: "reg_watch", name: "Reg Watch", icon: "📜", type: "FIDC", role: "Regulatory monitoring", status: "online", lastAction: "CVM bulletin parsed", tokens24h: 1800, cost24h: 0.09, domains: ["regulations", "bulletins"] },
  { slug: "reporting", name: "Reporting", icon: "📋", type: "FIDC", role: "Operational reports", status: "online", lastAction: "Dashboard refresh", tokens24h: 3400, cost24h: 0.16, domains: ["reports", "dashboards"] },
  { slug: "code", name: "Code", icon: "💻", type: "AIOS", role: "CTO / Codex Supervisor", status: "working", lastAction: "PR #142 merged", tokens24h: 45200, cost24h: 1.28, domains: ["specs", "implementation"] },
  { slug: "docs", name: "Docs", icon: "📝", type: "AIOS", role: "Documentation", status: "idle", lastAction: "Confluence updated", tokens24h: 8400, cost24h: 0.22, domains: ["docs", "knowledge"] },
  { slug: "infra", name: "Infra", icon: "🏗", type: "AIOS", role: "Deploy, Docker, CI/CD", status: "idle", lastAction: "Health check OK", tokens24h: 3200, cost24h: 0.15, domains: ["deploy", "docker"] },
  { slug: "general", name: "General", icon: "🔧", type: "AIOS", role: "Triage, UX, research", status: "online", lastAction: "Competitor analysis", tokens24h: 6100, cost24h: 0.33, domains: ["triage", "research"] },
  { slug: "architect", name: "Architect", icon: "🧠", type: "AIOS", role: "System design", status: "idle", lastAction: "API contract review", tokens24h: 14200, cost24h: 0.89, domains: ["architecture", "api"] },
  { slug: "pm", name: "PM", icon: "📋", type: "AIOS", role: "Sprint planning", status: "online", lastAction: "Stories created", tokens24h: 5600, cost24h: 0.24, domains: ["sprints", "stories"] },
  { slug: "data", name: "Data", icon: "📊", type: "AIOS", role: "DB, migrations, analytics", status: "online", lastAction: "Schema validated", tokens24h: 4800, cost24h: 0.21, domains: ["schemas", "sql"] },
  { slug: "codex", name: "Codex", icon: "⚡", type: "Tier-2", role: "Code execution engine", status: "idle", lastAction: "VIV-95 complete", tokens24h: 82000, cost24h: 3.70, domains: ["implementation"] },
  { slug: "qa", name: "QA", icon: "🧪", type: "Tier-2", role: "Test strategy", status: "offline", lastAction: "47 tests passing", tokens24h: 2400, cost24h: 0.11, domains: ["tests", "coverage"] },
  { slug: "security", name: "Security", icon: "🔒", type: "Tier-2", role: "Vuln scanning", status: "offline", lastAction: "npm audit clean", tokens24h: 1200, cost24h: 0.06, domains: ["vulnerabilities", "secrets"] },
];

export const ACTIVITY = [
  { id: "1", type: "success", message: "Compliance agent approved operation #1847", time: "2m ago", agent: "compliance" },
  { id: "2", type: "info", message: "Symphony dispatched VIV-99 to Codex", time: "5m ago", agent: "symphony" },
  { id: "3", type: "warning", message: "Concentration gate: Cedent ABC at 14.2% (limit 15%)", time: "12m ago", agent: "guardrails" },
  { id: "4", type: "info", message: "Memory reflection completed — 53 entries distilled", time: "1h ago", agent: "memory" },
  { id: "5", type: "success", message: "Code Agent merged PR #142 — health endpoint", time: "2h ago", agent: "code" },
  { id: "6", type: "error", message: "Codex token tracking: 0 tokens reported (bug)", time: "3h ago", agent: "codex" },
  { id: "7", type: "success", message: "Due Diligence scored Cedent XYZ — AA rating", time: "4h ago", agent: "due_diligence" },
  { id: "8", type: "info", message: "Standup report delivered to #dev-updates", time: "6h ago", agent: "general" },
];

export const GUARDRAIL_GATES = [
  { gate: "eligibility", icon: "🎯", label: "Eligibility", status: "pass" as const, stat: "847 checks" },
  { gate: "concentration", icon: "📊", label: "Concentration", status: "warn" as const, stat: "14.2% / 15%" },
  { gate: "covenant", icon: "📜", label: "Covenant", status: "pass" as const, stat: "all within" },
  { gate: "pld_aml", icon: "🔍", label: "PLD/AML", status: "pass" as const, stat: "0 flags" },
  { gate: "compliance", icon: "⚖", label: "Compliance", status: "pass" as const, stat: "CVM ok" },
  { gate: "risk", icon: "🛡", label: "Risk", status: "pass" as const, stat: "PDD 2.8%" },
];

export const STATS = {
  fundAum: "R$ 245.8M",
  fundAumDelta: "+2.3%",
  agentsOnline: "16/19",
  ragChunks: "2,847",
  guardrails: "6/6",
  symphonyTasks: 3,
  roiHours: "701.2h",
  roiCostPerHour: "$0.09/h",
};

export const NAV_HISTORY = [
  { month: "Apr", value: 182.4 }, { month: "May", value: 189.1 }, { month: "Jun", value: 194.7 },
  { month: "Jul", value: 201.3 }, { month: "Aug", value: 208.6 }, { month: "Sep", value: 215.2 },
  { month: "Oct", value: 218.9 }, { month: "Nov", value: 225.4 }, { month: "Dec", value: 231.1 },
  { month: "Jan", value: 236.8 }, { month: "Feb", value: 240.2 }, { month: "Mar", value: 245.8 },
];

export const CONCENTRATION = [
  { cedent: "Cedent ABC", pct: 14.2 }, { cedent: "Cedent DEF", pct: 8.7 },
  { cedent: "Cedent GHI", pct: 6.3 }, { cedent: "Cedent JKL", pct: 4.1 },
  { cedent: "Cedent MNO", pct: 3.5 }, { cedent: "Cedent PQR", pct: 3.2 },
  { cedent: "Cedent STU", pct: 2.9 }, { cedent: "Cedent VWX", pct: 2.3 },
  { cedent: "Cedent YZ1", pct: 1.8 }, { cedent: "Cedent AB2", pct: 0.9 },
];
