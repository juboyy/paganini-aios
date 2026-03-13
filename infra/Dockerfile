# Dockerfile — PAGANINI AIOS
FROM python:3.11-slim

WORKDIR /opt/paganini-aios

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl tmux && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY pyproject.toml .
RUN pip install -e '.[all]' --no-cache-dir

# Application
COPY packages/ packages/
COPY config.yaml .
COPY infra/ infra/
COPY docs/ docs/

# Runtime directories
RUN mkdir -p runtime/state runtime/logs runtime/traces data/corpus data/indexes data/embeddings

# Entry point
EXPOSE 8000
CMD ["paganini", "status"]
