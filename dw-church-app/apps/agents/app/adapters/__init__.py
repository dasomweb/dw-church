"""Block adapter base — concrete adapters live in packages/agents-adapter.

DWChurchAdapter (Phase 4) implements BlockAdapter and persists to the
Fastify dw-church-api server via internal HTTP calls.
"""

from app.adapters.base import BlockAdapter

__all__ = ["BlockAdapter"]
