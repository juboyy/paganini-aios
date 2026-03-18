"""PAGANINI Agent Framework — Loads SOULs, dispatches queries to specialized agents."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional


class AgentSOUL:
    """An agent's identity loaded from a SOUL markdown file."""

    def __init__(self, slug: str, name: str, role: str, system_prompt: str,
                 domains: list[str], tools: list[str], constraints: list[str]):
        self.slug = slug
        self.name = name
        self.role = role
        self.system_prompt = system_prompt
        self.domains = domains
        self.tools = tools
        self.constraints = constraints

    def __repr__(self):
        return f"Agent({self.slug}: {self.name})"


class AgentRegistry:
    """Registry of all available agents. Loads SOULs from filesystem."""

    def __init__(self, souls_dir: str = "packages/agents/souls"):
        self.souls_dir = Path(souls_dir)
        self.agents: dict[str, AgentSOUL] = {}
        self._load_all()

    def _load_all(self):
        if not self.souls_dir.exists():
            return
        for f in self.souls_dir.glob("*.md"):
            agent = self._parse_soul(f)
            if agent:
                self.agents[agent.slug] = agent

    def _parse_soul(self, path: Path) -> Optional[AgentSOUL]:
        """Parse a SOUL markdown file into an AgentSOUL."""
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            return None

        slug = path.stem
        name = slug.replace("_", " ").title()
        role = ""
        domains = []
        tools = []
        constraints = []

        # Extract name from first heading
        m = re.search(r'^#\s+(.+)', text, re.MULTILINE)
        if m:
            name = m.group(1).strip()

        # Extract role from first paragraph after heading
        m = re.search(r'^#\s+.+\n\n(.+?)(?:\n\n|\n#)', text, re.MULTILINE | re.DOTALL)
        if m:
            role = m.group(1).strip()[:200]

        # Extract domains (look for domain/expertise keywords)
        domain_patterns = {
            "regulatorio": ["cvm", "regulament", "resolução", "instrução", "normativ"],
            "contabilidade": ["contabil", "pdd", "cofis", "ifrs", "provisão", "balanço"],
            "compliance": ["pld", "aml", "coaf", "lavagem", "compliance", "lgpd", "sanç"],
            "risco": ["risco", "concentração", "covenant", "inadimplência", "stress"],
            "custódia": ["custódia", "custodiante", "reconcilia", "lastro", "guarda"],
            "reporting": ["cadoc", "informe", "relatório", "report", "icvm 489"],
            "pricing": ["marcação", "mercado", "deságio", "yield", "curva", "mtm"],
            "due_diligence": ["due diligence", "kyc", "credit scor", "judicial"],
            "investidores": ["cotista", "investidor", "assembleia", "relações"],
        }
        text_lower = text.lower()
        for domain, keywords in domain_patterns.items():
            if any(kw in text_lower for kw in keywords):
                domains.append(domain)

        # Extract tools section
        tools_match = re.search(r'##\s*(?:Ferramentas|Tools|Capacidades)\s*\n(.*?)(?:\n##|\Z)',
                                text, re.DOTALL | re.IGNORECASE)
        if tools_match:
            for line in tools_match.group(1).split('\n'):
                line = line.strip().lstrip('- *')
                if line and len(line) > 3:
                    tools.append(line[:80])

        # Extract constraints
        constraints_match = re.search(r'##\s*(?:Restrições|Constraints|Limites|Regras)\s*\n(.*?)(?:\n##|\Z)',
                                      text, re.DOTALL | re.IGNORECASE)
        if constraints_match:
            for line in constraints_match.group(1).split('\n'):
                line = line.strip().lstrip('- *')
                if line and len(line) > 3:
                    constraints.append(line[:120])

        return AgentSOUL(
            slug=slug, name=name, role=role,
            system_prompt=text, domains=domains,
            tools=tools, constraints=constraints,
        )

    def get(self, slug: str) -> Optional[AgentSOUL]:
        return self.agents.get(slug)

    def list(self) -> list[AgentSOUL]:
        return list(self.agents.values())

    def find_by_domain(self, domain: str) -> list[AgentSOUL]:
        """Find agents that handle a specific domain."""
        return [a for a in self.agents.values() if domain in a.domains]


class AgentDispatcher:
    """Routes queries to the most appropriate agent based on content analysis."""

    # Domain keywords → agent slug mapping
    ROUTING_TABLE = {
        "administrador": ["cvm 175", "regulamento", "governança", "assembleia", "filing",
                          "resolução", "normativo", "artigo"],
        "custodiante": ["custódia", "reconciliação", "lastro", "sobrecolateralização",
                        "guarda", "registro", "verificação"],
        "gestor": ["risco", "pdd", "carteira", "concentração", "covenant", "inadimplência",
                   "portfólio", "diversificação"],
        "compliance": ["pld", "aml", "coaf", "lavagem", "sanção", "lgpd", "compliance",
                       "uif", "terrorismo"],
        "reporting": ["cadoc", "3040", "informe mensal", "relatório", "icvm 489", "cofis",
                      "demonstração"],
        "due_diligence": ["due diligence", "kyc", "credit scoring", "judicial", "cedente novo",
                          "análise", "mídia"],
        "regulatory_watch": ["nova regulação", "mudança regulatória", "circular", "ofício",
                             "consulta pública", "anbima", "bacen"],
        "investor_relations": ["cotista", "investidor", "rendimento", "performance",
                               "resgate", "aplicação", "comunicação"],
        "pricing": ["marcação a mercado", "deságio", "taxa", "yield", "curva", "stress test",
                    "precificação", "mtm"],
    }

    def __init__(self, registry: AgentRegistry):
        self.registry = registry

    def route(self, query: str) -> tuple[AgentSOUL, float]:
        """Route a query to the best agent.
        
        Returns: (agent, confidence)
        """
        query_lower = query.lower()
        scores: dict[str, int] = {}

        for slug, keywords in self.ROUTING_TABLE.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            if score > 0:
                scores[slug] = score

        if not scores:
            # Default to administrador (most general)
            default = self.registry.get("administrador")
            if default:
                return default, 0.3
            # If no administrador, return first available
            agents = self.registry.list()
            return agents[0] if agents else None, 0.1

        best_slug = max(scores, key=scores.get)
        best_score = scores[best_slug]
        max_possible = len(self.ROUTING_TABLE.get(best_slug, []))
        confidence = min(best_score / max(max_possible * 0.3, 1), 1.0)

        agent = self.registry.get(best_slug)
        if agent:
            return agent, confidence

        return self.registry.list()[0], 0.2

    def route_multi(self, query: str, max_agents: int = 3) -> list[tuple[AgentSOUL, float]]:
        """Route to multiple agents when query spans domains."""
        query_lower = query.lower()
        scores = {}

        for slug, keywords in self.ROUTING_TABLE.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            if score > 0:
                agent = self.registry.get(slug)
                if agent:
                    confidence = min(score / max(len(keywords) * 0.3, 1), 1.0)
                    scores[slug] = (agent, confidence)

        if not scores:
            default = self.registry.get("administrador")
            if default:
                return [(default, 0.3)]
            return [(self.registry.list()[0], 0.1)] if self.registry.list() else []

        sorted_agents = sorted(scores.values(), key=lambda x: x[1], reverse=True)
        return sorted_agents[:max_agents]
