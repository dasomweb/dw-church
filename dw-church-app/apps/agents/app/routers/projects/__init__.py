"""Projects router — runs the agent pipeline against a tenant.

Exposed endpoints:
  POST /api/agents/projects/{tenant_id}/run     — start the pipeline
  GET  /api/agents/projects/{tenant_id}/status  — get pipeline state
  POST /api/agents/projects/{tenant_id}/advance — approve current stage
  POST /api/agents/projects/{tenant_id}/retry   — reject + retry current stage

State is held per-tenant in an in-process dict. For multi-replica
deployments, swap to Redis or a shared store (Phase 6+).

Auth: every route requires ``Authorization: Bearer $INTERNAL_SERVICE_TOKEN``.
This is the same shared token the apps/server Fastify uses to gate
``/api/v1/internal/*``. Direct user traffic is never expected here — the
admin SPA goes through the apps/server proxy at /api/v1/ai/pipeline.
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException

from app.agents.orchestrator import AgentOrchestrator, PipelineStage
from app.services.adapter_factory import AdapterConfigError, build_adapter
from app.services.ai_service import build_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agents/projects", tags=["agents:projects"])


# ── In-memory orchestrator registry, keyed by tenant_id ──
_orchestrators: dict[str, AgentOrchestrator] = {}


def _require_service_token(authorization: str | None) -> None:
    """Reject unauthenticated traffic.

    The expected header is ``Authorization: Bearer <INTERNAL_SERVICE_TOKEN>``,
    where the token matches the env var of the same name. If the env var is
    unset on this service, every call is rejected — fail-closed is safer
    than a misconfigured deploy that silently lets anything through.
    """
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="INTERNAL_SERVICE_TOKEN not configured on agents service",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    presented = authorization.removeprefix("Bearer ").strip()
    if presented != expected:
        raise HTTPException(status_code=401, detail="Invalid service token")


def _validate_tenant_id(tenant_id: str) -> str:
    try:
        uuid.UUID(tenant_id)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"tenant_id must be a UUID, got {tenant_id!r}",
        ) from e
    return tenant_id


def _get_or_create_orchestrator(tenant_id: str) -> AgentOrchestrator:
    if tenant_id not in _orchestrators:
        try:
            adapter = build_adapter(tenant_id=tenant_id)
        except AdapterConfigError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        _orchestrators[tenant_id] = AgentOrchestrator(
            adapter,
            ai_service=build_ai_service(),
        )
    return _orchestrators[tenant_id]


def _serialize_status(orch: AgentOrchestrator) -> dict[str, Any]:
    return orch.get_status()


@router.post("/{tenant_id}/run")
async def run_pipeline(
    tenant_id: str,
    body: dict[str, Any] = Body(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Start a fresh pipeline run for ``tenant_id``.

    Request body:
        business_description: str  (required)
        site_name:            str  (optional)
    """
    _require_service_token(authorization)
    _validate_tenant_id(tenant_id)
    business_description = (body or {}).get("business_description")
    if not isinstance(business_description, str) or not business_description.strip():
        raise HTTPException(
            status_code=400,
            detail="business_description (non-empty string) is required",
        )
    site_name = (body or {}).get("site_name", "")

    orch = _get_or_create_orchestrator(tenant_id)
    # Reset orchestrator state (but reuse adapter + ai_service) so /run is
    # always a fresh pipeline.
    _orchestrators[tenant_id] = AgentOrchestrator(
        orch._adapter,  # noqa: SLF001 — internal reuse
        orch._ai_service,  # noqa: SLF001
    )
    orch = _orchestrators[tenant_id]

    result = await orch.start(business_description=business_description, site_name=site_name)
    return {
        "tenant_id": tenant_id,
        "stage": orch.stage.value,
        "result": {
            "role":    result.role.value,
            "status":  result.status.value,
            "summary": result.summary,
            "output":  result.output,
            "errors":  result.errors,
            "warnings": result.warnings,
        },
    }


@router.get("/{tenant_id}/status")
async def get_status(
    tenant_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Fetch the current pipeline status for ``tenant_id``.

    Returns 404 if the tenant has no active orchestrator (i.e. /run was
    never called).
    """
    _require_service_token(authorization)
    _validate_tenant_id(tenant_id)
    if tenant_id not in _orchestrators:
        raise HTTPException(
            status_code=404,
            detail=f"No pipeline state for tenant {tenant_id!r}. Call /run first.",
        )
    return {"tenant_id": tenant_id, **_serialize_status(_orchestrators[tenant_id])}


@router.post("/{tenant_id}/advance")
async def advance_pipeline(
    tenant_id: str,
    body: dict[str, Any] | None = Body(default=None),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Approve the current stage's result and run the next stage.

    Optional body:
        modifications: dict  (e.g. {"pages": [...], "theme_config": {...}})

    Returns ``{"completed": true}`` once all four stages finish.
    """
    _require_service_token(authorization)
    _validate_tenant_id(tenant_id)
    if tenant_id not in _orchestrators:
        raise HTTPException(status_code=404, detail="No pipeline running for tenant")
    orch = _orchestrators[tenant_id]
    modifications = (body or {}).get("modifications") if body else None

    next_result = await orch.approve_and_advance(modifications)
    if next_result is None or orch.stage == PipelineStage.COMPLETED:
        return {"tenant_id": tenant_id, "completed": True, "stage": "completed"}

    return {
        "tenant_id": tenant_id,
        "stage": orch.stage.value,
        "result": {
            "role":    next_result.role.value,
            "status":  next_result.status.value,
            "summary": next_result.summary,
            "output":  next_result.output,
            "errors":  next_result.errors,
            "warnings": next_result.warnings,
        },
    }


@router.post("/{tenant_id}/retry")
async def retry_pipeline(
    tenant_id: str,
    body: dict[str, Any] | None = Body(default=None),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Reject current stage's result and re-run the same agent.

    Optional body:
        feedback: str — appended to business_description for the retry.
    """
    _require_service_token(authorization)
    _validate_tenant_id(tenant_id)
    if tenant_id not in _orchestrators:
        raise HTTPException(status_code=404, detail="No pipeline running for tenant")
    orch = _orchestrators[tenant_id]
    feedback = (body or {}).get("feedback", "") if body else ""

    result = await orch.reject_and_retry(feedback=feedback)
    return {
        "tenant_id": tenant_id,
        "stage": orch.stage.value,
        "result": {
            "role":    result.role.value,
            "status":  result.status.value,
            "summary": result.summary,
            "output":  result.output,
            "errors":  result.errors,
            "warnings": result.warnings,
        },
    }
