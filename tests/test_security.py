"""Tests for security scanning scripts."""

import subprocess
import sys
import tempfile
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).parent.parent / "scripts" / "security"


def run_script(script_name: str, files: list[str] = None) -> subprocess.CompletedProcess:
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name)]
    if files:
        cmd.extend(files)
    return subprocess.run(cmd, capture_output=True, text=True, cwd=Path(__file__).parent.parent)


def test_detect_secrets_clean():
    """Clean file should pass."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('x = 42\nprint("hello")\n')
        f.flush()
        result = run_script("detect-secrets.py", [f.name])
    assert result.returncode == 0
    assert "No secrets" in result.stdout


def test_detect_secrets_catches_openai_key():
    """Should detect OpenAI-style API key."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('api_key = "sk-abc123def456ghi789jkl012mno345pqr678stu901vwx"\n')
        f.flush()
        result = run_script("detect-secrets.py", [f.name])
    assert result.returncode == 1
    assert "SECRETS DETECTED" in result.stdout


def test_detect_secrets_allows_env_refs():
    """Environment variable references are fine."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('api_key = "${OPENAI_API_KEY}"\n')
        f.flush()
        result = run_script("detect-secrets.py", [f.name])
    assert result.returncode == 0


def test_detect_pii_clean():
    """Clean file should pass."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('name = "John"\nage = 30\n')
        f.flush()
        result = run_script("detect-pii.py", [f.name])
    assert result.returncode == 0


def test_detect_pii_catches_cpf():
    """Should detect formatted CPF."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('cpf = "529.982.247-25"\n')
        f.flush()
        result = run_script("detect-pii.py", [f.name])
    assert result.returncode == 1
    assert "PII DETECTED" in result.stdout


def test_detect_pii_catches_cnpj():
    """Should detect formatted CNPJ."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('cnpj = "11.222.333/0001-81"\n')
        f.flush()
        result = run_script("detect-pii.py", [f.name])
    assert result.returncode == 1


def test_detect_corpus_clean():
    """Regular Python file should pass."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write('def hello():\n    return "world"\n')
        f.flush()
        result = run_script("detect-corpus.py", [f.name])
    assert result.returncode == 0


def test_verify_gitignore_passes():
    """Gitignore should be valid for the repo."""
    result = run_script("verify-gitignore.py")
    assert result.returncode == 0
    assert "intact" in result.stdout


def test_all_security_scripts_exist():
    """All 4 security scripts must exist."""
    scripts = ["detect-secrets.py", "detect-pii.py", "detect-corpus.py", "verify-gitignore.py"]
    for s in scripts:
        assert (SCRIPTS_DIR / s).exists(), f"Missing: {s}"


def test_seccomp_profiles_valid_json():
    """Seccomp profiles must be valid JSON."""
    import json
    profiles_dir = Path(__file__).parent.parent / "infra" / "security" / "profiles"
    for profile in profiles_dir.glob("*.json"):
        with open(profile) as f:
            data = json.load(f)
        assert "defaultAction" in data
        assert "syscalls" in data
        assert data["defaultAction"] == "SCMP_ACT_ERRNO"  # deny by default


def test_egress_allowlist_exists():
    """Egress proxy config must exist."""
    conf = Path(__file__).parent.parent / "infra" / "security" / "egress-allowlist.conf"
    assert conf.exists()
    content = conf.read_text()
    assert "403" in content  # Default deny
    assert "openai" in content
    assert "blocked" in content.lower()
