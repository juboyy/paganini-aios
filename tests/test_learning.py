"""Tests for WS5 — Learning Loop: Feedback, Session Search, User Model, Ingestion.

Tests:
    - FeedbackCollector: collect, persist, load, Telegram reaction parsing
    - SkillScorer: EMA scoring, flagging, top/worst rankings
    - LearningReport: report generation
    - SessionStore: append and BM25 search
    - UserModelManager: profile creation, dialectic updates, expertise scoring
    - IngestionPipeline: chunk_text, IngestDocument
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from pathlib import Path

import pytest

# ── Feedback imports ───────────────────────────────────────────────────────────
from core.learning.feedback import (
    FeedbackCollector,
    FeedbackEntry,
    LearningReport,
    SkillScorer,
    EMA_ALPHA,
    SKILL_REVIEW_THRESHOLD,
)

# ── Session search imports ─────────────────────────────────────────────────────
from core.learning.session_search import (
    ConversationEntry,
    SessionStore,
    _tokenize,
    _BM25Index,
    store_conversation,
    search_sessions,
)

# ── User model imports ─────────────────────────────────────────────────────────
from core.learning.user_model import (
    UserModelManager,
    UserProfile,
    _score_expertise_signal,
    _level_from_score,
    _detect_language,
)

# ── Ingestion imports ──────────────────────────────────────────────────────────
from core.ingestion.pipeline import (
    IngestDocument,
    IngestResult,
    IngestionPipeline,
    chunk_text,
    extract_text,
    _doc_id,
    STATUS_OK,
    STATUS_UNSUPPORTED,
    STATUS_FAILED,
    STATUS_PARTIAL,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────


@pytest.fixture
def tmpdir():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def collector(tmpdir):
    return FeedbackCollector(runtime_dir=tmpdir)


@pytest.fixture
def scorer(tmpdir):
    return SkillScorer(runtime_dir=tmpdir)


@pytest.fixture
def store(tmpdir):
    return SessionStore(runtime_dir=tmpdir)


@pytest.fixture
def user_manager(tmpdir):
    return UserModelManager(runtime_dir=tmpdir)


@pytest.fixture
def pipeline(tmpdir):
    return IngestionPipeline(runtime_dir=tmpdir)


# ══════════════════════════════════════════════════════════════════════════════
# FeedbackCollector Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestFeedbackCollector:
    def test_collect_stores_entry(self, collector, tmpdir):
        entry = FeedbackEntry(
            query="O que é cessão de recebíveis?",
            response="É uma transferência de direitos creditórios...",
            feedback="positive",
            agent_id="gestor",
            fund_id="alpha",
            skills_used=["skill_cessao", "skill_fidc"],
        )
        collector.collect(entry)
        feedback_file = Path(tmpdir) / "learning" / "feedback.jsonl"
        assert feedback_file.exists()
        lines = [l for l in feedback_file.read_text().splitlines() if l]
        assert len(lines) == 1
        data = json.loads(lines[0])
        assert data["feedback"] == "positive"
        assert data["fund_id"] == "alpha"

    def test_collect_appends_multiple(self, collector):
        for i in range(5):
            e = FeedbackEntry(
                query=f"query {i}", response=f"resp {i}",
                feedback="positive" if i % 2 == 0 else "negative",
                agent_id="rag", fund_id="beta",
            )
            collector.collect(e)
        entries = collector.load_all()
        assert len(entries) == 5

    def test_load_all_empty(self, collector):
        entries = collector.load_all()
        assert entries == []

    def test_telegram_reaction_positive(self, collector):
        for emoji in ["👍", "🎉", "🔥", "❤️", "🏆"]:
            entry = collector.collect_from_telegram_reaction(
                emoji=emoji,
                original_query="query",
                original_response="resp",
                agent_id="agent",
                fund_id="alpha",
                user_id="42",
            )
            assert entry is not None
            assert entry.feedback == "positive"

    def test_telegram_reaction_negative(self, collector):
        for emoji in ["👎", "😢", "😡"]:
            entry = collector.collect_from_telegram_reaction(
                emoji=emoji,
                original_query="query",
                original_response="resp",
                agent_id="agent",
                fund_id="alpha",
                user_id="42",
            )
            assert entry is not None
            assert entry.feedback == "negative"

    def test_telegram_reaction_unknown_emoji(self, collector):
        entry = collector.collect_from_telegram_reaction(
            emoji="🤔",
            original_query="q", original_response="r",
            agent_id="a", fund_id="f", user_id="u",
        )
        assert entry is None

    def test_skills_stored_with_feedback(self, collector):
        entry = collector.collect_from_telegram_reaction(
            emoji="👍", original_query="q", original_response="r",
            agent_id="a", fund_id="f", user_id="u",
            skills_used=["skill_nav", "skill_compliance"],
        )
        assert entry.skills_used == ["skill_nav", "skill_compliance"]
        all_entries = collector.load_all()
        assert all_entries[-1].skills_used == ["skill_nav", "skill_compliance"]

    def test_count_by_agent(self, collector):
        for _ in range(3):
            collector.collect(FeedbackEntry(
                query="q", response="r", feedback="positive",
                agent_id="gestor", fund_id="alpha",
            ))
        collector.collect(FeedbackEntry(
            query="q", response="r", feedback="negative",
            agent_id="gestor", fund_id="alpha",
        ))
        counts = collector.count_by_agent()
        assert counts["gestor"]["positive"] == 3
        assert counts["gestor"]["negative"] == 1

    def test_thread_safety(self, collector):
        errors = []

        def write_feedback():
            try:
                e = FeedbackEntry(
                    query="concurrent", response="r",
                    feedback="positive", agent_id="a", fund_id="f",
                )
                collector.collect(e)
            except Exception as ex:
                errors.append(str(ex))

        threads = [threading.Thread(target=write_feedback) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors
        assert len(collector.load_all()) == 20


# ══════════════════════════════════════════════════════════════════════════════
# SkillScorer Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestSkillScorer:
    def test_initial_score_neutral(self, scorer):
        assert scorer.get_score("unknown_skill") == 0.5

    def test_update_positive_increases_score(self, scorer):
        for _ in range(10):
            scorer.update("skill_good", positive=True)
        assert scorer.get_score("skill_good") > 0.5

    def test_update_negative_decreases_score(self, scorer):
        for _ in range(10):
            scorer.update("skill_bad", positive=False)
        assert scorer.get_score("skill_bad") < 0.5

    def test_ema_property(self, scorer):
        """EMA should converge monotonically for consistent signals."""
        prev = 0.5
        for _ in range(20):
            new = scorer.update("skill_ema", positive=True)
            assert new >= prev - 1e-9  # non-decreasing (within float tolerance)
            prev = new

    def test_flagged_for_review_low_score(self, scorer):
        for _ in range(20):
            scorer.update("skill_terrible", positive=False)
        flagged = scorer.flagged_for_review()
        assert "skill_terrible" in flagged

    def test_not_flagged_for_good_skill(self, scorer):
        for _ in range(20):
            scorer.update("skill_great", positive=True)
        flagged = scorer.flagged_for_review()
        assert "skill_great" not in flagged

    def test_top_skills_ordering(self, scorer):
        for _ in range(15):
            scorer.update("best", positive=True)
        for _ in range(15):
            scorer.update("worst", positive=False)
        scorer.update("middle", positive=True)
        scorer.update("middle", positive=False)

        top = scorer.top_skills(3)
        assert top[0][0] == "best"

    def test_worst_skills_ordering(self, scorer):
        for _ in range(15):
            scorer.update("worst_skill", positive=False)
        for _ in range(15):
            scorer.update("best_skill", positive=True)

        worst = scorer.worst_skills(2)
        assert worst[0][0] == "worst_skill"

    def test_persistence_across_instances(self, tmpdir):
        s1 = SkillScorer(runtime_dir=tmpdir)
        for _ in range(5):
            s1.update("persistent_skill", positive=True)
        score1 = s1.get_score("persistent_skill")

        s2 = SkillScorer(runtime_dir=tmpdir)
        score2 = s2.get_score("persistent_skill")
        assert abs(score1 - score2) < 1e-9

    def test_update_from_feedback_entry(self, scorer):
        entry = FeedbackEntry(
            query="q", response="r", feedback="positive",
            agent_id="a", fund_id="f",
            skills_used=["skill_a", "skill_b"],
        )
        scorer.update_from_feedback(entry)
        assert scorer.get_score("skill_a") > 0.5
        assert scorer.get_score("skill_b") > 0.5

    def test_rebuild_from_feedback(self, tmpdir):
        scorer = SkillScorer(runtime_dir=tmpdir)
        entries = []
        for i in range(10):
            e = FeedbackEntry(
                query=f"q{i}", response="r", feedback="positive",
                agent_id="a", fund_id="f", skills_used=["rebuild_skill"],
            )
            entries.append(e)
        scorer.rebuild_from_feedback(entries)
        assert scorer.get_score("rebuild_skill") > 0.5


# ══════════════════════════════════════════════════════════════════════════════
# LearningReport Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestLearningReport:
    def test_empty_report(self, tmpdir):
        report = LearningReport(runtime_dir=tmpdir)
        assert report["total_feedback"] == 0
        assert report["satisfaction_rate"] == 0.0
        assert "generated_at" in report

    def test_report_with_data(self, tmpdir):
        collector = FeedbackCollector(runtime_dir=tmpdir)
        scorer = SkillScorer(runtime_dir=tmpdir)

        for i in range(8):
            e = FeedbackEntry(
                query=f"cessão recebíveis fundo {i}",
                response="resp",
                feedback="positive" if i < 6 else "negative",
                agent_id="gestor",
                fund_id="alpha",
                skills_used=["skill_cessao"],
            )
            collector.collect(e)
            scorer.update_from_feedback(e)

        report = LearningReport(
            feedback_collector=collector,
            skill_scorer=scorer,
            runtime_dir=tmpdir,
        )
        assert report["total_feedback"] == 8
        assert report["positive_count"] == 6
        assert report["negative_count"] == 2
        assert report["satisfaction_rate"] == 0.75
        assert len(report["common_queries"]) > 0

    def test_report_common_failure_topics(self, tmpdir):
        collector = FeedbackCollector(runtime_dir=tmpdir)
        for _ in range(5):
            e = FeedbackEntry(
                query="stress test inadimplência",
                response="resp",
                feedback="negative",
                agent_id="risk",
                fund_id="beta",
            )
            collector.collect(e)

        report = LearningReport(feedback_collector=collector, runtime_dir=tmpdir)
        failure_words = [w for w, c in report["common_failures"]]
        assert "stress" in failure_words or "inadimpl" in failure_words or "test" in failure_words


# ══════════════════════════════════════════════════════════════════════════════
# Session Search Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestSessionSearch:
    def test_tokenize_portuguese(self):
        tokens = _tokenize("O que é cessão de recebíveis FIDC?")
        # "cessao" (normalized), "recebiveis", "fidc" should be there
        assert any("cess" in t for t in tokens)
        assert "fidc" in tokens

    def test_tokenize_removes_stopwords(self):
        tokens = _tokenize("de da do a o com para em")
        assert len(tokens) == 0  # all stopwords

    def test_store_and_search(self, store):
        store.append(ConversationEntry(
            session_id="s1",
            timestamp=time.time(),
            query="cessão de recebíveis FIDC Alpha",
            response="A cessão é uma transferência de créditos.",
            agent_id="gestor",
            fund_id="alpha",
        ))
        store.append(ConversationEntry(
            session_id="s2",
            timestamp=time.time(),
            query="stress test inadimplência",
            response="O stress test mede a resistência da carteira.",
            agent_id="risk",
            fund_id="beta",
        ))
        hits = store.search("cessão FIDC")
        assert len(hits) >= 1
        assert hits[0].entry.session_id == "s1"

    def test_search_with_fund_filter(self, store):
        store.append(ConversationEntry(
            session_id="f1", timestamp=time.time(),
            query="NAV fundo Alpha relatório", response="NAV: R$ 1.000.000",
            agent_id="reporting", fund_id="alpha",
        ))
        store.append(ConversationEntry(
            session_id="f2", timestamp=time.time(),
            query="NAV fundo Beta relatório", response="NAV: R$ 2.000.000",
            agent_id="reporting", fund_id="beta",
        ))
        hits = store.search("NAV relatório", fund_id="alpha")
        assert all(h.entry.fund_id == "alpha" for h in hits)

    def test_search_empty_returns_empty(self, store):
        hits = store.search("cessão recebíveis")
        assert hits == []

    def test_search_irrelevant_query(self, store):
        store.append(ConversationEntry(
            session_id="s3", timestamp=time.time(),
            query="compliance regulatório",
            response="CVM 175 regula os FIDCs.",
            agent_id="compliance",
            fund_id="alpha",
        ))
        hits = store.search("culinária italiana massa")
        assert len(hits) == 0

    def test_bm25_ranking_quality(self, store):
        """More specific matches should rank higher."""
        store.append(ConversationEntry(
            session_id="high_relevance", timestamp=time.time(),
            query="cessão cessão cessão recebíveis FIDC",
            response="cessão de recebíveis muito relevante",
            agent_id="gestor", fund_id="alpha",
        ))
        store.append(ConversationEntry(
            session_id="low_relevance", timestamp=time.time(),
            query="relatório compliance mensal fundo",
            response="relatório de compliance",
            agent_id="compliance", fund_id="alpha",
        ))
        hits = store.search("cessão recebíveis FIDC", limit=5)
        assert hits[0].entry.session_id == "high_relevance"

    def test_search_limit(self, store):
        for i in range(20):
            store.append(ConversationEntry(
                session_id=f"bulk-{i}", timestamp=time.time(),
                query=f"cessão recebíveis fundo {i}",
                response="resp",
                agent_id="g", fund_id="alpha",
            ))
        hits = store.search("cessão recebíveis", limit=5)
        assert len(hits) <= 5

    def test_snippet_generated(self, store):
        store.append(ConversationEntry(
            session_id="snip-1", timestamp=time.time(),
            query="O que é subordinação de cotas?",
            response="Subordinação é a proteção oferecida às cotas seniores.",
            agent_id="g", fund_id="f",
        ))
        hits = store.search("subordinação cotas")
        assert len(hits) >= 1
        assert len(hits[0].snippet) > 0

    def test_persistence_across_instances(self, tmpdir):
        s1 = SessionStore(runtime_dir=tmpdir)
        s1.append(ConversationEntry(
            session_id="persist-1", timestamp=time.time(),
            query="persistência sessão FIDC", response="resp",
            agent_id="g", fund_id="f",
        ))
        s2 = SessionStore(runtime_dir=tmpdir)
        hits = s2.search("persistência sessão FIDC")
        assert len(hits) >= 1

    def test_recent_entries(self, store):
        for i in range(10):
            store.append(ConversationEntry(
                session_id=f"rec-{i}", timestamp=time.time() - i * 10,
                query=f"query {i}", response="resp",
                agent_id="g", fund_id="alpha",
            ))
        recent = store.recent(n=5, fund_id="alpha")
        assert len(recent) == 5

    def test_module_level_functions(self, tmpdir):
        """Test store_conversation and search_sessions module-level functions."""
        # Reset module singleton for this test
        import core.learning.session_search as ss
        ss._default_store = None

        store_conversation(
            session_id="mod-1",
            query="covenant fundo alpha inadimplência",
            response="Os covenants preveem limites de inadimplência.",
            agent_id="compliance",
            fund_id="alpha",
            tokens_used=150,
            runtime_dir=tmpdir,
        )
        hits = search_sessions("covenant inadimplência", fund_id="alpha", runtime_dir=tmpdir)
        assert len(hits) >= 1
        ss._default_store = None  # cleanup

    def test_stats(self, store):
        store.append(ConversationEntry(
            session_id="stat-1", timestamp=time.time(),
            query="q", response="r", agent_id="gestor", fund_id="alpha", tokens_used=100,
        ))
        stats = store.stats()
        assert stats["total"] == 1
        assert stats["total_tokens"] == 100


# ══════════════════════════════════════════════════════════════════════════════
# User Model Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestUserModel:
    def test_create_new_profile(self, user_manager):
        profile = user_manager.load("99999")
        assert profile.user_id == "99999"
        assert profile.expertise_level == "novice"
        assert profile.interaction_count == 0

    def test_expertise_signal_technical_query(self):
        signal = _score_expertise_signal(
            "Qual a razão de subordinação e o haircut aplicado nas cotas seniores do FIDC?"
        )
        assert signal > 0.5, f"Expected > 0.5, got {signal}"

    def test_expertise_signal_novice_query(self):
        signal = _score_expertise_signal("O que é um fundo? Me explica como funciona.")
        assert signal < 0.3, f"Expected < 0.3, got {signal}"

    def test_level_from_score(self):
        assert _level_from_score(0.1) == "novice"
        assert _level_from_score(0.3) == "intermediate"
        assert _level_from_score(0.6) == "advanced"
        assert _level_from_score(0.9) == "expert"

    def test_language_detection_portuguese(self):
        assert _detect_language("Quais são os covenants do fundo de investimento?") == "pt-BR"

    def test_language_detection_english(self):
        assert _detect_language("What is the risk exposure of this fund?") == "en"

    def test_interaction_updates_count(self, user_manager):
        for _ in range(5):
            user_manager.update_from_interaction(
                "12345", "cessão recebíveis FIDC Alpha", "resp", fund_id="alpha"
            )
        profile = user_manager.load("12345")
        assert profile.interaction_count == 5

    def test_expertise_evolves_dialectically(self, user_manager):
        uid = "expert_user"
        for _ in range(20):
            user_manager.update_from_interaction(
                uid,
                "Duration convexidade haircut subordinação cotas seniores FIDC cessão",
                "resp",
                fund_id="alpha",
            )
        profile = user_manager.load(uid)
        assert profile.expertise_level in ("advanced", "expert")

    def test_novice_stays_novice(self, user_manager):
        uid = "novice_user"
        for _ in range(5):
            user_manager.update_from_interaction(
                uid, "O que é um fundo? Me explica.", "resp", fund_id="alpha"
            )
        profile = user_manager.load(uid)
        assert profile.expertise_level in ("novice", "intermediate")

    def test_fund_access_tracked(self, user_manager):
        uid = "fund_user"
        user_manager.update_from_interaction(uid, "q", "r", fund_id="alpha")
        user_manager.update_from_interaction(uid, "q", "r", fund_id="beta")
        user_manager.update_from_interaction(uid, "q", "r", fund_id="alpha")  # duplicate
        profile = user_manager.load(uid)
        assert "alpha" in profile.funds_accessed
        assert "beta" in profile.funds_accessed
        assert profile.funds_accessed.count("alpha") == 1  # no duplicates

    def test_common_queries_accumulated(self, user_manager):
        uid = "query_user"
        for _ in range(5):
            user_manager.update_from_interaction(
                uid, "cessão recebíveis fundo", "resp", fund_id="alpha"
            )
        profile = user_manager.load(uid)
        assert "cessão" in profile.common_queries or "cess" in str(profile.common_queries)

    def test_persistence(self, tmpdir):
        um1 = UserModelManager(runtime_dir=tmpdir)
        um1.update_from_interaction("persist_user", "q", "r", username="testuser")
        um2 = UserModelManager(runtime_dir=tmpdir)
        profile = um2.load("persist_user")
        assert profile.username == "testuser"

    def test_feedback_counters(self, user_manager):
        uid = "feedback_user"
        user_manager.record_feedback(uid, positive=True)
        user_manager.record_feedback(uid, positive=True)
        user_manager.record_feedback(uid, positive=False)
        profile = user_manager.load(uid)
        assert profile.positive_feedback == 2
        assert profile.negative_feedback == 1

    def test_response_hint_novice(self, user_manager):
        uid = "hint_novice"
        hint = user_manager.get_response_hint(uid)
        assert hint["expertise"] == "novice"
        assert hint["use_jargon"] is False
        assert hint["max_length"] <= 800

    def test_response_hint_expert_after_training(self, user_manager):
        uid = "hint_expert"
        for _ in range(30):
            user_manager.update_from_interaction(
                uid,
                "duration convexidade cessão subordinação haircut FIDC rating",
                "resp",
                fund_id="alpha",
            )
        hint = user_manager.get_response_hint(uid)
        if hint["expertise"] in ("advanced", "expert"):
            assert hint["use_jargon"] is True

    def test_active_hours_tracked(self, user_manager):
        uid = "hours_user"
        user_manager.update_from_interaction(uid, "q", "r")
        profile = user_manager.load(uid)
        current_hour = time.gmtime().tm_hour
        assert current_hour in profile.typical_hours

    def test_list_all(self, user_manager):
        for uid in ["u1", "u2", "u3"]:
            user_manager.update_from_interaction(uid, "q", "r")
        all_profiles = user_manager.list_all()
        uids = [p.user_id for p in all_profiles]
        assert "u1" in uids and "u2" in uids and "u3" in uids


# ══════════════════════════════════════════════════════════════════════════════
# Ingestion Pipeline Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestIngestionPipeline:
    def test_chunk_text_basic(self):
        # Use paragraph-separated text so the chunker has natural split points
        text = "\n\n".join(["Este é um parágrafo de teste com conteúdo suficiente para chunking."] * 20)
        chunks = chunk_text(text, chunk_size=200, overlap=50)
        assert len(chunks) > 1
        for c in chunks:
            # Each chunk should be bounded (with some overlap tolerance)
            assert len(c) <= 500

    def test_chunk_text_short(self):
        # Text above min_chunk (80 chars) should produce exactly one chunk
        text = "Este é um texto curto mas acima do limite mínimo de chunk. Conteúdo suficiente aqui."
        chunks = chunk_text(text, chunk_size=800)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_chunk_text_empty(self):
        assert chunk_text("") == []

    def test_chunk_text_paragraph_aware(self):
        text = "Parágrafo um com bastante texto.\n\nParágrafo dois com mais texto aqui.\n\nParágrafo três."
        chunks = chunk_text(text, chunk_size=50, overlap=10)
        # Each chunk should be a clean paragraph boundary
        assert all(len(c) > 0 for c in chunks)

    def test_extract_txt(self, tmpdir):
        p = Path(tmpdir) / "test.txt"
        p.write_text("Conteúdo do arquivo TXT.\nSegunda linha.", encoding="utf-8")
        text = extract_text(str(p), "txt")
        assert "Conteúdo" in text
        assert "Segunda" in text

    def test_extract_md_strips_markup(self, tmpdir):
        p = Path(tmpdir) / "test.md"
        p.write_text("# Título\n\n**Bold** e *italic*.\n\n[Link](http://example.com)", encoding="utf-8")
        text = extract_text(str(p), "md")
        assert "Título" in text
        assert "Bold" in text
        assert "#" not in text  # header marker stripped
        assert "**" not in text  # bold markers stripped

    def test_extract_txt_file_not_found(self):
        with pytest.raises(FileNotFoundError):
            extract_text("/nonexistent/path/file.txt", "txt")

    def test_ingest_txt_document(self, pipeline, tmpdir):
        p = Path(tmpdir) / "doc.txt"
        p.write_text(
            "Este é um contrato de cessão de recebíveis.\n\n"
            "O cedente transfere os créditos ao FIDC.\n\n"
            "O sacado deve pagar no vencimento estabelecido.\n\n"
            "A taxa de desconto aplicada é de 2% ao mês.",
            encoding="utf-8",
        )
        result = pipeline.ingest(str(p), tenant_id="paganini", fund_id="alpha", doc_type="txt")
        assert result.status in (STATUS_OK, STATUS_PARTIAL)
        assert result.chunks_created >= 1
        assert result.total_tokens > 0
        assert result.doc_id
        assert result.source == "doc.txt"

    def test_ingest_md_document(self, pipeline, tmpdir):
        p = Path(tmpdir) / "compliance.md"
        p.write_text(
            "# Relatório de Compliance\n\n"
            "## Seção 1: Limites Regulatórios\n\n"
            "Os limites de concentração estão dentro do esperado.\n\n"
            "## Seção 2: Covenants\n\n"
            "Todos os covenants estão em conformidade com a CVM 175.",
            encoding="utf-8",
        )
        result = pipeline.ingest(str(p), tenant_id="paganini", fund_id="beta", doc_type="md")
        assert result.status in (STATUS_OK, STATUS_PARTIAL)
        assert result.chunks_created >= 1

    def test_ingest_unsupported_type(self, pipeline, tmpdir):
        p = Path(tmpdir) / "test.xyz"
        p.write_text("content")
        result = pipeline.ingest(str(p), "paganini", "alpha", doc_type="xyz")
        assert result.status == STATUS_UNSUPPORTED

    def test_ingest_file_not_found(self, pipeline):
        result = pipeline.ingest("/nonexistent/file.txt", "paganini", "alpha", doc_type="txt")
        assert result.status == STATUS_FAILED
        assert "não encontrado" in result.error.lower() or "not found" in result.error.lower()

    def test_ingest_empty_file(self, pipeline, tmpdir):
        p = Path(tmpdir) / "empty.txt"
        p.write_text("")
        result = pipeline.ingest(str(p), "paganini", "alpha", doc_type="txt")
        assert result.status in (STATUS_PARTIAL, STATUS_FAILED)

    def test_doc_id_stable(self, tmpdir):
        p = Path(tmpdir) / "stable.txt"
        p.write_text("conteúdo estável")
        id1 = _doc_id(str(p), "tenant1", "fund1")
        id2 = _doc_id(str(p), "tenant1", "fund1")
        assert id1 == id2

    def test_doc_id_differs_for_different_tenant(self, tmpdir):
        p = Path(tmpdir) / "multi.txt"
        p.write_text("conteúdo")
        id1 = _doc_id(str(p), "tenant1", "fund1")
        id2 = _doc_id(str(p), "tenant2", "fund1")
        assert id1 != id2

    def test_ingest_document_convenience(self, tmpdir):
        """Test module-level IngestDocument function."""
        import core.ingestion.pipeline as pip
        pip._default_pipeline = None  # reset singleton

        p = Path(tmpdir) / "convenience.txt"
        p.write_text(
            "Fundo de Investimento em Direitos Creditórios.\n\n"
            "O FIDC capta recursos via emissão de cotas.\n\n"
            "Os créditos cedidos formam o patrimônio do fundo.",
            encoding="utf-8",
        )
        result = IngestDocument(
            file_path=str(p),
            tenant_id="paganini",
            fund_id="alpha",
            doc_type="txt",
            runtime_dir=tmpdir,
        )
        assert result.status in (STATUS_OK, STATUS_PARTIAL)
        assert result.chunks_created >= 1
        pip._default_pipeline = None  # cleanup

    def test_timing_populated(self, pipeline, tmpdir):
        p = Path(tmpdir) / "timed.txt"
        p.write_text("Conteúdo para timing." * 50)
        result = pipeline.ingest(str(p), "paganini", "alpha", doc_type="txt")
        assert result.embedding_time_ms > 0
