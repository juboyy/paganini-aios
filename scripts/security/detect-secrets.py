#!/usr/bin/env python3
"""Detect secrets in staged/committed files.

Scans for: API keys, tokens, passwords, connection strings,
private keys, AWS credentials, .env patterns.

Usage:
    python3 scripts/security/detect-secrets.py [file1 file2 ...]
    # If no files given, scans all tracked files.

Exit code: 1 if secrets found, 0 if clean.
"""

import re
import sys
from pathlib import Path

# Patterns that indicate secrets
PATTERNS = [
    # API Keys
    (r'sk-[a-zA-Z0-9]{20,}', 'OpenAI API Key'),
    (r'sk-proj-[a-zA-Z0-9\-_]{20,}', 'OpenAI Project Key'),
    (r'sk-admin-[a-zA-Z0-9\-_]{20,}', 'OpenAI Admin Key'),
    (r'sk-ant-[a-zA-Z0-9\-_]{20,}', 'Anthropic API Key'),
    (r'AIza[a-zA-Z0-9\-_]{35}', 'Google API Key'),
    (r'ghp_[a-zA-Z0-9]{36}', 'GitHub PAT'),
    (r'gho_[a-zA-Z0-9]{36}', 'GitHub OAuth Token'),
    (r'github_pat_[a-zA-Z0-9_]{82}', 'GitHub Fine-grained PAT'),
    (r'xox[baprs]-[a-zA-Z0-9\-]{10,}', 'Slack Token'),
    (r'lin_api_[a-zA-Z0-9]{30,}', 'Linear API Key'),
    (r'vcp_[a-zA-Z0-9]{40,}', 'Vercel Token'),

    # AWS
    (r'AKIA[A-Z0-9]{16}', 'AWS Access Key ID'),
    (r'aws_secret_access_key\s*=\s*\S{20,}', 'AWS Secret Key'),

    # Private Keys
    (r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', 'Private Key'),
    (r'-----BEGIN PGP PRIVATE KEY BLOCK-----', 'PGP Private Key'),

    # Connection Strings
    (r'postgres(ql)?://[^\s"\']+:[^\s"\']+@[^\s"\']+', 'Postgres Connection String'),
    (r'mysql://[^\s"\']+:[^\s"\']+@[^\s"\']+', 'MySQL Connection String'),
    (r'mongodb(\+srv)?://[^\s"\']+:[^\s"\']+@[^\s"\']+', 'MongoDB Connection String'),
    (r'redis://:[^\s"\']+@[^\s"\']+', 'Redis Connection String'),

    # Passwords in config
    (r'password\s*[=:]\s*["\'][^"\']{8,}["\']', 'Hardcoded Password'),
    (r'secret\s*[=:]\s*["\'][^"\']{8,}["\']', 'Hardcoded Secret'),

    # JWT
    (r'eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}', 'JWT Token'),

    # Supabase
    (r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{50,}', 'Supabase Key'),
    (r'sbp_[a-zA-Z0-9]{40,}', 'Supabase Service Key'),
]

# Files/patterns to skip
SKIP_PATTERNS = [
    r'\.git/',
    r'node_modules/',
    r'__pycache__/',
    r'\.pyc$',
    r'\.lock$',
    r'package-lock\.json$',
    r'detect-secrets\.py$',  # Don't flag ourselves
    r'\.md$',                # Docs may reference patterns as examples
    r'tests/',               # Test files use fake/mock secrets
]

# Allowlisted strings (known false positives)
ALLOWLIST = [
    '${OPENAI_API_KEY}',     # env var references in config
    '${ANTHROPIC_API_KEY}',
    '${GOOGLE_API_KEY}',
    '${SLACK_BOT_TOKEN}',
    '${SUPABASE_SERVICE_ROLE_KEY}',
    'changeme',              # default placeholder
    'your-key-here',
    'sk-your-key',
]


def should_skip(filepath: str) -> bool:
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, filepath):
            return True
    return False


def is_allowlisted(match: str) -> bool:
    for allowed in ALLOWLIST:
        if allowed in match:
            return True
    return False


def scan_file(filepath: str) -> list[dict]:
    findings = []
    try:
        content = Path(filepath).read_text(errors='ignore')
    except (OSError, UnicodeDecodeError):
        return findings

    for line_num, line in enumerate(content.split('\n'), 1):
        for pattern, name in PATTERNS:
            for match in re.finditer(pattern, line):
                matched = match.group()
                if not is_allowlisted(matched):
                    findings.append({
                        'file': filepath,
                        'line': line_num,
                        'type': name,
                        'match': matched[:20] + '...' if len(matched) > 20 else matched,
                    })
    return findings


def main():
    files = sys.argv[1:]
    if not files:
        import subprocess
        result = subprocess.run(['git', 'ls-files'], capture_output=True, text=True)
        files = result.stdout.strip().split('\n')

    all_findings = []
    for f in files:
        if f and not should_skip(f) and Path(f).exists():
            all_findings.extend(scan_file(f))

    if all_findings:
        print(f"\n🚨 SECRETS DETECTED: {len(all_findings)} finding(s)\n")
        for finding in all_findings:
            print(f"  ❌ {finding['file']}:{finding['line']} — {finding['type']}")
            print(f"     Match: {finding['match']}")
        print(f"\n❌ Commit blocked. Remove secrets before committing.\n")
        sys.exit(1)
    else:
        print("✅ No secrets detected.")
        sys.exit(0)


if __name__ == '__main__':
    main()
