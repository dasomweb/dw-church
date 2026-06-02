"""Internal API client — calls apps/server (Fastify) via /api/v1/internal/*.

The Fastify server exposes a small surface specifically for service-to-service
calls from the agents pipeline. All endpoints require:
- ``Authorization: Bearer <INTERNAL_SERVICE_TOKEN>``
- ``X-Tenant-Id: <tenant_uuid>``

These bypass user JWT auth (super-admin operations are not allowed; tenant
isolation is still enforced via the tenant id).
"""

from dw_church_adapter.internal_api.client import InternalApiClient

__all__ = ["InternalApiClient"]
