"""Database module — STUBBED for Phase 4 rewrite.

In True Light the agents service is **stateless**: it does not own any tables.
All persistence (pages, sections, theme, files) lives in apps/server (Fastify
+ Prisma + PostgreSQL schema-per-tenant). Agents call the Fastify server's
``/api/v1/internal/*`` endpoints (Phase 4) using a service token.

This module is kept as a compatibility shim so existing imports of
``init_db`` don't break before Phase 4 wires the orchestrator + adapter.
"""


def init_db() -> None:
    """No-op. Agents service does not own any database state."""
    return None
