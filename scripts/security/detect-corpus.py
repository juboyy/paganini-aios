#!/usr/bin/env python3
"""Detect corpus content leaking into the open-source codebase.

Scans for: CVM article text fingerprints, fund names from corpus,
regulatory text that should only exist in the paid corpus.

Usage:
    python3 scripts/security/detect-corpus.py [file1 file2 ...]

Exit code: 1 if corpus content found, 0 if clean.
"""

import re
import sys
from pathlib import Path

# Fingerprints of corpus content (distinctive phrases from paid docs)
CORPUS_FINGERPRINTS = [
    # CVM 175 distinctive phrases (not generic legal text)
    r'Anexo Normativo II.*Art\.\s*\d+',
    r'Instrução CVM n[ºo]\s*\d{3}',
    r'Resolução CVM n[ºo]\s*175',

    # Fund-specific terms that indicate real data
    r'FIDC\s+[A-Z][a-zA-Z\s]+(?:I{1,3}|IV|V)',  # Real fund names like "FIDC Alpha III"
    r'CNPJ.*\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}',    # CNPJ in fund context

    # Corpus file naming patterns
    r'Artigo\s+\d+\s*[-–]\s*CVM\s*175',
    r'Convenants?\s*[-–]\s*Guia\s+Avançado',
    r'Due\s+Diligence\s+e\s+o\s+Papel\s+do\s+Custodiante',
]

# Directories that should NEVER contain corpus content
PROTECTED_DIRS = [
    'packages/',
    'infra/',
    'scripts/',
    'tests/',
    '.github/',
]

# Files to skip (these are allowed to reference corpus concepts)
SKIP_PATTERNS = [
    r'data/corpus/',         # The corpus itself
    r'data/sample/',         # Sample data (synthetic)
    r'\.git/',
    r'detect-corpus\.py$',   # Don't flag ourselves
    r'README',               # READMEs may describe corpus content
    r'docs/',                # Architecture docs may reference
    r'eval_questions',       # Eval uses generic questions
]


def should_skip(filepath: str) -> bool:
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, filepath):
            return True
    return False


def is_protected(filepath: str) -> bool:
    return any(filepath.startswith(d) for d in PROTECTED_DIRS)


def scan_file(filepath: str) -> list[dict]:
    findings = []
    try:
        content = Path(filepath).read_text(errors='ignore')
    except (OSError, UnicodeDecodeError):
        return findings

    for line_num, line in enumerate(content.split('\n'), 1):
        for pattern in CORPUS_FINGERPRINTS:
            if re.search(pattern, line, re.IGNORECASE):
                findings.append({
                    'file': filepath,
                    'line': line_num,
                    'pattern': pattern[:50],
                    'context': line.strip()[:80],
                    'protected': is_protected(filepath),
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

    # Only block on findings in protected directories
    blocking = [f for f in all_findings if f['protected']]
    warnings = [f for f in all_findings if not f['protected']]

    if warnings:
        print(f"\n⚠️  CORPUS REFERENCES: {len(warnings)} warning(s) (non-blocking)\n")
        for w in warnings:
            print(f"  ⚠️  {w['file']}:{w['line']}")
            print(f"     {w['context']}")

    if blocking:
        print(f"\n🚨 CORPUS CONTENT IN PROTECTED DIR: {len(blocking)} finding(s)\n")
        for finding in blocking:
            print(f"  ❌ {finding['file']}:{finding['line']}")
            print(f"     {finding['context']}")
        print(f"\n❌ Commit blocked. Corpus content must not leak into code.\n")
        sys.exit(1)

    if not blocking:
        print("✅ No corpus content in protected directories.")
        sys.exit(0)


if __name__ == '__main__':
    main()
