# Container Security Architecture

> Every agent, every skill, every daemon runs in its own container.
> Nothing shares. Nothing escapes. Everything is auditable.

---

## Principle: Zero Trust Between Containers

No container trusts another. Every interaction goes through authenticated,
rate-limited, logged APIs. An agent container compromise cannot reach
fund data, other agents, or the host.

---

## Container Topology

```
┌─────────────────────────────────────────────────────────┐
│  HOST (Moltis Runtime)                                  │
│  Only runs: container orchestrator + network proxy       │
│  No fund data. No agent code. No secrets in memory.     │
└───────────────┬─────────────────────────────────────────┘
                │ docker network: paganini-net (internal)
    ┌───────────┼───────────────────────────────────┐
    │           │                                   │
    ▼           ▼                                   ▼
┌─────────┐ ┌─────────┐ ┌─────────┐          ┌──────────┐
│ KERNEL  │ │ AGENT   │ │ AGENT   │   ...    │ METACLAW │
│         │ │ admin   │ │ gestor  │          │          │
│ Router  │ │         │ │         │          │ Learning │
│ Memory  │ │ sandbox │ │ sandbox │          │ Proxy    │
│ Gate    │ │ no net  │ │ no net  │          │          │
└────┬────┘ └────┬────┘ └────┬────┘          └────┬─────┘
     │           │           │                    │
     ▼           ▼           ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│  DATA LAYER (isolated network: paganini-data)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ pgvector │  │ Redis    │  │ Object   │               │
│  │ (memory) │  │ (cache)  │  │ Storage  │               │
│  │ RLS on   │  │ per-fund │  │ encrypted│               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

---

## Container Profiles

### Kernel Container
```dockerfile
FROM python:3.12-slim AS kernel

# Non-root user
RUN useradd -r -s /bin/false paganini
USER paganini

# Read-only filesystem
# Writable: /tmp, /run/paganini (tmpfs)

# Network: paganini-net only (talks to agents + data layer)
# NO external internet access
# Capabilities: NONE dropped, only NET_BIND_SERVICE if needed

# Secrets: injected via Docker secrets, never in image/env
# Volumes: none — stateless, reads from data layer
```

**Permissions:**
- ✅ Route queries to agents
- ✅ Read/write memory (via data layer API)
- ✅ Execute gate validation
- ❌ Direct internet access
- ❌ Access host filesystem
- ❌ Spawn processes outside container

### Agent Container (per agent type)
```dockerfile
FROM python:3.12-slim AS agent

# Non-root, no shell
RUN useradd -r -s /usr/sbin/nologin agent
USER agent

# EXTREME LOCKDOWN:
# - Read-only filesystem
# - No network (--network=none for most agents)
# - No capabilities (--cap-drop=ALL)
# - No privilege escalation (--security-opt=no-new-privileges)
# - Memory limit (256MB default, configurable)
# - CPU limit (0.5 cores default)
# - PID limit (50 processes max)
# - No /proc, no /sys mount
# - tmpfs for /tmp (10MB max)

# Communication: ONLY via Unix socket to kernel container
# Agent cannot make HTTP calls, DNS lookups, or any external connection
```

**Permissions:**
- ✅ Receive queries from kernel (via Unix socket)
- ✅ Return responses to kernel
- ✅ Request tool execution (kernel proxies)
- ❌ Direct network access
- ❌ Direct database access
- ❌ Direct filesystem access (beyond read-only image)
- ❌ See other containers
- ❌ Access host

**Exceptions (agents with network):**
```yaml
# Only these agents get controlled network access:
agents:
  regulatory_watch:
    network: paganini-external  # Can reach CVM/ANBIMA/BACEN
    allowed_domains:
      - "*.gov.br"
      - "*.anbima.com.br"
      - "*.bcb.gov.br"
    # All other domains blocked by egress proxy

  investor_relations:
    network: paganini-slack     # Can reach Slack API only
    allowed_domains:
      - "*.slack.com"

  due_diligence:
    network: paganini-external  # Can reach specific DD sources
    allowed_domains:
      - "esaj.tjsp.jus.br"
      - "*.serasa.com.br"
      - "*.receita.fazenda.gov.br"
```

### MetaClaw Container
```dockerfile
FROM python:3.12-slim AS metaclaw

USER metaclaw

# Network: can reach LLM providers ONLY (via egress proxy)
# Receives requests from kernel, forwards to LLM
# Stores skills in local encrypted volume
# Cannot reach data layer or other agents directly
```

### PinchTab Container
```dockerfile
FROM node:22-slim AS pinchtab

# Headless Chrome runs here — isolated from everything
# Network: paganini-external (controlled egress)
# Cannot reach data layer
# Cannot reach agent containers
# Results returned to kernel via API

# Chrome sandboxed with --no-sandbox disabled (runs in container sandbox instead)
# Seccomp profile: chrome.json (restrictive)
```

---

## Docker Compose Security

```yaml
version: '3.8'

networks:
  paganini-net:
    internal: true           # No external access
    driver: bridge
  paganini-data:
    internal: true           # Database network, no external
  paganini-external:
    driver: bridge           # Controlled external access via egress proxy

services:
  # === KERNEL ===
  kernel:
    build: ./packages/kernel
    read_only: true
    tmpfs:
      - /tmp:size=50M
      - /run/paganini:size=10M
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    networks:
      - paganini-net
      - paganini-data
    secrets:
      - db_password
      - master_key
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "python3", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"]
      interval: 30s
      timeout: 5s
      retries: 3

  # === AGENTS (template — one per agent type) ===
  agent-administrador:
    build:
      context: ./packages/agents
      args:
        AGENT_SOUL: administrador
    read_only: true
    tmpfs:
      - /tmp:size=10M,noexec
    network_mode: "none"       # NO NETWORK AT ALL
    security_opt:
      - no-new-privileges:true
      - seccomp:profiles/agent-seccomp.json
    cap_drop:
      - ALL
    pids_limit: 50
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
    volumes:
      - type: bind
        source: /run/paganini/sockets/administrador.sock
        target: /run/agent.sock
    # Communication ONLY via Unix socket

  agent-regulatory-watch:
    build:
      context: ./packages/agents
      args:
        AGENT_SOUL: regulatory_watch
    read_only: true
    tmpfs:
      - /tmp:size=10M,noexec
    networks:
      - paganini-external     # Controlled external access
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    pids_limit: 50
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

  # === METACLAW ===
  metaclaw:
    build: ./vendor/metaclaw
    read_only: true
    tmpfs:
      - /tmp:size=50M
    networks:
      - paganini-net           # Receives from kernel
      - paganini-external      # Forwards to LLM providers
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    volumes:
      - metaclaw-skills:/data/skills:rw  # Encrypted volume
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

  # === DATA LAYER ===
  postgres:
    image: pgvector/pgvector:pg16
    networks:
      - paganini-data         # ONLY data network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID               # Postgres needs this
      - SETGID
    volumes:
      - pg-data:/var/lib/postgresql/data:rw
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  # === EGRESS PROXY ===
  egress-proxy:
    image: nginx:alpine
    networks:
      - paganini-external
    volumes:
      - ./infra/security/egress-allowlist.conf:/etc/nginx/conf.d/default.conf:ro
    # Allowlist-based: only whitelisted domains pass through
    # Everything else: 403 Forbidden
    # Logs every request for audit

  # === PINCHTAB ===
  pinchtab:
    build: ./infra/pinchtab
    read_only: true
    tmpfs:
      - /tmp:size=100M
    networks:
      - paganini-net
      - paganini-external      # Needs web access for scraping
    security_opt:
      - seccomp:profiles/chrome-seccomp.json
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

volumes:
  pg-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/paganini/postgres  # Encrypted partition
  metaclaw-skills:
    driver: local

secrets:
  db_password:
    file: ./secrets/db_password.txt    # Injected, not in image
  master_key:
    file: ./secrets/master_key.txt
```

---

## Egress Control (Allowlist)

```nginx
# infra/security/egress-allowlist.conf
# ONLY these domains can be reached from paganini-external network

# LLM Providers (BYOK)
upstream openai { server api.openai.com:443; }
upstream anthropic { server api.anthropic.com:443; }
upstream google { server generativelanguage.googleapis.com:443; }

# Regulatory Sources
upstream cvm { server www.gov.br:443; }
upstream anbima { server www.anbima.com.br:443; }
upstream bacen { server www.bcb.gov.br:443; }

# DD Sources
upstream serasa { server www.serasa.com.br:443; }
upstream receita { server www.receita.fazenda.gov.br:443; }
upstream tjsp { server esaj.tjsp.jus.br:443; }

# Communication
upstream slack { server slack.com:443; }

# EVERYTHING ELSE: BLOCKED
server {
    listen 8443;
    location / {
        # Log blocked requests for audit
        access_log /var/log/nginx/blocked.log;
        return 403 "Domain not in allowlist";
    }
}
```

---

## Seccomp Profiles

### Agent Seccomp (Maximum Restriction)
```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    { "names": ["read", "write", "close", "fstat", "lseek",
                 "mmap", "mprotect", "munmap", "brk",
                 "rt_sigaction", "rt_sigprocmask",
                 "access", "pipe", "select", "sched_yield",
                 "clone", "execve", "exit", "exit_group",
                 "futex", "set_tid_address", "set_robust_list",
                 "openat", "getdents64", "getcwd",
                 "clock_gettime", "clock_nanosleep"],
      "action": "SCMP_ACT_ALLOW" }
  ]
}
```

Blocked: `socket`, `connect`, `bind`, `listen`, `accept` (no network syscalls),
`mount`, `umount`, `ptrace`, `reboot`, `swapon`, `swapoff`, `ioctl` (most).

---

## Runtime Security Monitoring

```yaml
# Daemon: container-watchdog (runs on host)
watchdog:
  interval: 30s
  checks:
    - name: container_escape
      action: "Check /proc/1/cgroup for unexpected entries"
      on_fail: kill_container + alert

    - name: network_violation
      action: "Monitor iptables counters for blocked connections"
      on_fail: log + alert

    - name: resource_abuse
      action: "Check if any container exceeds 90% of memory/CPU limit"
      on_fail: throttle + alert

    - name: filesystem_write
      action: "Verify read-only filesystems haven't been remounted"
      on_fail: kill_container + alert

    - name: process_count
      action: "Verify PID count within limits"
      on_fail: log + alert

    - name: secret_exposure
      action: "Scan container env for plaintext secrets"
      on_fail: kill_container + rotate_secrets + alert
```

---

## Image Supply Chain

```dockerfile
# Every image:
# 1. Built from official slim/distroless base (no extra packages)
# 2. Multi-stage build (build deps don't ship)
# 3. Non-root user (never UID 0)
# 4. No shell in agent images (/usr/sbin/nologin)
# 5. Signed with cosign
# 6. Scanned with trivy before push
# 7. Pinned digests (not tags)

FROM python:3.12-slim@sha256:<pinned_digest> AS builder
# ... build steps ...

FROM gcr.io/distroless/python3-debian12@sha256:<pinned_digest>
COPY --from=builder /app /app
USER nonroot:nonroot
ENTRYPOINT ["python3", "/app/main.py"]
# No CMD, no shell, no apt, no curl, no wget
```

```bash
# CI pipeline
trivy image paganini/agent-administrador:latest --severity HIGH,CRITICAL
cosign sign paganini/agent-administrador:latest
```

---

## Summary

| Container | Network | Filesystem | Caps | Secrets Access |
|-----------|---------|------------|------|---------------|
| Kernel | internal only | read-only + tmpfs | none | Docker secrets |
| Agent (default) | **none** | read-only + tmpfs | none | none |
| Agent (external) | allowlisted egress | read-only + tmpfs | none | none |
| MetaClaw | internal + egress | read-only + skills vol | none | none |
| PinchTab | internal + egress | read-only + tmpfs | none | none |
| Postgres | data only | encrypted volume | setuid/gid | Docker secrets |
| Egress Proxy | external | read-only | none | none |

**Every agent defaults to zero network.** Exceptions are explicit, allowlisted, and logged.
