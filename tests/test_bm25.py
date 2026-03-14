"""Tests for BM25Index — sparse retrieval engine."""
from __future__ import annotations

import pytest
from packages.rag.bm25 import BM25Index, _tokenize, _strip_accents


DOCS = [
    "O limite de concentração por cedente é de dez por cento conforme regulamento FIDC.",
    "A provisão para devedores duvidosos segue metodologia IFRS9 e critérios de staging.",
    "O custodiante é responsável pela guarda dos documentos originais e reconciliação diária.",
]
IDS = ["doc-concentration", "doc-pdd", "doc-custodian"]
METAS = [
    {"source": "artigo45.md", "section": "Concentração"},
    {"source": "pdd.md", "section": "Cálculo"},
    {"source": "custodiante.md", "section": "Responsabilidades"},
]


def test_index_three_docs_and_search_returns_ranked_results():
    """Indexing 3 docs and searching returns results in relevance order."""
    idx = BM25Index()
    idx.index(DOCS, IDS, METAS)
    results = idx.search("concentração cedente FIDC", top_k=3)
    assert len(results) > 0
    # The concentration doc should rank first
    assert results[0]["id"] == "doc-concentration"


def test_search_ranking_order_makes_sense():
    """Searching for PDD-related terms ranks the PDD doc highest."""
    idx = BM25Index()
    idx.index(DOCS, IDS, METAS)
    results = idx.search("provisão devedores duvidosos IFRS9", top_k=3)
    assert len(results) > 0
    assert results[0]["id"] == "doc-pdd"


def test_portuguese_tokenizer_strips_accents():
    """_strip_accents removes diacritics from Portuguese characters."""
    assert _strip_accents("concentração") == "concentracao"
    assert _strip_accents("provisão") == "provisao"
    assert _strip_accents("custodiante") == "custodiante"  # no accents


def test_portuguese_tokenizer_removes_stopwords():
    """_tokenize strips Portuguese stopwords from token list."""
    tokens = _tokenize("O limite de concentração por cedente é de dez")
    # 'o', 'de', 'por', 'é' are all stopwords — none should appear
    assert "o" not in tokens
    assert "de" not in tokens
    assert "por" not in tokens
    # 'limite' and 'concentracao' (accent stripped) should be present
    assert "limite" in tokens
    assert "concentracao" in tokens


def test_bm25_save_and_load_persistence(tmp_dir):
    """BM25Index saves to disk and reloads with same results."""
    path = tmp_dir / "bm25.json"
    idx1 = BM25Index(index_path=path)
    idx1.index(DOCS, IDS, METAS)
    results_before = idx1.search("custodiante guarda reconciliação", top_k=3)

    # Load fresh instance from same path
    idx2 = BM25Index(index_path=path)
    results_after = idx2.search("custodiante guarda reconciliação", top_k=3)

    assert len(results_after) > 0
    assert results_after[0]["id"] == results_before[0]["id"]


def test_bm25_len_reflects_indexed_count():
    """len(idx) returns the number of indexed documents."""
    idx = BM25Index()
    assert len(idx) == 0
    idx.index(DOCS, IDS, METAS)
    assert len(idx) == 3


def test_bm25_search_empty_index_returns_empty_list():
    """Searching an empty index returns an empty list (no crash)."""
    idx = BM25Index()
    results = idx.search("qualquer coisa")
    assert results == []


def test_bm25_search_result_has_required_keys():
    """Each search result dict contains 'id', 'score', and 'metadata' keys."""
    idx = BM25Index()
    idx.index(DOCS, IDS, METAS)
    results = idx.search("custodiante")
    assert len(results) > 0
    for r in results:
        assert "id" in r
        assert "score" in r
        assert "metadata" in r
