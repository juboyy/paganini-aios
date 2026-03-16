# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.x     | ✅ Active |
| < 5.0   | ❌ EOL    |

## Security Architecture

Paganini AIOS implements defense-in-depth across all layers:

### Data Isolation
- **Fund isolation**: Data from Fund A is never accessible in Fund B context
- **Cotista isolation**: Individual investor data is partitioned at the query level
- **API key authentication**: All endpoints require `X-API-Key` header
- **No data leaves the deployment**: All processing happens on-premises or in your VPC

### Compliance Gates
6 sequential guardrail gates validate every query before response:
1. Eligibility — asset eligibility verification
2. Concentration — exposure limit enforcement
3. Covenant — breach detection
4. PLD/AML — anti-money-laundering screening (blocks evasion attempts)
5. Compliance — regulatory rule enforcement
6. Risk — portfolio risk threshold validation

### CI/CD Security
- **TruffleHog**: Deep history scan for verified secrets
- **Custom PII detection**: CPF, CNPJ, email, phone patterns
- **Corpus leak detection**: Prevents regulatory corpus from leaking into code
- **Gitignore audit**: Ensures sensitive files are never tracked
- **Bandit SAST**: Static analysis for Python security vulnerabilities
- **Pre-commit hooks**: 10 hooks run on every commit

### Dependency Management
- Dependencies pinned in `pyproject.toml`
- `pip-audit` runs in CI (advisory mode)
- No known critical vulnerabilities in production dependencies

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: security@paganini.ai
3. Include: description, reproduction steps, impact assessment
4. Expected response time: 48 hours

## Audit Trail

Every query generates a structured audit log entry with:
- Timestamp, query hash, routed agent
- Guardrail gate results (pass/fail per gate)
- Source documents referenced
- Response confidence score

Audit logs are stored in JSONL format and can be exported for compliance review.
