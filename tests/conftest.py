"""Shared fixtures for PAGANINI tests."""
import pytest
import tempfile
from pathlib import Path

@pytest.fixture
def tmp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)

@pytest.fixture
def sample_config(tmp_dir):
    return {
        "data_dir": str(tmp_dir / "data"),
        "runtime": {"engine": "python", "moltis_config": "moltis.yaml", "gateway_url": "http://127.0.0.1:30000"},
        "rag": {"chunk_size": 384, "chunk_overlap": 64, "respect_headers": True, "top_k": 5},
        "provider": {"type": "google", "model": "gemini/gemini-2.5-flash", "api_key": "test"},
        "metaclaw": {"enabled": False, "skills_dir": str(tmp_dir / "skills"), "mode": "skills_only"},
        "guardrails": {"eligibility": True, "concentration": True, "covenant": True, "pld_aml": True, "compliance": True, "risk_assessment": True},
        "fund_id": "test-fund",
    }

@pytest.fixture
def sample_corpus(tmp_dir):
    corpus = tmp_dir / "corpus"
    corpus.mkdir()
    (corpus / "test1.md").write_text("# Artigo 45\n\nO limite de concentração por cedente é de 10%.\n\n## Exceções\n\nFIDCs mono-cedente podem ter 100%.")
    (corpus / "test2.md").write_text("# PDD\n\n## Cálculo\n\nA provisão para devedores duvidosos segue IFRS9.\n\n## Staging\n\nStage 1: performing. Stage 2: underperforming. Stage 3: non-performing.")
    (corpus / "test3.md").write_text("# Custodiante\n\nO custodiante é responsável pela guarda dos documentos e reconciliação.\n\n## Sobrecolateralização\n\nVerificação diária do nível de sobrecolateralização.")
    return corpus
