# Contributing to Paganini AIOS

Thank you for your interest in contributing to Paganini AIOS.

## Development Setup

```bash
git clone https://github.com/juboyy/paganini-aios.git
cd paganini-aios
python3 -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
pre-commit install
```

## Running Tests

```bash
pytest tests/ -v
```

## Code Quality

```bash
ruff check packages/        # Lint
ruff format packages/       # Format
```

## Pre-commit Hooks

All commits must pass 10 pre-commit hooks:

```bash
pre-commit run --all-files
```

Hooks include: secret scanning, PII detection, corpus content validation, YAML/JSON checks, and formatting.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests for new functionality
4. Ensure all checks pass (`pre-commit run --all-files && pytest`)
5. Submit a PR with a clear description

## Architecture

See [Architecture section in README](README.md#architecture) for the codebase layout.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
