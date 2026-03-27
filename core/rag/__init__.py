"""core.rag — Paganini RAG pipeline and advanced retrieval modules.

Public API
----------
The high-level entry point is :class:`RAGPipeline`.  Import everything
you need from this package::

    from core.rag import (
        RAGPipeline,
        Chunk,
        Answer,
        # --- domain config ---
        DomainConfig,
        load_domain,
        GENERIC_DOMAIN,
        # --- advanced modules ---
        inject_headers_into_chunks,
        build_contextual_header,
        extract_document_info,
        DocumentInfo,
        MultiQueryRewriter,
        SYNONYM_MAP,
        MetadataFilter,
        FilterCriteria,
        ContextCompressor,
        BaseReranker,
        KeywordReranker,
        CrossEncoderReranker,
        get_reranker,
        GraphRAG,
        Entity,
        is_multi_hop_query,
    )
"""

from core.rag.domain import (
    DomainConfig,
    load_domain,
    GENERIC_DOMAIN,
)

from core.rag.pipeline import RAGPipeline, Chunk, Answer

from core.rag.chunk_headers import (
    DocumentInfo,
    extract_document_info,
    build_contextual_header,
    annotate_chunk,
    inject_headers_into_chunks,
)

from core.rag.multi_query import (
    MultiQueryRewriter,
    SYNONYM_MAP,
    PERSPECTIVE_TEMPLATES,
)

from core.rag.metadata_filter import (
    FilterCriteria,
    MetadataFilter,
)

from core.rag.compressor import (
    ContextCompressor,
)

from core.rag.reranker import (
    BaseReranker,
    KeywordReranker,
    CrossEncoderReranker,
    get_reranker,
)

from core.rag.graph_rag import (
    GraphRAG,
    Entity,
    EntityType,
    is_multi_hop_query,
    FUNDO,
    REGULACAO,
    CEDENTE,
    COTISTA,
    INDICADOR,
    AGENTE,
)

__all__ = [
    # Domain config
    "DomainConfig",
    "load_domain",
    "GENERIC_DOMAIN",
    # Core pipeline
    "RAGPipeline",
    "Chunk",
    "Answer",
    # Chunk headers
    "DocumentInfo",
    "extract_document_info",
    "build_contextual_header",
    "annotate_chunk",
    "inject_headers_into_chunks",
    # Multi-query
    "MultiQueryRewriter",
    "SYNONYM_MAP",
    "PERSPECTIVE_TEMPLATES",
    # Metadata filter
    "FilterCriteria",
    "MetadataFilter",
    # Compressor
    "ContextCompressor",
    # Reranker
    "BaseReranker",
    "KeywordReranker",
    "CrossEncoderReranker",
    "get_reranker",
    # Graph RAG
    "GraphRAG",
    "Entity",
    "EntityType",
    "is_multi_hop_query",
    "FUNDO",
    "REGULACAO",
    "CEDENTE",
    "COTISTA",
    "INDICADOR",
    "AGENTE",
]
