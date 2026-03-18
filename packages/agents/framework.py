"""PAGANINI Agent Framework — Loads SOULs, dispatches queries to specialized agents.

Supports recursive sub-agent spawning with context inheritance.
Each agent can delegate sub-tasks to other agents, building execution
trees of arbitrary depth. Context flows parent → child with full
trace logging for observability.
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional


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


# ---------------------------------------------------------------------------
# Execution Trace — Full observability for recursive agent operations
# ---------------------------------------------------------------------------

@dataclass
class ExecutionSpan:
    """A single execution span in the agent trace tree."""
    span_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    parent_id: Optional[str] = None
    agent_slug: str = ""
    task: str = ""
    depth: int = 0
    status: str = "pending"  # pending | running | completed | failed
    result: Any = None
    start_time: float = 0.0
    end_time: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    children: list["ExecutionSpan"] = field(default_factory=list)

    @property
    def duration_ms(self) -> float:
        if self.end_time and self.start_time:
            return round((self.end_time - self.start_time) * 1000, 1)
        return 0

    @property
    def total_spans(self) -> int:
        return 1 + sum(c.total_spans for c in self.children)

    @property
    def max_depth(self) -> int:
        if not self.children:
            return self.depth
        return max(c.max_depth for c in self.children)

    def to_dict(self) -> dict:
        return {
            "span_id": self.span_id,
            "parent_id": self.parent_id,
            "agent": self.agent_slug,
            "task": self.task[:120],
            "depth": self.depth,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "tokens": {"in": self.tokens_in, "out": self.tokens_out},
            "children": [c.to_dict() for c in self.children],
        }


@dataclass
class ExecutionContext:
    """Context that flows from parent to child agents during recursive dispatch."""
    trace_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    parent_span: Optional[ExecutionSpan] = None
    depth: int = 0
    max_depth: int = 6
    accumulated_context: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def child(self, agent_slug: str, task: str) -> "ExecutionContext":
        """Create a child context for a sub-agent spawn."""
        span = ExecutionSpan(
            parent_id=self.parent_span.span_id if self.parent_span else None,
            agent_slug=agent_slug,
            task=task,
            depth=self.depth + 1,
            start_time=time.time(),
            status="running",
        )
        if self.parent_span:
            self.parent_span.children.append(span)

        return ExecutionContext(
            trace_id=self.trace_id,
            parent_span=span,
            depth=self.depth + 1,
            max_depth=self.max_depth,
            accumulated_context=self.accumulated_context.copy(),
            metadata={**self.metadata, "parent_agent": agent_slug},
        )

    def add_context(self, key: str, value: Any) -> None:
        """Add context that child agents can access."""
        self.accumulated_context.append({
            "key": key,
            "value": value,
            "from_agent": self.parent_span.agent_slug if self.parent_span else "root",
            "depth": self.depth,
        })

    @property
    def can_recurse(self) -> bool:
        return self.depth < self.max_depth


# ---------------------------------------------------------------------------
# Delegation Rules — Which agents can spawn which sub-agents
# ---------------------------------------------------------------------------

DELEGATION_MAP: dict[str, list[dict]] = {
    "administrador": [
        {"to": "pricing", "for": "NAV calculation requires PDD/mark-to-market"},
        {"to": "compliance", "for": "Quota issuance requires compliance check"},
        {"to": "reporting", "for": "Generate regulatory filings"},
    ],
    "compliance": [
        {"to": "due_diligence", "for": "KYC/AML checks on new entities"},
        {"to": "pricing", "for": "PDD validation for covenant checks"},
        {"to": "regulatory_watch", "for": "Check latest regulatory changes"},
    ],
    "due_diligence": [
        {"to": "compliance", "for": "PLD/AML screening after scoring"},
    ],
    "gestor": [
        {"to": "pricing", "for": "Mark-to-market for portfolio valuation"},
        {"to": "compliance", "for": "Concentration check before allocation"},
        {"to": "custodiante", "for": "Verify collateral availability"},
    ],
    "pricing": [
        {"to": "administrador", "for": "Fetch current NAV for pricing models"},
    ],
    "reporting": [
        {"to": "administrador", "for": "Fetch NAV and quota data"},
        {"to": "pricing", "for": "Fetch PDD and aging data"},
        {"to": "compliance", "for": "Fetch compliance status"},
    ],
    "investor_relations": [
        {"to": "reporting", "for": "Generate performance reports"},
        {"to": "administrador", "for": "Fetch quota prices"},
    ],
}


# ---------------------------------------------------------------------------
# Recursive Dispatcher — Agents spawning agents with context flow
# ---------------------------------------------------------------------------

class RecursiveDispatcher:
    """Orchestrates multi-agent execution with recursive sub-agent spawning.
    
    Unlike the basic AgentDispatcher (single-hop routing), this dispatcher
    allows agents to delegate sub-tasks to other agents, building execution
    trees. Context flows parent → child, and results aggregate child → parent.
    
    This is the core of the AIOS: agents that understand when they need
    help from other specialists, and can spawn them autonomously.
    """

    def __init__(self, registry: AgentRegistry, llm_fn: Optional[Callable] = None):
        self.registry = registry
        self.basic_dispatcher = AgentDispatcher(registry)
        self.llm_fn = llm_fn
        self._traces: list[ExecutionSpan] = []

    def dispatch(
        self,
        task: str,
        context: Optional[ExecutionContext] = None,
        agent_slug: Optional[str] = None,
    ) -> dict:
        """Dispatch a task with recursive sub-agent support.
        
        Args:
            task: The task/query to execute
            context: Execution context (created automatically for root calls)
            agent_slug: Force dispatch to a specific agent (otherwise auto-route)
        
        Returns:
            Dict with result, trace, and metrics
        """
        # Create root context if not provided
        if context is None:
            root_span = ExecutionSpan(
                agent_slug="orchestrator",
                task=task,
                depth=0,
                start_time=time.time(),
                status="running",
            )
            context = ExecutionContext(parent_span=root_span)

        # Route to agent
        if agent_slug:
            agent = self.registry.get(agent_slug)
            confidence = 0.95
        else:
            agent, confidence = self.basic_dispatcher.route(task)

        if not agent:
            return {"error": "No agent found", "task": task}

        # Create execution span
        child_ctx = context.child(agent.slug, task)
        span = child_ctx.parent_span

        # Check delegation rules — does this agent need sub-agents?
        delegations = DELEGATION_MAP.get(agent.slug, [])
        sub_results = []

        if delegations and context.can_recurse:
            # Determine which delegations are relevant for this task
            for delegation in delegations:
                target_slug = delegation["to"]
                reason = delegation["for"]

                # Simple relevance check: does the reason relate to the task?
                task_lower = task.lower()
                reason_lower = reason.lower()
                reason_keywords = set(reason_lower.split())
                task_keywords = set(task_lower.split())
                overlap = reason_keywords & task_keywords

                if len(overlap) >= 2 or any(kw in task_lower for kw in reason_lower.split()[:3]):
                    # Spawn sub-agent
                    sub_task = f"[delegated from {agent.slug}] {reason}: {task}"
                    sub_result = self.dispatch(
                        task=sub_task,
                        context=child_ctx,
                        agent_slug=target_slug,
                    )
                    sub_results.append({
                        "from": agent.slug,
                        "to": target_slug,
                        "reason": reason,
                        "result": sub_result,
                    })
                    # Add sub-agent result to context for parent
                    child_ctx.add_context(
                        key=f"sub_result_{target_slug}",
                        value=sub_result.get("result", ""),
                    )

        # Execute the agent's own task (with accumulated context)
        agent_result = self._execute_agent(agent, task, child_ctx, confidence)

        # Complete span
        span.status = "completed"
        span.end_time = time.time()
        span.result = agent_result

        # Store root trace
        if context.depth == 0:
            root_span = context.parent_span
            root_span.status = "completed"
            root_span.end_time = time.time()
            self._traces.append(root_span)

        return {
            "agent": agent.slug,
            "confidence": confidence,
            "result": agent_result,
            "sub_results": sub_results,
            "depth": child_ctx.depth,
            "duration_ms": span.duration_ms,
            "context_items": len(child_ctx.accumulated_context),
            "trace": span.to_dict() if context.depth <= 1 else None,
        }

    def _execute_agent(
        self,
        agent: AgentSOUL,
        task: str,
        context: ExecutionContext,
        confidence: float,
    ) -> str:
        """Execute an agent with its accumulated context."""
        # Build prompt with inherited context
        context_block = ""
        if context.accumulated_context:
            context_items = "\n".join(
                f"- [{item['from_agent']}@depth={item['depth']}] {item['key']}: {item['value']}"
                for item in context.accumulated_context[-5:]  # Last 5 context items
            )
            context_block = f"\n\n## Inherited Context\n{context_items}"

        prompt = (
            f"You are {agent.name} ({agent.slug}).\n"
            f"Role: {agent.role}\n"
            f"Domains: {', '.join(agent.domains)}\n"
            f"Task: {task}\n"
            f"Confidence: {confidence:.2f}\n"
            f"Depth: {context.depth}/{context.max_depth}"
            f"{context_block}"
        )

        # If LLM function is available, use it
        if self.llm_fn:
            try:
                return self.llm_fn(prompt, agent.system_prompt)
            except Exception as e:
                return f"[{agent.slug}] Error: {e}"

        # Without LLM, return structured response
        return (
            f"[{agent.slug}] Processed task at depth={context.depth}. "
            f"Domains: {', '.join(agent.domains)}. "
            f"Context items inherited: {len(context.accumulated_context)}."
        )

    @property
    def traces(self) -> list[dict]:
        """Get all execution traces as dicts."""
        return [t.to_dict() for t in self._traces]

    @property
    def stats(self) -> dict:
        """Aggregate execution statistics."""
        if not self._traces:
            return {"total_executions": 0}

        total_spans = sum(t.total_spans for t in self._traces)
        max_depth = max(t.max_depth for t in self._traces)
        avg_duration = sum(t.duration_ms for t in self._traces) / len(self._traces)

        return {
            "total_executions": len(self._traces),
            "total_spans": total_spans,
            "max_depth": max_depth,
            "avg_duration_ms": round(avg_duration, 1),
            "agents_used": list(set(
                t.agent_slug for t in self._traces
            )),
        }
