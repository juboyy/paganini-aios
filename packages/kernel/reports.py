"""PAGANINI Reports — QMD-based financial report generation.

Generates regulatory reports from fund data + corpus knowledge.
Templates are markdown-based, rendered via the LLM.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

REPORT_TEMPLATES = {
    "informe-mensal": {
        "name": "Informe Mensal",
        "description": "Monthly fund report per CVM requirements",
        "sections": [
            "resumo",
            "composição_carteira",
            "inadimplência",
            "covenants",
            "movimentação_cotas",
            "rentabilidade",
            "fatos_relevantes",
        ],
    },
    "cadoc-3040": {
        "name": "CADOC 3040",
        "description": "Central bank credit portfolio report",
        "sections": [
            "identificação_fundo",
            "carteira_crédito",
            "cedentes",
            "devedores",
            "garantias",
            "provisão",
        ],
    },
    "pdd-report": {
        "name": "Relatório PDD",
        "description": "Expected credit loss report per IFRS9",
        "sections": [
            "resumo_pdd",
            "staging",
            "variação_período",
            "análise_setorial",
            "projeções",
        ],
    },
    "risk-report": {
        "name": "Relatório de Riscos",
        "description": "Comprehensive risk assessment",
        "sections": [
            "risco_crédito",
            "risco_mercado",
            "risco_liquidez",
            "risco_operacional",
            "stress_testing",
        ],
    },
    "covenant-report": {
        "name": "Relatório de Covenants",
        "description": "Covenant compliance status",
        "sections": ["status_covenants", "métricas", "projeções", "alertas"],
    },
}


class ReportGenerator:
    def __init__(self, config: dict):
        self.config = config
        self.output_dir = Path(config.get("data_dir", "runtime/data")) / "reports"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def list_templates(self) -> list[dict]:
        return [{"id": k, **v} for k, v in REPORT_TEMPLATES.items()]

    def generate(
        self, template_id: str, fund_id: str = "default", llm_fn=None, rag_pipeline=None
    ) -> dict:
        if template_id not in REPORT_TEMPLATES:
            return {"status": "error", "message": f"Template '{template_id}' not found"}

        template = REPORT_TEMPLATES[template_id]
        now = datetime.now(timezone.utc)

        # Build report skeleton
        report_lines = [
            f"# {template['name']}",
            f"**Fundo**: {fund_id}",
            f"**Data**: {now.strftime('%d/%m/%Y %H:%M UTC')}",
            "**Gerado por**: PAGANINI AIOS v0.1.0",
            "",
        ]

        for section in template["sections"]:
            section_title = section.replace("_", " ").title()
            report_lines.append(f"## {section_title}")

            if llm_fn and rag_pipeline:
                # Query RAG for section content
                query = f"{template['name']}: {section_title} para o fundo {fund_id}"
                chunks = rag_pipeline.retrieve(query, top_k=3)
                if chunks:
                    context = "\n".join(c.text[:500] for c in chunks)
                    prompt = (
                        f"Gere a seção '{section_title}' de um {template['name']} "
                        f"com base no contexto:\n{context}"
                    )
                    try:
                        content = llm_fn(
                            "Você é um especialista em relatórios regulatórios de FIDC.",
                            prompt,
                        )
                        report_lines.append(content)
                    except Exception:
                        report_lines.append(
                            f"*Seção pendente — dados do fundo {fund_id} não disponíveis.*"
                        )
                else:
                    report_lines.append("*Sem dados no corpus para esta seção.*")
            else:
                report_lines.append(
                    "*Seção pendente — execute com --fund e API key configurada.*"
                )

            report_lines.append("")

        # Save report
        report_text = "\n".join(report_lines)
        filename = f"{template_id}_{fund_id}_{now.strftime('%Y%m%d_%H%M%S')}.md"
        report_path = self.output_dir / filename
        report_path.write_text(report_text, encoding="utf-8")

        return {
            "status": "ok",
            "template": template_id,
            "fund": fund_id,
            "path": str(report_path),
            "sections": len(template["sections"]),
            "timestamp": now.isoformat(),
        }
