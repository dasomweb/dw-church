"""Tests for DWChurchAdapter — verifies it correctly delegates to InternalApiClient."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from dw_church_adapter import DWChurchAdapter, InternalApiClient


def make_adapter(client: InternalApiClient | None = None) -> tuple[DWChurchAdapter, AsyncMock]:
    """Build an adapter with a fully-mocked client."""
    if client is None:
        # AsyncMock spec'd against InternalApiClient methods
        client = AsyncMock(spec=InternalApiClient)
        client.tenant_id = "00000000-0000-0000-0000-000000000001"
    adapter = DWChurchAdapter(client)
    return adapter, client  # type: ignore[return-value]


# (Removed legacy DWChurchAdapter alias test — the previous b2bsmart code
# kept a `DWChurchAdapter` alias for backward compat with an earlier
# DW-AI rename. After Phase 11-A3 the canonical name IS DWChurchAdapter,
# so the alias-identity test became `assert X is X`. Dropped.)


# ── delegation: pages ────────────────────────────────────────


async def test_create_page_returns_id_from_client_response() -> None:
    adapter, client = make_adapter()
    client.create_page.return_value = {"id": "abc", "title": "Home"}
    page_id = await adapter.create_page(title="Home", slug="home", is_home=True)
    assert page_id == "abc"
    client.create_page.assert_awaited_once_with(
        title="Home",
        slug="home",
        is_home=True,
        status="published",
        sort_order=0,
    )


async def test_create_page_raises_when_response_missing_id() -> None:
    adapter, client = make_adapter()
    client.create_page.return_value = {}
    with pytest.raises(RuntimeError, match="no id"):
        await adapter.create_page(title="X", slug="x")


async def test_get_page_finds_matching_id() -> None:
    adapter, client = make_adapter()
    client.list_pages.return_value = [
        {"id": "p1", "title": "Home"},
        {"id": "p2", "title": "About"},
    ]
    page = await adapter.get_page("p2")
    assert page["title"] == "About"


async def test_get_page_raises_lookup_error_when_missing() -> None:
    adapter, client = make_adapter()
    client.list_pages.return_value = []
    with pytest.raises(LookupError):
        await adapter.get_page("ghost")


async def test_delete_page_delegates() -> None:
    adapter, client = make_adapter()
    await adapter.delete_page("p1")
    client.delete_page.assert_awaited_once_with("p1")


# ── delegation: sections ─────────────────────────────────────


async def test_create_section_returns_id() -> None:
    adapter, client = make_adapter()
    client.create_section.return_value = {"id": "s1"}
    section_id = await adapter.create_section(
        page_id="p1",
        block_type="hero_banner",
        props={"title": "Hi"},
        sort_order=0,
    )
    assert section_id == "s1"


async def test_update_section_delegates_with_kwargs() -> None:
    adapter, client = make_adapter()
    client.update_section.return_value = {"id": "s1"}
    await adapter.update_section("s1", props={"title": "X"})
    client.update_section.assert_awaited_once_with("s1", props={"title": "X"})


async def test_delete_section_delegates() -> None:
    adapter, client = make_adapter()
    await adapter.delete_section("s1")
    client.delete_section.assert_awaited_once_with("s1")


# ── apply_pattern: integrates expand_pattern + create_section ──


async def test_apply_pattern_creates_one_section_per_top_level_block() -> None:
    adapter, client = make_adapter()
    # Each create_section call returns a unique id
    ids = iter(["s1", "s2", "s3"])
    client.create_section.side_effect = lambda **_: {"id": next(ids)}

    new_ids = await adapter.apply_pattern(
        page_id="p1",
        pattern_name="hero-section",
        context={"site_name": "Acme", "tagline": "Best."},
    )
    assert new_ids == ["s1"]
    client.create_section.assert_awaited_once()
    call_kwargs = client.create_section.await_args.kwargs
    assert call_kwargs["page_id"] == "p1"
    assert call_kwargs["block_type"] == "hero_banner"
    assert call_kwargs["props"]["title"] == "Acme"
    assert call_kwargs["sort_order"] == 0


async def test_apply_pattern_assigns_sequential_sort_order() -> None:
    adapter, client = make_adapter()
    counter = {"i": 0}

    def make_section(**kwargs: Any) -> dict[str, str]:
        counter["i"] += 1
        return {"id": f"s{counter['i']}"}

    client.create_section.side_effect = make_section

    # Use a pattern with a single top-level block; verify starting_sort_order
    new_ids = await adapter.apply_pattern(
        page_id="p1",
        pattern_name="cta-section",
        context={
            "cta_headline": "H",
            "cta_description": "D",
            "cta_button": "Go",
        },
        starting_sort_order=5,
    )
    assert new_ids == ["s1"]
    assert client.create_section.await_args.kwargs["sort_order"] == 5


async def test_apply_pattern_emits_dedicated_block_with_items() -> None:
    """features-grid now uses the dedicated `features_grid` block with items[]."""
    adapter, client = make_adapter()
    client.create_section.return_value = {"id": "s1"}

    await adapter.apply_pattern(
        page_id="p1",
        pattern_name="features-grid",
        context={
            "features_title": "Why us",
            "features_items": [
                {"title": "Fast", "description": "Very fast."},
                {"title": "Secure", "description": "End-to-end encryption."},
            ],
        },
    )
    kwargs = client.create_section.await_args.kwargs
    assert kwargs["block_type"] == "features_grid"
    items = kwargs["props"]["items"]
    assert len(items) == 2
    assert items[0]["title"] == "Fast"


# ── theme + files ────────────────────────────────────────────


async def test_apply_design_system_delegates() -> None:
    adapter, client = make_adapter()
    config = {"templateName": "modern", "colors": {"primary": "#000"}}
    await adapter.apply_design_system(config)
    client.apply_theme.assert_awaited_once_with(config)


async def test_upload_image_returns_url() -> None:
    adapter, client = make_adapter()
    client.upload_image.return_value = {
        "id": "f1",
        "url": "https://cdn.truelight.app/x.png",
    }
    url = await adapter.upload_image(
        image_bytes=b"PNGdata",
        filename="x.png",
    )
    assert url == "https://cdn.truelight.app/x.png"


async def test_upload_image_raises_when_response_missing_url() -> None:
    adapter, client = make_adapter()
    client.upload_image.return_value = {"id": "f1"}
    with pytest.raises(RuntimeError, match="no url"):
        await adapter.upload_image(image_bytes=b"x", filename="x.png")


async def test_tenant_id_proxies_to_client() -> None:
    adapter, _client = make_adapter()
    assert adapter.tenant_id == "00000000-0000-0000-0000-000000000001"
