# Multi-stage build for True Light agents (FastAPI).
#
# Build context = monorepo root. The Dockerfile pulls in the local
# packages/agents-adapter Python package alongside apps/agents.
#
# Required runtime env (Railway):
#   ANTHROPIC_API_KEY            (Planner agent LLM)
#   INTERNAL_SERVICE_TOKEN       (matches apps/server)
#   SERVER_INTERNAL_URL          (apps/server private URL)
#   CORS_ORIGINS                 (comma-separated allowlist)

FROM python:3.12-slim AS base

# OS deps:
#  - build-essential + python3-dev: needed for any wheel that does C build
#  - openssl, ca-certificates: TLS for outbound calls (Anthropic, R2)
#  - curl: for healthcheck/debug
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
      build-essential \
      python3-dev \
      ca-certificates \
      openssl \
      curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# Modern pip + build tooling required for hatchling backend used by
# packages/agents-adapter. Without this `pip install` fails with
# "metadata-generation-failed" on slim base images.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ─── Install local agents-adapter first (workspace dep) ──
COPY packages/agents-adapter/pyproject.toml /srv/packages/agents-adapter/pyproject.toml
COPY packages/agents-adapter/README.md       /srv/packages/agents-adapter/README.md
COPY packages/agents-adapter/src             /srv/packages/agents-adapter/src
# The adapter's block_registry.py needs packages/blocks/src/registry.json
# at runtime (the canonical block-type taxonomy shared with TypeScript).
# Copy it into the adapter's source tree BEFORE `pip install` so hatch's
# force-include rule (pyproject.toml [tool.hatch.build.targets.wheel.
# force-include]) bundles it into the wheel as
# dw_church_adapter/registry.json. Without this, container startup fails
# with FileNotFoundError on the registry load and FastAPI never registers
# /health, so Railway's healthcheck times out.
COPY packages/blocks/src/registry.json       /srv/packages/agents-adapter/src/dw_church_adapter/registry.json
RUN pip install --no-cache-dir /srv/packages/agents-adapter

# ─── Install agents app ──
# Copy requirements first for layer caching (rebuilds only on dep change).
# Strip the local dw-church-agents-adapter line — it's already installed
# above from the local source tree.
COPY apps/agents/requirements.txt /srv/apps/agents/requirements.txt
RUN grep -v -i 'dw-church-agents-adapter' /srv/apps/agents/requirements.txt > /tmp/req.txt \
 && pip install --no-cache-dir -r /tmp/req.txt

COPY apps/agents/ /srv/apps/agents/

WORKDIR /srv/apps/agents

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE ${PORT:-8000}

# Railway terminates TLS at the edge; --proxy-headers makes uvicorn trust
# X-Forwarded-* so generated URLs use https.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
