"""HTTP client for apps/server's /api/v1/internal/* endpoints.

Phase 4 implementation. All methods call the Fastify dw-church-api server
using httpx, with the shared service token + tenant id headers attached
at construction time.

Response shape (from apps/server/src/modules/internal/routes.ts):
  - Success: ``{"data": {...}}`` (or ``204 No Content`` for delete)
  - Error:   ``{"error": {"code": "...", "message": "..."}}``

This client unwraps ``data`` for callers and raises InternalApiError
on non-2xx responses with structured error info.
"""

from __future__ import annotations

from typing import Any

import httpx


class InternalApiError(RuntimeError):
    """Raised when an internal API call returns a non-2xx response."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(f"[{status_code}] {code}: {message}")
        self.status_code = status_code
        self.code = code
        self.message = message


def _unwrap(response: httpx.Response) -> Any:
    """Extract ``response.json()['data']`` or raise InternalApiError."""
    if 200 <= response.status_code < 300:
        if response.status_code == 204 or not response.content:
            return None
        body = response.json()
        return body.get("data") if isinstance(body, dict) else body

    code = "INTERNAL_API_ERROR"
    message = response.text
    try:
        body = response.json()
        if isinstance(body, dict) and isinstance(body.get("error"), dict):
            err = body["error"]
            code = err.get("code", code)
            message = err.get("message", message)
    except (ValueError, KeyError):
        pass
    raise InternalApiError(response.status_code, code, message)


class InternalApiClient:
    """Service-to-service client for the dw-church-api Fastify server.

    Wraps httpx with authentication + tenant context headers baked in.

    Args:
        base_url:      e.g. "http://localhost:3001" or "https://api.truelight.app"
        service_token: shared INTERNAL_SERVICE_TOKEN env value
        tenant_id:     tenant uuid for X-Tenant-Id header
        timeout:       per-request timeout in seconds (default 30)
        client:        optional pre-built httpx.AsyncClient (for testing)
    """

    def __init__(
        self,
        *,
        base_url: str,
        service_token: str,
        tenant_id: str,
        timeout: float = 30.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not base_url:
            raise ValueError("base_url is required")
        if not service_token:
            raise ValueError("service_token is required")
        if not tenant_id:
            raise ValueError("tenant_id is required")

        if client is not None:
            self._client = client
        else:
            # Don't set Content-Type as a default header — httpx auto-derives
            # it from the keyword used (json= -> application/json,
            # files= -> multipart/form-data; boundary=...).
            self._client = httpx.AsyncClient(
                base_url=base_url.rstrip("/"),
                timeout=timeout,
                headers={
                    "Authorization":   f"Bearer {service_token}",
                    "X-Tenant-Id":     tenant_id,
                    "X-Service-Agent": "dw-church-agents-adapter",
                },
            )
        self._tenant_id = tenant_id

    async def aclose(self) -> None:
        await self._client.aclose()

    @property
    def tenant_id(self) -> str:
        return self._tenant_id

    # ── Pages ──────────────────────────────────────────────────

    async def list_pages(self) -> list[dict[str, Any]]:
        """GET /api/v1/internal/pages — list all pages for the tenant."""
        resp = await self._client.get("/api/v1/internal/pages")
        result = _unwrap(resp)
        return result if isinstance(result, list) else []

    async def create_page(
        self,
        *,
        title: str,
        slug: str,
        is_home: bool = False,
        status: str = "draft",
        sort_order: int = 0,
    ) -> dict[str, Any]:
        """POST /api/v1/internal/pages — create a page."""
        resp = await self._client.post(
            "/api/v1/internal/pages",
            json={
                "title":     title,
                "slug":      slug,
                "isHome":    is_home,
                "status":    status,
                "sortOrder": sort_order,
            },
        )
        return _unwrap(resp) or {}

    async def update_page(self, page_id: str, **patch: Any) -> dict[str, Any]:
        """PATCH /api/v1/internal/pages/{page_id} — partial update."""
        resp = await self._client.patch(
            f"/api/v1/internal/pages/{page_id}",
            json=patch,
        )
        return _unwrap(resp) or {}

    async def delete_page(self, page_id: str) -> None:
        """DELETE /api/v1/internal/pages/{page_id}."""
        resp = await self._client.delete(f"/api/v1/internal/pages/{page_id}")
        _unwrap(resp)

    # ── Sections ───────────────────────────────────────────────

    async def list_sections(self, page_id: str) -> list[dict[str, Any]]:
        """GET /api/v1/internal/pages/{page_id}/sections."""
        resp = await self._client.get(
            f"/api/v1/internal/pages/{page_id}/sections"
        )
        result = _unwrap(resp)
        return result if isinstance(result, list) else []

    async def create_section(
        self,
        *,
        page_id: str,
        block_type: str,
        props: dict[str, Any],
        sort_order: int,
        is_visible: bool = True,
    ) -> dict[str, Any]:
        """POST /api/v1/internal/sections — create a section on a page."""
        resp = await self._client.post(
            "/api/v1/internal/sections",
            json={
                "pageId":     page_id,
                "blockType":  block_type,
                "props":      props,
                "sortOrder":  sort_order,
                "isVisible":  is_visible,
            },
        )
        return _unwrap(resp) or {}

    async def update_section(self, section_id: str, **patch: Any) -> dict[str, Any]:
        """PATCH /api/v1/internal/sections/{section_id}."""
        resp = await self._client.patch(
            f"/api/v1/internal/sections/{section_id}",
            json=patch,
        )
        return _unwrap(resp) or {}

    async def delete_section(self, section_id: str) -> None:
        """DELETE /api/v1/internal/sections/{section_id}."""
        resp = await self._client.delete(
            f"/api/v1/internal/sections/{section_id}"
        )
        _unwrap(resp)

    # ── Themes ─────────────────────────────────────────────────

    async def apply_theme(self, theme_config: dict[str, Any]) -> dict[str, Any]:
        """PUT /api/v1/internal/themes — replace theme settings."""
        resp = await self._client.put(
            "/api/v1/internal/themes",
            json=theme_config,
        )
        return _unwrap(resp) or {}

    # ── Files (R2) ─────────────────────────────────────────────

    async def upload_image(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        mime_type: str = "image/png",
        entity_type: str = "ai-generated",
    ) -> dict[str, Any]:
        """POST /api/v1/internal/files — multipart upload to R2.

        Returns ``{id, url, storage_key, mime_type, size_bytes}``.
        """
        files = {"file": (filename, image_bytes, mime_type)}
        resp = await self._client.post(
            "/api/v1/internal/files",
            params={"entityType": entity_type},
            files=files,
        )
        return _unwrap(resp) or {}
