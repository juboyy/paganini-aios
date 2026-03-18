# Dockerfile — PAGANINI AIOS
# Multi-stage build for minimal production image

FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for build
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl && \
    rm -rf /var/lib/apt/lists/*

# Install Moltis runtime
RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL https://github.com/moltis-org/moltis/releases/download/v0.10.18/moltis_0.10.18-1_${ARCH}.deb \
    -o /tmp/moltis.deb && dpkg -i /tmp/moltis.deb && rm /tmp/moltis.deb

# Python deps — copy source for editable install
COPY pyproject.toml .
COPY packages/ packages/
RUN pip install --no-cache-dir -e '.[all]'

# --- Production stage ---
FROM python:3.12-slim

WORKDIR /opt/paganini

# Copy Moltis binary
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

# Install package (entry points)
RUN pip install --no-cache-dir --no-deps -e .

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
