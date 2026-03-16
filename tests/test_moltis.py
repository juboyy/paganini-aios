"""Tests for Moltis LLM abstraction."""

from core.moltis.llm import get_llm_fn


def test_get_llm_fn_returns_callable():
    """get_llm_fn should return a callable function."""
    fn = get_llm_fn({})
    assert callable(fn)


def test_get_llm_fn_with_model_config():
    """get_llm_fn with model configuration."""
    config = {"model": "gemini/gemini-2.0-flash"}
    fn = get_llm_fn(config)
    assert callable(fn)
