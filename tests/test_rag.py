"""Tests for RAGPipeline and BM25Index integration."""
from __future__ import annotations

import pytest
from core.rag.pipeline import RAGPipeline


def test_rag_ingest_chunk_count(sample_config, sample_corpus):
    """Ingesting a 3-file corpus yields at least one chunk per file."""
    pipeline = RAGPipeline(sample_config)
    stats = pipeline.ingest(str(sample_corpus))
    assert stats["chunks"] > 0
    assert stats["files"] == 3


def test_rag_retrieve_returns_chunks(sample_config, sample_corpus):
    """Retrieve returns Chunk objects after ingestion."""
    pipeline = RAGPipeline(sample_config)
    pipeline.ingest(str(sample_corpus))
    chunks = pipeline.retrieve("concentração por cedente")
    assert len(chunks) > 0


def test_rag_chunk_scores_between_zero_and_one(sample_config, sample_corpus):
    """After normalisation all chunk scores must be in [0, 1]."""
    pipeline = RAGPipeline(sample_config)
    pipeline.ingest(str(sample_corpus))
    chunks = pipeline.retrieve("provisão para devedores duvidosos")
    for chunk in chunks:
        assert 0.0 <= chunk.score <= 1.0, f"score {chunk.score} out of range"


def test_rag_chunks_have_source_metadata(sample_config, sample_corpus):
    """Every returned Chunk must carry a non-empty source field."""
    pipeline = RAGPipeline(sample_config)
    pipeline.ingest(str(sample_corpus))
    chunks = pipeline.retrieve("custodiante")
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.source, "Chunk.source must not be empty"


def test_rag_query_no_llm_returns_answer(sample_config, sample_corpus):
    """query() without an llm_fn returns an Answer with chunks populated."""
    pipeline = RAGPipeline(sample_config)
    pipeline.ingest(str(sample_corpus))
    answer = pipeline.query("O que é sobrecolateralização?")
    assert answer is not None
    assert len(answer.chunks) > 0


def test_rag_status_reflects_indexed_count(sample_config, sample_corpus):
    """status() chunks_indexed matches actual ingest stats."""
    pipeline = RAGPipeline(sample_config)
    stats = pipeline.ingest(str(sample_corpus))
    status = pipeline.status()
    assert status["chunks_indexed"] == stats["chunks"]


def test_rag_empty_corpus_raises(sample_config, tmp_dir):
    """Ingesting an empty directory raises ValueError."""
    empty_dir = tmp_dir / "empty"
    empty_dir.mkdir()
    pipeline = RAGPipeline(sample_config)
    with pytest.raises(ValueError):
        pipeline.ingest(str(empty_dir))


def test_rag_missing_corpus_raises(sample_config):
    """Ingesting a non-existent path raises FileNotFoundError."""
    pipeline = RAGPipeline(sample_config)
    with pytest.raises(FileNotFoundError):
        pipeline.ingest("/tmp/absolutely_nonexistent_corpus_xyz")
