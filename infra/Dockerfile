# Dockerfile — PAGANINI AIOS
# Multi-stage build for minimal production image

FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for build (libgomp1 required by Moltis)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Install Moltis runtime (optional — continue if unavailable)
RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL https://github.com/moltis-org/moltis/releases/download/v0.10.18/moltis_0.10.18-1_${ARCH}.deb \
    -o /tmp/moltis.deb && dpkg -i /tmp/moltis.deb && rm /tmp/moltis.deb || \
    echo "WARN: Moltis install failed — running in python-only mode"

# Copy full source (needed for hatchling build)
COPY pyproject.toml README.md ./
COPY packages/ packages/

# Python deps (non-editable for container)
RUN pip install --no-cache-dir ".[all]" 2>/dev/null || \
    pip install --no-cache-dir ".[dev]" 2>/dev/null || \
    pip install --no-cache-dir .

# --- Production stage ---
FROM python:3.12-slim

WORKDIR /opt/paganini

# Runtime dep for Moltis
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Copy Moltis binary (if it was installed)
COPY --from=builder /usr/bin/moltis /usr/bin/moltis

# Copy Python environment
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Application code
COPY packages/ packages/
COPY infra/ infra/
COPY docs/ docs/
COPY config.example.yaml .
COPY moltis.example.yaml .
COPY pyproject.toml .
COPY README.md .

# Install package (entry points only — deps already copied)
RUN pip install --no-cache-dir --no-deps .

# Runtime directories
RUN mkdir -p runtime/state runtime/logs runtime/traces runtime/data \
    data/corpus data/indexes skills/ \
    && useradd -r -s /bin/false paganini \
    && chown -R paganini:paganini /opt/paganini

# Security: non-root, read-only FS compatible
USER paganini

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD paganini doctor || exit 1

EXPOSE 8000 30000

ENTRYPOINT ["paganini"]
CMD ["status"]
