"""PAGANINI Moltis Adapter — Bridge between PAGANINI and Moltis runtime.

Moltis is the AI gateway (Rust binary). This adapter:
1. Manages Moltis process lifecycle (start/stop/health)
2. Routes LLM calls through Moltis gateway
3. Falls back to direct litellm if Moltis unavailable
"""

import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Optional

import httpx


class MoltisAdapter:
    """Interface to the Moltis runtime engine."""

    def __init__(self, config: dict):
        self.config = config
        runtime = config.get("runtime", {})
        self.gateway_url = runtime.get("gateway_url", "http://127.0.0.1:30000")
        self.moltis_config = runtime.get("moltis_config", "moltis.yaml")
        self.process: Optional[subprocess.Popen] = None

    @property
    def binary_path(self) -> Optional[str]:
        """Find moltis binary."""
        return shutil.which("moltis")

    @property
    def is_installed(self) -> bool:
        return self.binary_path is not None

    def is_running(self) -> bool:
        """Check if Moltis gateway is responding."""
        try:
            r = httpx.get(f"{self.gateway_url}/health", timeout=2)
            return r.status_code == 200
        except Exception:
            return False

    def start(self) -> bool:
        """Start Moltis gateway process."""
        if self.is_running():
            return True

        if not self.is_installed:
            return False

        config_path = Path(self.moltis_config)
        if not config_path.exists():
            paganini_home = Path(os.environ.get("PAGANINI_HOME", Path.home() / ".paganini"))
            config_path = paganini_home / self.moltis_config

        cmd = [self.binary_path, "gateway", "start"]
        if config_path.exists():
            cmd.extend(["--config", str(config_path)])

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            # Wait for gateway to be ready
            for _ in range(30):
                time.sleep(0.5)
                if self.is_running():
                    return True
            return False
        except Exception:
            return False

    def stop(self):
        """Stop Moltis gateway."""
        if self.process:
            self.process.terminate()
            self.process.wait(timeout=5)
            self.process = None

    def completion(self, model: str, messages: list, **kwargs) -> dict:
        """Route LLM call through Moltis gateway.

        Uses OpenAI-compatible /v1/chat/completions endpoint.
        """
        try:
            r = httpx.post(
                f"{self.gateway_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": kwargs.get("temperature", 0.1),
                    "max_tokens": kwargs.get("max_tokens", 2000),
                },
                timeout=60,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise RuntimeError(f"Moltis gateway call failed: {e}")

    def status(self) -> dict:
        """Get Moltis status."""
        return {
            "installed": self.is_installed,
            "binary": self.binary_path,
            "running": self.is_running(),
            "gateway_url": self.gateway_url,
            "config": self.moltis_config,
        }


def get_llm_fn(config: dict):
    """Create LLM callable — routes through Moltis if available, falls back to litellm.

    Architecture:
        paganini query → Moltis gateway → LLM provider (BYOK)
                              ↓
                         MetaClaw proxy (if enabled, future)
    """
    runtime = config.get("runtime", {})
    engine = runtime.get("engine", "python")
    provider = config.get("provider", {})
    model = provider.get("model", "gpt-4o-mini")
    api_key = provider.get("api_key", "")

    # Try Moltis first
    if engine == "moltis":
        adapter = MoltisAdapter(config)
        if adapter.is_running() or adapter.start():
            def moltis_llm_fn(system_prompt: str, user_prompt: str) -> str:
                try:
                    result = adapter.completion(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    )
                    return result["choices"][0]["message"]["content"]
                except Exception:
                    # Fallback to direct call
                    return _direct_llm_call(model, api_key, provider, system_prompt, user_prompt)

            return moltis_llm_fn

    # Direct mode (litellm)
    def direct_llm_fn(system_prompt: str, user_prompt: str) -> str:
        return _direct_llm_call(model, api_key, provider, system_prompt, user_prompt)

    return direct_llm_fn


def _direct_llm_call(model: str, api_key: str, provider: dict,
                     system_prompt: str, user_prompt: str) -> str:
    """Direct LLM call via litellm (fallback when Moltis unavailable)."""
    import litellm

    ptype = provider.get("type", "openai")
    if api_key:
        env_map = {"openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
                    "google": "GEMINI_API_KEY"}
        env_var = env_map.get(ptype)
        if env_var:
            os.environ[env_var] = api_key

    try:
        response = litellm.completion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Erro LLM ({model}): {e}"
