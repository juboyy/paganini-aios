#!/usr/bin/env python3
"""Verify .gitignore rules are intact.

Ensures critical directories are always gitignored:
- data/corpus/
- runtime/
- secrets/
- .env
- moltis.yaml (contains real config)

Usage:
    python3 scripts/security/verify-gitignore.py

Exit code: 1 if gitignore is incomplete, 0 if OK.
"""

import subprocess
import sys
from pathlib import Path

REQUIRED_IGNORES = [
    'data/corpus/',
    'data/embeddings/',
    'data/indexes/',
    'runtime/',
    '.env',
    '.env.local',
    'secrets/',
    'moltis.yaml',
    'skills/',
]


def check_gitignore() -> list[str]:
    """Check that required patterns are in .gitignore."""
    gitignore = Path('.gitignore')
    if not gitignore.exists():
        return ['CRITICAL: .gitignore file is missing!']

    content = gitignore.read_text()
    lines = [l.strip() for l in content.split('\n')]

    issues = []
    for required in REQUIRED_IGNORES:
        # Check if the pattern or a parent pattern covers it
        covered = False
        for line in lines:
            if line == required or line == required.rstrip('/'):
                covered = True
                break
            # Check parent coverage (e.g., "runtime/" covers "runtime/state/")
            if required.startswith(line.rstrip('/') + '/'):
                covered = True
                break
        if not covered:
            issues.append(f"Missing gitignore rule: {required}")

    return issues


def check_tracked_files() -> list[str]:
    """Check that no protected files are tracked by git."""
    result = subprocess.run(['git', 'ls-files'], capture_output=True, text=True)
    if result.returncode != 0:
        return []

    tracked = result.stdout.strip().split('\n')
    issues = []

    protected_prefixes = ['data/corpus/', 'runtime/', 'secrets/']
    protected_files = ['.env', '.env.local', 'moltis.yaml']

    for f in tracked:
        for prefix in protected_prefixes:
            if f.startswith(prefix):
                issues.append(f"CRITICAL: Protected file is tracked: {f}")
        if f in protected_files:
            issues.append(f"CRITICAL: Protected file is tracked: {f}")

    return issues


def main():
    issues = check_gitignore() + check_tracked_files()

    if issues:
        print(f"\n🚨 GITIGNORE ISSUES: {len(issues)}\n")
        for issue in issues:
            severity = "❌" if "CRITICAL" in issue else "⚠️"
            print(f"  {severity} {issue}")
        print()
        sys.exit(1)
    else:
        print("✅ Gitignore rules intact. No protected files tracked.")
        sys.exit(0)


if __name__ == '__main__':
    main()
