"""Tests for InternalApiClient — construction + HTTP behavior with respx."""

from __future__ import annotations

import httpx
import pytest
import respx

from dw_church_adapter import InternalApiClient
from dw_church_adapter.internal_api.client import InternalApiError


BASE = "http://api.test"
TOKEN = "test-token"
TENANT = "00000000-0000-0000-0000-000000000001"
PAGE_ID = "11111111-1111-1111-1111-111111111111"
SECTION_ID = "22222222-2222-2222-2222-222222222222"


def _client() -> InternalApiClient:
    return InternalApiClient(
        base_url=BASE,
        service_token=TOKEN,
        tenant_id=TENANT,
    )


# ── construction ──────────────────────────────────────────────

def test_construct_with_required_args() -> None:
    client = _client()
    assert client.tenant_id == TENANT


def test_rejects_empty_base_url() -> None:
    with pytest.raises(ValueError):
        InternalApiClient(base_url="", service_token="t", tenant_id="x")


def test_rejects_empty_token() -> None:
    with pytest.raises(ValueError):
        InternalApiClient(base_url="http://x", service_token="", tenant_id="x")


def test_rejects_empty_tenant_id() -> None:
    with pytest.raises(ValueError):
        InternalApiClient(base_url="http://x", service_token="t", tenant_id="")


def test_strips_trailing_slash_from_base_url() -> None:
    client = InternalApiClient(
        base_url="http://localhost:3001/",
        service_token="t",
        tenant_id="x",
    )
    assert str(client._client.base_url).rstrip("/") == "http://localhost:3001"


def test_default_headers_include_auth_and_tenant() -> None:
    client = InternalApiClient(
        base_url="http://x", service_token="my-token", tenant_id="my-tenant",
    )
    h = client._client.headers
    assert h["Authorization"] == "Bearer my-token"
    assert h["X-Tenant-Id"] == "my-tenant"
    # Content-Type is intentionally not set on the client — httpx derives it
    # per-request (json= -> application/json, files= -> multipart/form-data).
    assert "Content-Type" not in h or h.get("Content-Type") == ""


# ── pages ─────────────────────────────────────────────────────

@respx.mock
async def test_list_pages_unwraps_data() -> None:
    respx.get(f"{BASE}/api/v1/internal/pages").mock(
        return_value=httpx.Response(
            200,
            json={"data": [{"id": PAGE_ID, "title": "Home"}]},
        )
    )
    client = _client()
    pages = await client.list_pages()
    assert pages == [{"id": PAGE_ID, "title": "Home"}]
    await client.aclose()


@respx.mock
async def test_create_page_sends_camel_case_payload() -> None:
    route = respx.post(f"{BASE}/api/v1/internal/pages").mock(
        return_value=httpx.Response(
            201,
            json={"data": {"id": PAGE_ID, "title": "About"}},
        )
    )
    client = _client()
    page = await client.create_page(title="About", slug="about", is_home=False)
    assert page["id"] == PAGE_ID
    sent = route.calls[0].request
    body = sent.read().decode()
    assert '"isHome": false' in body or '"isHome":false' in body
    assert '"title": "About"' in body or '"title":"About"' in body
    await client.aclose()


@respx.mock
async def test_create_page_sends_auth_headers() -> None:
    route = respx.post(f"{BASE}/api/v1/internal/pages").mock(
        return_value=httpx.Response(201, json={"data": {}})
    )
    client = _client()
    await client.create_page(title="t", slug="s")
    req = route.calls[0].request
    assert req.headers["Authorization"] == f"Bearer {TOKEN}"
    assert req.headers["X-Tenant-Id"] == TENANT
    await client.aclose()


@respx.mock
async def test_update_page_sends_patch() -> None:
    respx.patch(f"{BASE}/api/v1/internal/pages/{PAGE_ID}").mock(
        return_value=httpx.Response(200, json={"data": {"id": PAGE_ID, "title": "X"}})
    )
    client = _client()
    page = await client.update_page(PAGE_ID, title="X")
    assert page["title"] == "X"
    await client.aclose()


@respx.mock
async def test_delete_page_returns_none_on_204() -> None:
    respx.delete(f"{BASE}/api/v1/internal/pages/{PAGE_ID}").mock(
        return_value=httpx.Response(204)
    )
    client = _client()
    result = await client.delete_page(PAGE_ID)
    assert result is None
    await client.aclose()


# ── sections ──────────────────────────────────────────────────

@respx.mock
async def test_list_sections() -> None:
    respx.get(f"{BASE}/api/v1/internal/pages/{PAGE_ID}/sections").mock(
        return_value=httpx.Response(
            200, json={"data": [{"id": SECTION_ID, "block_type": "hero_banner"}]}
        )
    )
    client = _client()
    sections = await client.list_sections(PAGE_ID)
    assert sections[0]["id"] == SECTION_ID
    await client.aclose()


@respx.mock
async def test_create_section_includes_pageId_in_body() -> None:
    route = respx.post(f"{BASE}/api/v1/internal/sections").mock(
        return_value=httpx.Response(
            201,
            json={"data": {"id": SECTION_ID, "block_type": "hero_banner"}},
        )
    )
    client = _client()
    section = await client.create_section(
        page_id=PAGE_ID,
        block_type="hero_banner",
        props={"title": "Hi"},
        sort_order=0,
    )
    assert section["id"] == SECTION_ID
    sent_body = route.calls[0].request.read().decode()
    assert PAGE_ID in sent_body
    assert "hero_banner" in sent_body
    await client.aclose()


@respx.mock
async def test_update_section_patches_only_provided_fields() -> None:
    route = respx.patch(f"{BASE}/api/v1/internal/sections/{SECTION_ID}").mock(
        return_value=httpx.Response(200, json={"data": {"id": SECTION_ID}})
    )
    client = _client()
    await client.update_section(SECTION_ID, props={"title": "New"})
    body = route.calls[0].request.read().decode()
    assert '"props"' in body
    assert '"title": "New"' in body or '"title":"New"' in body
    await client.aclose()


@respx.mock
async def test_delete_section_204() -> None:
    respx.delete(f"{BASE}/api/v1/internal/sections/{SECTION_ID}").mock(
        return_value=httpx.Response(204)
    )
    client = _client()
    await client.delete_section(SECTION_ID)
    await client.aclose()


# ── theme ─────────────────────────────────────────────────────

@respx.mock
async def test_apply_theme() -> None:
    route = respx.put(f"{BASE}/api/v1/internal/themes").mock(
        return_value=httpx.Response(200, json={"data": {"id": "t1"}})
    )
    client = _client()
    result = await client.apply_theme({
        "templateName": "modern",
        "colors": {"primary": "#000"},
    })
    assert result["id"] == "t1"
    sent = route.calls[0].request.read().decode()
    assert "modern" in sent
    await client.aclose()


# ── files ─────────────────────────────────────────────────────

@respx.mock
async def test_upload_image_uses_multipart() -> None:
    route = respx.post(f"{BASE}/api/v1/internal/files").mock(
        return_value=httpx.Response(
            201,
            json={
                "data": {
                    "id": "f1",
                    "url": "https://cdn.truelight.app/x.png",
                    "storage_key": "tenant_acme/ai-generated/x.png",
                }
            },
        )
    )
    client = _client()
    result = await client.upload_image(
        image_bytes=b"\x89PNG\r\n\x1a\nfake",
        filename="x.png",
    )
    assert result["url"].endswith("x.png")
    req = route.calls[0].request
    # Multipart content type with boundary, not application/json
    assert req.headers["Content-Type"].startswith("multipart/form-data")
    # entityType passed as query param
    assert "entityType=ai-generated" in str(req.url)
    await client.aclose()


# ── error handling ───────────────────────────────────────────

@respx.mock
async def test_404_raises_internal_api_error() -> None:
    respx.get(f"{BASE}/api/v1/internal/pages").mock(
        return_value=httpx.Response(
            404,
            json={"error": {"code": "TENANT_NOT_FOUND", "message": "Tenant not found"}},
        )
    )
    client = _client()
    with pytest.raises(InternalApiError) as exc_info:
        await client.list_pages()
    assert exc_info.value.status_code == 404
    assert exc_info.value.code == "TENANT_NOT_FOUND"
    assert "Tenant not found" in exc_info.value.message
    await client.aclose()


@respx.mock
async def test_500_with_non_json_body_still_raises_cleanly() -> None:
    respx.get(f"{BASE}/api/v1/internal/pages").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )
    client = _client()
    with pytest.raises(InternalApiError) as exc_info:
        await client.list_pages()
    assert exc_info.value.status_code == 500
    await client.aclose()
