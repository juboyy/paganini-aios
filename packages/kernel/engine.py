"""PAGANINI Kernel — Config, LLM integration, and core engine."""

import os
from pathlib import Path

import yaml


DEFAULT_CONFIG = {
    "version": "0.1.0",
    "provider": {
        "type": "openai",
        "model": "gpt-4o-mini",
        "api_key": "",
        "base_url": "",
    },
    "metaclaw": {
        "enabled": False,
        "proxy_url": "",
    },
    "rag": {
        "chunk_size": 384,
        "chunk_overlap": 64,
        "respect_headers": True,
        "top_k": 5,
        "max_context_tokens": 8000,
    },
    "data_dir": "runtime/data",
    "corpus_dir": "",
    "runtime": {
        "engine": "python",  # python | docker | moltis
        "moltis_config": "moltis.yaml",
        "gateway_url": "http://127.0.0.1:30000",
    },
}


def load_config(config_path: str = "config.yaml") -> dict:
    """Load config with defaults + env var resolution."""
    config = DEFAULT_CONFIG.copy()

    path = Path(config_path)
    if path.exists():
        with open(path) as f:
            user_config = yaml.safe_load(f) or {}
        config = _deep_merge(config, user_config)

    # Resolve env vars (${VAR_NAME} syntax)
    config = _resolve_env_vars(config)

    return config


def save_config(config: dict, config_path: str = "config.yaml"):
    """Save config to YAML."""
    with open(config_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)


def get_llm_fn(config: dict):
    """Create LLM callable from config. Supports BYOK via litellm."""
    import litellm

    provider = config.get("provider", {})
    model = provider.get("model", "gpt-4o-mini")
    api_key = provider.get("api_key", "")
    base_url = provider.get("base_url", "")

    # MetaClaw proxy — if enabled, route through it
    metaclaw = config.get("metaclaw", {})
    if metaclaw.get("enabled") and metaclaw.get("proxy_url"):
        base_url = metaclaw["proxy_url"]

    # Set env vars for litellm
    if api_key:
        ptype = provider.get("type", "openai")
        if ptype == "openai":
            os.environ["OPENAI_API_KEY"] = api_key
        elif ptype == "anthropic":
            os.environ["ANTHROPIC_API_KEY"] = api_key
        elif ptype == "google":
            os.environ["GEMINI_API_KEY"] = api_key

    def llm_fn(system_prompt: str, user_prompt: str) -> str:
        """Call LLM via litellm (supports any provider)."""
        try:
            response = litellm.completion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                api_base=base_url or None,
                temperature=0.1,
                max_tokens=2000,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Erro ao chamar LLM ({model}): {e}"

    return llm_fn


def _deep_merge(base: dict, override: dict) -> dict:
    """Deep merge override into base."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _resolve_env_vars(obj):
    """Recursively resolve ${VAR} references in config values."""
    if isinstance(obj, str):
        import re
        def replacer(match):
            var = match.group(1)
            return os.environ.get(var, match.group(0))
        return re.sub(r'\$\{(\w+)\}', replacer, obj)
    elif isinstance(obj, dict):
        return {k: _resolve_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_resolve_env_vars(v) for v in obj]
    return obj
