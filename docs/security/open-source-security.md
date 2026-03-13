# Security Architecture — Open Source Pillar

> How PAGANINI AIOS keeps sensitive data out of the open-source codebase
> while shipping a fully functional framework.

---

## The Problem

PAGANINI is open-core: the framework is open source, domain packs are paid.
The open repo MUST NOT contain:
- Client data (fund portfolios, cotista info, cedente records)
- API keys, tokens, credentials of any kind
- Proprietary corpus content (164 FIDC docs)
- Internal business logic that is the paid differentiator
- PII (personally identifiable information)
- Fund-specific configurations with real data

But the framework must be **fully functional** without any of this.
A developer clones the repo, runs `paganini install`, and it works — with
sample data, mock providers, and example configs.

---

## Strategy: 5-Layer Data Isolation

### Layer 1: Gitignore & Directory Convention

```
paganini/
├── packages/          # ✅ OPEN SOURCE — framework code
├── docs/              # ✅ OPEN SOURCE — architecture, guides
├── infra/             # ✅ OPEN SOURCE — Docker, compose, deploy scripts
├── config.example.yaml # ✅ OPEN SOURCE — example config (no secrets)
├── data/
│   ├── corpus/        # 🔒 GITIGNORED — domain corpus (paid content)
│   ├── sample/        # ✅ OPEN SOURCE — synthetic sample data for testing
│   └── eval/          # ✅ OPEN SOURCE — eval questions (generic, no PII)
├── runtime/           # 🔒 GITIGNORED — runtime state, logs, traces
│   ├── memory/        # 🔒 Fund memories (contains operational data)
│   ├── skills/        # 🔒 Auto-generated skills (MetaClaw, may contain patterns)
│   ├── reports/       # 🔒 Generated reports (contain fund data)
│   ├── screenshots/   # 🔒 PinchTab evidence (may contain sensitive pages)
│   └── traces/        # 🔒 OTel traces (contain operation details)
├── secrets/           # 🔒 GITIGNORED — encrypted credentials vault
└── .env               # 🔒 GITIGNORED — environment variables
```

**Rule: Everything in `data/corpus/`, `runtime/`, `secrets/`, `.env` is gitignored. Always.**

### Layer 2: Secret Management

No plaintext secrets. Ever. Anywhere.

```yaml
# config.yaml uses environment variable references, never raw values
providers:
  openai:
    api_key: ${OPENAI_API_KEY}       # Resolved at runtime
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}

supabase:
  url: ${SUPABASE_URL}
  key: ${SUPABASE_SERVICE_ROLE_KEY}

slack:
  bot_token: ${SLACK_BOT_TOKEN}
```

**Secrets storage options (client chooses):**

| Method | Use Case |
|--------|----------|
| Environment variables | Simplest. Docker/systemd inject. |
| `.env` file (gitignored) | Local dev. Never committed. |
| Encrypted vault (`secrets/vault.enc`) | Self-hosted. AES-256-GCM. Master key from env var. |
| Cloud KMS (AWS/GCP/Azure) | Enterprise. Key rotation. IAM-controlled. |
| 1Password CLI (`op://`) | Teams using 1Password. |

```bash
# Encrypted vault workflow
paganini secrets init                    # Create vault with master key
paganini secrets set OPENAI_API_KEY      # Prompt for value, encrypt, store
paganini secrets list                    # Show keys (not values)
paganini secrets export --env            # Export as env vars for session
```

### Layer 3: Corpus Isolation

The FIDC corpus (164 docs, 5.6MB) is the paid product. It NEVER touches the
open-source repo.

```
# Delivery via authenticated CLI
paganini install fidc-starter     # Downloads from aios.finance registry
paganini install fidc-professional
paganini install fidc-enterprise

# Auth flow
paganini login                    # Authenticate with aios.finance account
paganini install fidc-starter     # Checks license → downloads → decrypts → data/corpus/
```

**Corpus is encrypted at rest:**
```
data/corpus/fidc/
├── .manifest.json.enc           # Encrypted file manifest
├── cvm175/                      # Encrypted article files
├── accounting/                  # Encrypted accounting docs
└── ...
```

Decrypted only in memory at runtime. Never written to disk unencrypted.
License key validates on each `paganini start`.

**Open-source alternative:**
```
data/sample/
├── sample-regulation.md         # Synthetic regulation (not real CVM text)
├── sample-fund.json             # Fake fund with fake data
├── sample-cedentes.json         # Synthetic originators
└── sample-carteira.json         # Synthetic portfolio
```

Framework works with sample data. Real corpus is the upgrade.

### Layer 4: Runtime Data Hygiene

Runtime data (traces, memories, reports, skills) accumulates during operation.
It contains fund-specific information and must be protected.

**Policies:**

| Data Type | Retention | Encryption | Access |
|-----------|-----------|------------|--------|
| Traces (audit trail) | Immutable, 7 years (regulatory) | AES-256 at rest | Fund admin only |
| Memories | Until reflection prunes | AES-256 at rest | Agent + fund admin |
| Reports | Immutable, 10 years | AES-256 at rest | Fund admin + auditor |
| MetaClaw skills | Until pruning daemon | Plaintext (no PII in skills) | System |
| Screenshots | 90 days | AES-256 at rest | Fund admin |
| Logs | 30 days rolling | Plaintext (no PII in logs) | System admin |

**PII scrubbing:**
```yaml
# config.yaml
security:
  pii_scrub:
    enabled: true
    fields: [cpf, cnpj, email, phone, name, address, bank_account]
    action: mask  # mask | hash | remove
    # CPF 123.456.789-00 → CPF ***.***.***-00
    # In: logs, traces, error messages
    # NOT in: reports (need real data), memories (encrypted anyway)
```

### Layer 5: Multi-Tenant Isolation (Chinese Walls)

When one instance serves multiple funds:

```
Fund Alpha data ──┐
                  ├── NEVER cross
Fund Beta data  ──┘

Enforced at:
├── Database: RLS policies with fund_id
├── Memory: Partitioned by fund_id
├── MetaClaw: Separate skill stores per fund
├── Agents: fund_id in every agent context
├── Traces: fund_id on every trace span
└── Reports: fund_id validation before render
```

**RLS enforcement (Supabase):**
```sql
-- Every table with fund data
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_isolation" ON operations
  USING (fund_id = current_setting('app.current_fund_id')::uuid);

-- Set at session start
SET app.current_fund_id = '<fund_uuid>';
-- Now ALL queries automatically filtered. No leaks possible.
```

---

## Pre-Commit Hooks

Automated checks before any commit reaches the repo:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: no-secrets
        name: Detect secrets
        entry: python3 scripts/security/detect-secrets.py
        language: system
        pass_filenames: true
        # Scans for: API keys, tokens, passwords, connection strings,
        # private keys, AWS credentials, .env patterns

      - id: no-pii
        name: Detect PII
        entry: python3 scripts/security/detect-pii.py
        language: system
        pass_filenames: true
        # Scans for: CPF, CNPJ, email patterns, phone numbers,
        # Brazilian bank account patterns, names in known lists

      - id: no-corpus
        name: Detect corpus content
        entry: python3 scripts/security/detect-corpus.py
        language: system
        pass_filenames: true
        # Scans for: CVM article text, fund names from corpus,
        # regulatory text fingerprints

      - id: gitignore-check
        name: Verify gitignore rules
        entry: python3 scripts/security/verify-gitignore.py
        language: system
        # Ensures: data/corpus/, runtime/, secrets/, .env are gitignored
```

## CI Pipeline Security

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: trufflesecurity/trufflehog@main  # Deep secret scan
      - uses: gitleaks/gitleaks-action@v2      # Pattern-based scan

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - run: pip audit                         # Python dependency vulnerabilities
      - run: npm audit                         # Node dependency vulnerabilities

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: semgrep/semgrep-action@v1        # Static analysis
        with:
          config: p/security-audit p/python
```

---

## Git History Scrubbing

If sensitive data was EVER committed (even if later deleted):

```bash
# Nuclear option: rewrite history to remove file
git filter-repo --path data/corpus/ --invert-paths
git filter-repo --path .env --invert-paths
git filter-repo --path secrets/ --invert-paths

# Force push (only for private repos before going public)
git push --force --all
```

**Before open-sourcing:**
1. Run `trufflehog` on full history
2. Run `gitleaks` on full history
3. Run custom corpus fingerprint scanner
4. Manual review of all files
5. If ANY hit → `git filter-repo` to rewrite
6. Fresh clone → verify → only then make public

---

## Security Audit Daemon

Runs as part of heartbeat/self-audit:

```python
# Periodic check (self-audit daemon)
def security_audit():
    issues = []
    
    # 1. Check gitignore is intact
    if not verify_gitignore():
        issues.append("CRITICAL: gitignore rules missing")
    
    # 2. Scan staged files for secrets
    staged = get_staged_files()
    for f in staged:
        if detect_secrets(f):
            issues.append(f"SECRET DETECTED in {f}")
        if detect_pii(f):
            issues.append(f"PII DETECTED in {f}")
    
    # 3. Verify corpus not in tracked files
    tracked = get_tracked_files()
    for f in tracked:
        if f.startswith('data/corpus/'):
            issues.append(f"CRITICAL: corpus file tracked: {f}")
    
    # 4. Check runtime dir not tracked
    for f in tracked:
        if f.startswith('runtime/'):
            issues.append(f"CRITICAL: runtime file tracked: {f}")
    
    # 5. Verify encryption at rest
    if not verify_encryption('runtime/'):
        issues.append("WARNING: runtime data not encrypted")
    
    return issues
```

---

## What Ships in Open Source vs What Doesn't

| Ships (Open Source) | Doesn't Ship (Paid/Private) |
|--------------------|-----------------------------|
| Framework code (all packages/) | FIDC corpus (164 docs) |
| Agent SOULs (templates, not fund-specific) | Client fund configurations |
| Guardrail framework (engine, not rules) | CVM 175 parsed rule database |
| RAG pipeline (engine, not embeddings) | Pre-computed embeddings |
| Sample data (synthetic) | Real fund data |
| Config examples (config.example.yaml) | Real configs with secrets |
| QMD templates (structure) | Filled reports with data |
| Skill framework + sample skills | Domain-specific skill implementations |
| Docker/infra (deploy scripts) | Client infrastructure details |
| Pre-commit hooks + CI security | Audit logs, traces, decisions |
| Documentation (architecture, guides) | Internal business docs |
