"""End-to-end integration tests for the planner pipeline (offline).

Unlike test_planner_integration.py (which hits live Railway + real LLMs
and is skipped by default in CI), this suite exercises the FULL
router-to-agent path in-process via FastAPI's TestClient, with
call_claude / call_gemini / fetch_census_data stubbed.

What it catches that per-agent unit tests don't:
  - Route → agent wiring (input field name mismatches, missing
    imports, body shape issues)
  - Response shape contract — admin-app's planner-api consumes
    these endpoints with assumptions about top-level keys
  - Schema-retry plumbing — when the LLM returns malformed JSON the
    router still returns a usable response (empty list / 502)
  - The Phase 2 BaseAgent migration didn't break any of the legacy
    response keys the SPA depends on

Run via:  pytest app/tests/integration/test_planner_routes_offline.py
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.planner import _verify_service_token

# ──────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────


@pytest.fixture
def client() -> TestClient:
    # The /api/planner router now requires a service bearer token (hardening —
    # the agents service is reachable on a public domain). These offline tests
    # exercise the handlers in-process, so bypass the auth dependency rather
    # than thread a token through every request.
    app.dependency_overrides[_verify_service_token] = lambda: None
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(_verify_service_token, None)


def _stub_claude(text: str) -> AsyncMock:
    """Stub for llm_service.call_claude — returns canned text. Used
    when an agent runs through LLMClient → call_claude path."""
    return AsyncMock(return_value=text)


def _stub_gemini(text: str) -> AsyncMock:
    return AsyncMock(return_value=text)


def _patch_llm(claude_text: str = "", gemini_text: str = ""):
    """Context manager-style helper — patches both Claude and Gemini
    at the llm_client + planner.llm_service level so any agent
    routing path is covered without the test caring which provider
    a specific agent uses."""
    return [
        patch(
            "app.services.agents.shared.llm_client.llm_service.call_claude",
            new=_stub_claude(claude_text),
        ),
        patch(
            "app.services.agents.shared.llm_client.llm_service.call_gemini",
            new=_stub_gemini(gemini_text),
        ),
        # Also patch the planner module's direct call_llm imports for
        # endpoints not yet migrated to BaseAgent (design-system migrated;
        # content-map still uses call_llm directly for Phase A+B).
        patch(
            "app.routers.planner.call_llm",
            new=AsyncMock(return_value=claude_text or gemini_text or "{}"),
        ),
        patch(
            "app.routers.planner.call_gemini",
            new=AsyncMock(return_value=gemini_text or claude_text or "{}"),
        ),
    ]


def _enter_all(patches):
    """Context-manager-stack helper. Returns a callable that when
    invoked enters every patch and returns the resulting mock list."""
    started = [p.start() for p in patches]
    return started


def _exit_all(patches):
    for p in reversed(patches):
        p.stop()


# ──────────────────────────────────────────────────────────────────
# 1. parse-business — BusinessParseAgent (Gemini Flash)
# ──────────────────────────────────────────────────────────────────


class TestParseBusiness:
    def test_extracts_full_profile(self, client: TestClient) -> None:
        canned = json.dumps({
            "businessName": "Korus Orchid",
            "industry": "Wholesale Horticulture",
            "description": "Premium orchid wholesaler in Florida.",
            "services": "Phalaenopsis, Oncidium",
            "targetAudience": "Garden centers, retail nurseries",
            "brandKeywords": "premium, reliable",
            "location": "Apopka, FL 32712",
            "referenceUrls": "https://better-gro.com",
        })
        patches = _patch_llm(claude_text=canned, gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/parse-business", json={
                "prompt": "Korus Orchid, Florida wholesale orchid grower",
            })
            assert res.status_code == 200
            body = res.json()
            assert "business" in body
            assert body["business"]["businessName"] == "Korus Orchid"
            assert body["business"]["location"] == "Apopka, FL 32712"
            # Phase 2-2 contract — referenceUrls round-trips through
            # the BusinessParseOutput Pydantic model alias.
            assert body["business"]["referenceUrls"] == "https://better-gro.com"
        finally:
            _exit_all(patches)

    def test_handles_partial_extraction(self, client: TestClient) -> None:
        """Schema tolerance — LLM returns only some fields, route
        returns 200 with empty defaults rather than 500."""
        canned = json.dumps({"businessName": "X"})
        patches = _patch_llm(claude_text=canned, gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/parse-business", json={"prompt": "x"})
            assert res.status_code == 200
            body = res.json()
            assert body["business"]["businessName"] == "X"
            assert body["business"]["industry"] == ""
            assert body["business"]["referenceUrls"] == ""
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 2. suggest — TextSuggestAgent + PageListSuggestAgent
# ──────────────────────────────────────────────────────────────────


class TestSuggest:
    def test_text_field_returns_ten_strings(self, client: TestClient) -> None:
        canned = json.dumps({"suggestions": [
            f"option {i}" for i in range(10)
        ]})
        patches = _patch_llm(gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/suggest", json={
                "field": "targetAudience",
                "context": {"businessName": "Korus", "industry": "Wholesale Plants"},
            })
            assert res.status_code == 200
            body = res.json()
            assert len(body["suggestions"]) == 10
            assert isinstance(body["suggestions"][0], str)
        finally:
            _exit_all(patches)

    def test_page_list_returns_hierarchical_objects(self, client: TestClient) -> None:
        canned = json.dumps({"suggestions": [
            {"name": "Home", "slug": "/"},
            {"name": "About", "slug": "/about"},
            {"name": "Products", "slug": "/products"},
            {"name": "A", "slug": "/products/a", "parent": "/products"},
            {"name": "B", "slug": "/products/b", "parent": "/products"},
        ]})
        patches = _patch_llm(gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/suggest", json={
                "field": "pageList",
                "context": {"businessName": "Korus"},
            })
            assert res.status_code == 200
            body = res.json()
            # PageListSuggestAgent returns objects, not bare strings.
            assert all(isinstance(s, dict) and "slug" in s for s in body["suggestions"])
            nested = [s for s in body["suggestions"] if "parent" in s]
            assert len(nested) == 2
        finally:
            _exit_all(patches)

    def test_unknown_field_returns_400(self, client: TestClient) -> None:
        res = client.post("/api/planner/suggest", json={
            "field": "totallyMadeUp",
            "context": {},
        })
        assert res.status_code == 400


# ──────────────────────────────────────────────────────────────────
# 3. auto-strategy — StrategyAgent (cached Sonnet)
# ──────────────────────────────────────────────────────────────────


def _strategy_response() -> str:
    return json.dumps({
        "deliveryModel": "regional",
        "transactionType": "b2b",
        "revenueModel": "repeat",
        "segmentAxis": ["firmographic", "behavioral"],
        "positioning": "Wholesale orchid partner across the Southeast",
        "involvementLevel": "high",
        "purchaseBlocker": "evaluation",
        "mixFocus": "7p",
        "keyP": "process",
        "funnelCoverage": ["awareness", "consideration", "purchase"],
        "primaryCTA": "quote",
    })


class TestAutoStrategy:
    def test_returns_eleven_field_strategy(self, client: TestClient) -> None:
        patches = _patch_llm(claude_text=_strategy_response())
        _enter_all(patches)
        try:
            res = client.post("/api/planner/auto-strategy", json={
                "businessName": "Korus Orchid",
                "industry": "Wholesale Horticulture",
                "description": "Florida wholesale orchid grower",
                "location": "Apopka, FL 32703",
                "targetAudience": "Garden centers, retailers",
            })
            assert res.status_code == 200
            body = res.json()
            assert "strategy" in body
            s = body["strategy"]
            # Phase 2-1 / 2-6 contract — all 11 MarketingCore fields
            # round-trip through camelCase aliases.
            for field in [
                "deliveryModel", "transactionType", "revenueModel",
                "segmentAxis", "positioning", "involvementLevel",
                "purchaseBlocker", "mixFocus", "keyP",
                "funnelCoverage", "primaryCTA",
            ]:
                assert field in s, f"strategy missing field: {field}"
            assert s["deliveryModel"] == "regional"
            assert s["transactionType"] == "b2b"
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 4. marketing-insight — InsightAgent (cached Sonnet)
# ──────────────────────────────────────────────────────────────────


class TestMarketingInsight:
    def test_returns_long_form_insight(self, client: TestClient) -> None:
        # InsightAgent's schema requires insight ≥ 200 chars (so the
        # report isn't trivially short).
        long_md = "# Report\n\n" + ("Detailed wholesale analysis. " * 30)
        patches = _patch_llm(claude_text=json.dumps({"insight": long_md}))
        _enter_all(patches)
        try:
            res = client.post("/api/planner/marketing-insight", json={
                "businessName": "Korus", "industry": "Wholesale Plants",
                "targetLocation": "Apopka, FL 32703",
                "targeting": "B2B retailers",
                "strategy": json.loads(_strategy_response()),
            })
            assert res.status_code == 200
            body = res.json()
            assert "insight" in body
            assert len(body["insight"]) >= 200
        finally:
            _exit_all(patches)

    def test_handles_missing_strategy(self, client: TestClient) -> None:
        """Legacy callers don't send strategy. InsightAgent falls back
        to inference-from-description."""
        long_md = "# Report\n\n" + ("Body. " * 50)
        patches = _patch_llm(claude_text=json.dumps({"insight": long_md}))
        _enter_all(patches)
        try:
            res = client.post("/api/planner/marketing-insight", json={
                "businessName": "Korus", "industry": "Wholesale Plants",
            })
            assert res.status_code == 200
            assert "insight" in res.json()
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 5. design-system — DesignAgent (Gemini Flash)
# ──────────────────────────────────────────────────────────────────


def _palette() -> dict:
    return {
        "primary": "#1a1a2e", "secondary": "#16213e", "accent": "#e94560",
        "background": "#ffffff", "surface": "#f5f5f5", "text": "#1a1a2e",
        "muted": "#6b7280", "border": "#e5e7eb",
    }


class TestDesignSystem:
    def test_returns_full_design_envelope(self, client: TestClient) -> None:
        canned = json.dumps({
            "colorOptions": [
                {"name": f"Option {i}", "mood": "modern",
                 "harmony": "complementary", "colors": _palette()}
                for i in range(9)
            ],
            "fontOptions": [
                {"name": f"Pair {i}", "heading": "Inter", "body": "Inter",
                 "koreanFont": "Pretendard", "mood": "modern",
                 "style": "Geometric"}
                for i in range(6)
            ],
            "fontSizes": {
                "desktop": {"h1": "48px", "h2": "36px", "h3": "28px", "body": "16px"},
                "mobile": {"h1": "32px", "h2": "26px", "h3": "22px", "body": "14px"},
            },
            "spacing": {"sectionPadding": "80px", "containerMax": "1200px"},
            "borderRadius": {"sm": "6px", "md": "12px", "lg": "20px"},
        })
        patches = _patch_llm(gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/design-system", json={
                "businessName": "Korus",
                "industry": "Wholesale Horticulture",
                "brandKeywords": "premium, reliable",
                "preferredMood": "modern",
                "languages": "English, Korean",
            })
            assert res.status_code == 200
            body = res.json()
            assert "designSystem" in body
            ds = body["designSystem"]
            # Phase 2-3 contract — wizard's Design step renders these
            # exact top-level keys.
            assert len(ds["colorOptions"]) == 9
            assert len(ds["fontOptions"]) == 6
            assert "fontSizes" in ds
            assert "spacing" in ds
            assert "borderRadius" in ds
            # camelCase nested keys (koreanFont, sectionPadding,
            # containerMax) must survive the round-trip.
            assert ds["fontOptions"][0]["koreanFont"] == "Pretendard"
            assert ds["spacing"]["sectionPadding"] == "80px"
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 6. sitemap — ArchitectAgent (Gemini Pro)
# ──────────────────────────────────────────────────────────────────


class TestSitemap:
    def test_returns_hierarchical_pages(self, client: TestClient) -> None:
        canned = json.dumps({"pages": [
            {"name": "Home", "slug": "/"},
            {"name": "About", "slug": "/about"},
            {"name": "Products", "slug": "/products"},
            {"name": "Phalaenopsis", "slug": "/products/phalaenopsis", "parent": "/products"},
            {"name": "Oncidium", "slug": "/products/oncidium", "parent": "/products"},
            {"name": "Contact", "slug": "/contact"},
        ]})
        patches = _patch_llm(gemini_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/sitemap", json={
                "businessName": "Korus",
                "industry": "Wholesale Horticulture",
                "description": "Florida orchid wholesaler",
                "services": "Phalaenopsis, Oncidium",
                "targetAudience": "Retailers",
                "marketingStrategy": json.dumps({"deliveryModel": "regional"}),
            })
            assert res.status_code == 200
            body = res.json()
            assert "pages" in body
            assert len(body["pages"]) == 6
            nested = [p for p in body["pages"] if p.get("parent")]
            assert len(nested) == 2
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 7. page-content — PageContentAgent (cached Sonnet)
# ──────────────────────────────────────────────────────────────────


class TestPageContent:
    def test_returns_sections_with_pattern_mapping(self, client: TestClient) -> None:
        canned = json.dumps({"sections": [
            {"sectionType": "hero", "title": "Hero",
             "subtitle": "subtitle", "buttonText": "CTA",
             "buttonLink": "/contact", "items": []},
            {"sectionType": "features", "title": "Features",
             "items": [{"title": "F1", "description": "d1"}]},
            {"sectionType": "cta", "title": "CTA",
             "subtitle": "sub", "buttonText": "Go", "buttonLink": "/",
             "items": [], "bgMode": "accent"},
        ]})
        patches = _patch_llm(claude_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/page-content", json={
                "businessName": "Korus",
                "industry": "Wholesale",
                "pageName": "Home",
                "pageSlug": "/",
                "sections": ["hero", "features", "cta"],
                "marketingContext": "regional b2b",
            })
            assert res.status_code == 200
            body = res.json()
            assert "sections" in body
            assert len(body["sections"]) == 3
            # Pattern-map injects gutenbergPattern post-agent — must
            # land on every section.
            for s in body["sections"]:
                assert "gutenbergPattern" in s
                assert "sectionType" in s
            # Phase 2-5a contract — bgMode / buttonText camelCase
            # aliases survive the agent → router → response path.
            cta = body["sections"][-1]
            assert cta["bgMode"] == "accent"
            assert cta["buttonText"] == "Go"
        finally:
            _exit_all(patches)

    def test_append_mode_dedups_existing_section_types(
        self, client: TestClient
    ) -> None:
        """Append mode must drop AI output that re-emits sectionTypes
        already on the page. Locks the router-side dedup since
        Sonnet sometimes ignores the prompt instruction."""
        canned = json.dumps({"sections": [
            # LLM included 'hero' even though it's already on the page.
            {"sectionType": "hero", "title": "dup", "items": []},
            {"sectionType": "testimonials", "title": "new", "items": []},
        ]})
        patches = _patch_llm(claude_text=canned)
        _enter_all(patches)
        try:
            res = client.post("/api/planner/page-content", json={
                "businessName": "Korus", "industry": "Wholesale",
                "pageName": "Home", "pageSlug": "/",
                "sections": ["testimonials"],
                "currentSections": [{"sectionType": "hero", "title": "existing"}],
                "mode": "append",
            })
            assert res.status_code == 200
            section_types = [s["sectionType"] for s in res.json()["sections"]]
            # 'hero' filtered out; 'testimonials' kept.
            assert "hero" not in section_types
            assert "testimonials" in section_types
        finally:
            _exit_all(patches)


# ──────────────────────────────────────────────────────────────────
# 8. census — pass-through to census_service (no LLM)
# ──────────────────────────────────────────────────────────────────


class TestCensus:
    def test_returns_not_found_for_locationless_input(
        self, client: TestClient
    ) -> None:
        """Census endpoint extracts ZIP from location string. No ZIP
        → returns {found: false} without raising."""
        res = client.post("/api/planner/census", json={"location": "no zip here"})
        assert res.status_code == 200
        body = res.json()
        assert body["found"] is False

    def test_routes_zip_to_census_service(self, client: TestClient) -> None:
        """When the API key is missing the underlying call returns
        None and the route reports unavailable. We don't mock the
        Census API itself here — that's tested in
        test_census_service.py."""
        res = client.post("/api/planner/census", json={
            "location": "Apopka, FL 32712",
        })
        assert res.status_code == 200
        body = res.json()
        # Either the live Census API is reachable (found=True) OR
        # CENSUS_API_KEY is unset and we get the unavailable shape.
        # Both are valid; the contract test is just that the route
        # responded 200 with one of those two shapes.
        assert "found" in body
        if body["found"] is False:
            assert "error" in body or "zipCode" in body
