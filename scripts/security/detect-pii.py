#!/usr/bin/env python3
"""Detect PII (Personally Identifiable Information) in files.

Scans for: CPF, CNPJ, email, phone, Brazilian bank accounts,
common name patterns near identifying fields.

Usage:
    python3 scripts/security/detect-pii.py [file1 file2 ...]

Exit code: 1 if PII found, 0 if clean.
"""

import re
import sys
from pathlib import Path

# PII patterns (Brazilian-focused)
PATTERNS = [
    # CPF (xxx.xxx.xxx-xx or xxxxxxxxxxx)
    (r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', 'CPF (formatted)'),
    (r'(?<!\d)\d{11}(?!\d)', 'CPF (raw 11 digits)'),

    # CNPJ (xx.xxx.xxx/xxxx-xx or xxxxxxxxxxxxxx)
    (r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b', 'CNPJ (formatted)'),
    (r'(?<!\d)\d{14}(?!\d)', 'CNPJ (raw 14 digits)'),

    # Brazilian phone (+55 xx xxxxx-xxxx)
    (r'\+55\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}\b', 'Phone (BR)'),
    (r'\(\d{2}\)\s?\d{4,5}-\d{4}\b', 'Phone (BR formatted)'),

    # Email
    (r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', 'Email'),

    # Bank account patterns (Brazilian)
    (r'ag[eê]ncia\s*:?\s*\d{4}', 'Bank Agency'),
    (r'conta\s*:?\s*\d{5,12}[-]?\d?', 'Bank Account'),

    # CEP
    (r'\b\d{5}-\d{3}\b', 'CEP (postal code)'),

    # RG
    (r'\bRG\s*:?\s*\d{1,2}\.?\d{3}\.?\d{3}[-]?\d?\b', 'RG'),
]

# Files to always skip
SKIP_PATTERNS = [
    r'\.git/',
    r'node_modules/',
    r'__pycache__/',
    r'detect-pii\.py$',     # Don't flag ourselves
    r'\.md$',                # Docs may use example patterns
    r'\.jsonl$',             # Eval questions may have synthetic data
    r'test_.*\.py$',         # Tests may have synthetic PII
    r'sample.*\.json$',      # Sample data is synthetic by design
    r'templates/',           # Templates use placeholder data
    r'tests/',               # Test files use synthetic data
]

# Known false positives
ALLOWLIST = [
    '123.456.789-00',        # Example CPF in docs
    '12.345.678/0001-90',    # Example CNPJ in docs
    '00.000.000/0000-00',    # Placeholder
    '00.000.000/0001-00',    # Template placeholder CNPJ
    'example@example.com',
    'rod.marques@aios.finance',  # Public contact
    'art@vivaldi.finance',
]


def should_skip(filepath: str) -> bool:
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, filepath):
            return True
    return False


def is_allowlisted(match: str) -> bool:
    return match.strip() in ALLOWLIST


def validate_cpf(digits: str) -> bool:
    """Check if 11-digit string is a valid CPF (not just any 11 digits)."""
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    # Checksum validation
    for i in range(9, 11):
        value = sum(int(digits[j]) * ((i + 1) - j) for j in range(i))
        check = (value * 10 % 11) % 10
        if int(digits[i]) != check:
            return False
    return True


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
                if is_allowlisted(matched):
                    continue

                # Extra validation for raw digit patterns (reduce false positives)
                if 'raw 11 digits' in name:
                    digits = re.sub(r'\D', '', matched)
                    if not validate_cpf(digits):
                        continue
                if 'raw 14 digits' in name:
                    # Skip if it looks like a timestamp or ID
                    if matched.startswith('20') or matched.startswith('17'):
                        continue

                findings.append({
                    'file': filepath,
                    'line': line_num,
                    'type': name,
                    'match': matched[:15] + '...' if len(matched) > 15 else matched,
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
        print(f"\n🚨 PII DETECTED: {len(all_findings)} finding(s)\n")
        for finding in all_findings:
            print(f"  ❌ {finding['file']}:{finding['line']} — {finding['type']}")
            print(f"     Match: {finding['match']}")
        print(f"\n❌ Commit blocked. Remove or mask PII before committing.\n")
        sys.exit(1)
    else:
        print("✅ No PII detected.")
        sys.exit(0)


if __name__ == '__main__':
    main()
