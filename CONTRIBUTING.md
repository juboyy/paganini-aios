# Contributing to PAGANINI AIOS

We welcome contributions from the community.

## Quick Start

```bash
git clone https://github.com/juboyy/paganini-aios.git
cd paganini-aios
pip install -e ".[dev]"
paganini doctor    # Check everything is set up
```

## What You Can Contribute

### ✅ Open Source (Framework)
- Core engine improvements (kernel, RAG pipeline, memory API)
- New skills for the skill framework
- Agent framework enhancements
- Documentation and examples
- Bug fixes and performance improvements
- CI/CD and tooling
- Translations (pt-BR priority)

### 🔒 Domain Packs (Paid — Not Open for Contributions)
- FIDC corpus content
- Domain-specific skill implementations
- Regulatory rule databases
- Pre-built report templates

## How to Contribute

### 1. Find Something to Work On
- Check [issues](https://github.com/juboyy/paganini-aios/issues) for `good first issue` or `help wanted`
- Read the [architecture docs](docs/architecture/) to understand the system
- Pick a story from the [BMAD-CE backlog](docs/pipeline/bmad-ce.md)

### 2. Fork & Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Follow the Gate
Every change goes through the pre-execution gate:
```bash
paganini gate "description of what you're changing"
# Gate token must appear in your commit message
```

### 4. Write Tests
```bash
paganini test               # Run all tests
paganini eval               # Run eval suite (if touching RAG)
```

### 5. Submit PR
- Include gate token in PR description
- Describe what changed and why
- Link to relevant issue
- Include eval score if touching retrieval

## Code Style

- **Python**: Black formatter, isort imports, type hints required
- **Markdown**: One sentence per line in docs
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `security:`)
- **No secrets**: Pre-commit hooks enforce this. No exceptions.

## Architecture Principles

Before contributing, read the [25 architectural principles](README.md#architectural-principles).
Key ones for contributors:

1. **Eval-driven**: Write eval cases before implementation
2. **Gate required**: Context checked before code
3. **No lazy code**: Complete implementation or don't start
4. **Security first**: Pre-commit hooks, no plaintext secrets, PII scrubbing

## Creating a New Skill

```bash
paganini skill create my-skill
# Creates:
#   skills/my-skill/
#   ├── SKILL.md      ← Description, triggers, constraints
#   ├── main.py       ← Implementation
#   └── tests/
#       └── test_main.py
```

See [Genome docs](docs/architecture/genome.md) for skill architecture details.

## Security Reporting

Found a vulnerability? **Do not open a public issue.**

Email: security@aios.finance

We will respond within 48 hours and coordinate responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
