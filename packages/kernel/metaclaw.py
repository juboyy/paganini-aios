"""PAGANINI MetaClaw Adapter — Skill evolution proxy.

MetaClaw sits between PAGANINI and the LLM provider:
1. Intercepts queries
2. Matches relevant skills from the skill store
3. Injects skill context into prompts
4. Learns from successful interactions → generates new skills

Modes:
- skills_only (default): Pattern matching, no ML
- rl: Reinforcement learning via GRPO (requires torch)
- opd: Online Policy Distillation (teacher-student)
"""

import json
import time
from pathlib import Path
from typing import Optional


class Skill:
    """A learned behavior pattern."""
    def __init__(self, name: str, pattern: str, response_template: str,
                 domain: str = "fidc", score: float = 0.5, uses: int = 0):
        self.name = name
        self.pattern = pattern
        self.response_template = response_template
        self.domain = domain
        self.score = score
        self.uses = uses

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "pattern": self.pattern,
            "response_template": self.response_template,
            "domain": self.domain,
            "score": self.score,
            "uses": self.uses,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Skill":
        return cls(**d)


class MetaClawProxy:
    """Skill evolution proxy — enriches queries with learned patterns."""

    def __init__(self, config: dict):
        mc_config = config.get("metaclaw", {})
        self.enabled = mc_config.get("enabled", True)
        self.skills_dir = Path(mc_config.get("skills_dir", "skills/"))
        self.auto_evolve = mc_config.get("auto_evolve", True)
        self.max_skills = mc_config.get("max_skills", 500)
        self.mode = mc_config.get("mode", "skills_only")
        self.skills: list[Skill] = []

        if self.enabled:
            self._load_skills()

    def _load_skills(self):
        """Load skills from filesystem."""
        if not self.skills_dir.exists():
            self.skills_dir.mkdir(parents=True, exist_ok=True)
            return

        for f in self.skills_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                self.skills.append(Skill.from_dict(data))
            except Exception:
                continue

    def enrich_query(self, query: str, context: str) -> str:
        """Enrich the LLM prompt with relevant skills.
        
        Called BEFORE the LLM call. Injects skill knowledge into context.
        """
        if not self.enabled or not self.skills:
            return context

        # Simple keyword matching (skills_only mode)
        matched = self._match_skills(query)

        if not matched:
            return context

        skill_context = "\n\n--- Conhecimento Especializado (MetaClaw) ---\n"
        for skill in matched[:3]:  # Max 3 skills per query
            skill_context += f"\n[Skill: {skill.name} | Score: {skill.score:.2f}]\n"
            skill_context += f"{skill.response_template}\n"
            skill.uses += 1

        return context + skill_context

    def learn_from_interaction(self, query: str, response: str,
                               chunks_used: list, confidence: float):
        """Post-interaction learning — potentially generates new skills.
        
        Called AFTER successful LLM response. Decides if the interaction
        pattern is worth persisting as a reusable skill.
        """
        if not self.enabled or not self.auto_evolve:
            return

        if confidence < 0.7:
            return  # Don't learn from low-confidence responses

        if len(self.skills) >= self.max_skills:
            self._prune_skills()

        # Check if this pattern already exists
        for skill in self.skills:
            if self._similarity(query, skill.pattern) > 0.8:
                skill.score = min(1.0, skill.score + 0.05)  # Reinforce
                self._save_skill(skill)
                return

        # New pattern detected — create skill candidate
        # In skills_only mode, we just save the pattern
        # In rl/opd modes, this would trigger training
        if self.mode == "skills_only":
            self._create_skill_candidate(query, response, chunks_used)

    def _match_skills(self, query: str) -> list[Skill]:
        """Match query against skill patterns."""
        query_lower = query.lower()
        scored = []
        for skill in self.skills:
            # Simple word overlap scoring
            pattern_words = set(skill.pattern.lower().split())
            query_words = set(query_lower.split())
            overlap = len(pattern_words & query_words)
            if overlap > 0:
                match_score = overlap / max(len(pattern_words), 1) * skill.score
                scored.append((match_score, skill))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored if _ > 0.2]

    def _create_skill_candidate(self, query: str, response: str, chunks: list):
        """Create a new skill from a successful interaction."""
        name = f"skill_{int(time.time())}"
        skill = Skill(
            name=name,
            pattern=query,
            response_template=response[:500],  # Truncate
            domain="fidc",
            score=0.5,
            uses=1,
        )
        self.skills.append(skill)
        self._save_skill(skill)

    def _save_skill(self, skill: Skill):
        """Persist skill to filesystem."""
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        path = self.skills_dir / f"{skill.name}.json"
        path.write_text(json.dumps(skill.to_dict(), indent=2, ensure_ascii=False))

    def _prune_skills(self):
        """Remove lowest-scoring skills when at capacity."""
        self.skills.sort(key=lambda s: s.score * (1 + s.uses * 0.1), reverse=True)
        to_remove = self.skills[self.max_skills:]
        self.skills = self.skills[:self.max_skills]
        for skill in to_remove:
            path = self.skills_dir / f"{skill.name}.json"
            path.unlink(missing_ok=True)

    def _similarity(self, a: str, b: str) -> float:
        """Simple Jaccard similarity."""
        a_words = set(a.lower().split())
        b_words = set(b.lower().split())
        if not a_words or not b_words:
            return 0.0
        return len(a_words & b_words) / len(a_words | b_words)

    def status(self) -> dict:
        return {
            "enabled": self.enabled,
            "mode": self.mode,
            "skills_count": len(self.skills),
            "max_skills": self.max_skills,
            "auto_evolve": self.auto_evolve,
            "skills_dir": str(self.skills_dir),
        }
