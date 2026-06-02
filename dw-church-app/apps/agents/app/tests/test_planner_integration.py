"""Integration tests for the refactored planner pipeline.

Tests run against the DEPLOYED Railway API server (not local) and require
live ANTHROPIC_API_KEY / GEMINI_API_KEY. Skipped by default in CI; set
RUN_LIVE_PLANNER_TESTS=1 to opt in.

Usage:
    RUN_LIVE_PLANNER_TESTS=1 pytest app/tests/test_planner_integration.py -v -s
"""

import json
import os
import sys
import time

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_PLANNER_TESTS") != "1",
    reason="Live planner integration tests require RUN_LIVE_PLANNER_TESTS=1",
)

# Fix Windows encoding for Unicode output
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Railway deployed API server
API_BASE = "https://api-server-production-e398.up.railway.app"
PLANNER_URL = f"{API_BASE}/api/planner"

# Test business data (Korean BBQ restaurant example from planning doc)
TEST_BUSINESS = {
    "businessName": "Seoul Garden BBQ",
    "industry": "Restaurant > Korean BBQ",
    "description": "Authentic Korean BBQ restaurant in Atlanta, featuring premium USDA Prime cuts grilled tableside",
    "services": "Galbi, Bulgogi, Samgyeopsal, Catering, Private Dining",
    "targetAudience": "25-45 age, Asian food enthusiasts, foodies in Atlanta metro",
    "brandKeywords": "Premium, Authentic, Modern Korean, Warm",
    "location": "3456 Peachtree Rd, Atlanta, GA 30326",
}

TIMEOUT = httpx.Timeout(180.0, connect=30.0)


# -- Fixtures --

@pytest.fixture(scope="module")
def http_client():
    """Shared HTTP client for all tests in module."""
    with httpx.Client(timeout=TIMEOUT) as client:
        yield client


# -- 0. Health Check --

class TestHealthCheck:
    """Verify API server is up before running pipeline tests."""

    def test_health(self, http_client: httpx.Client):
        """API server health check."""
        res = http_client.get(f"{API_BASE}/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f"\n  [OK] API server healthy: {res.json()}")

# test_patterns_available was removed: it queried /api/blocks/patterns/list,
# an endpoint backed by the now-deleted Gutenberg PATTERNS dict. Pattern
# routing on the live AI Builder happens server-side via
# apps/server/src/modules/ai/build-pages/pattern-map.ts.


# -- 1. AI Suggest (Business Step) --

class TestSuggest:
    """Test AI suggestions for business fields."""

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_suggest_services(self, http_client: httpx.Client, model: str):
        """AI suggests services based on business context."""
        res = http_client.post(f"{PLANNER_URL}/suggest", json={
            "field": "services",
            "context": TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Suggest failed: {res.text}"
        data = res.json()
        suggestions = data.get("suggestions", [])
        assert len(suggestions) >= 3, f"[{model}] Expected 3+ suggestions, got {len(suggestions)}"
        print(f"\n  [OK] [{model}] Services suggestions ({len(suggestions)}): {suggestions[:3]}...")

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_suggest_target_audience(self, http_client: httpx.Client, model: str):
        """AI suggests target audience."""
        res = http_client.post(f"{PLANNER_URL}/suggest", json={
            "field": "targetAudience",
            "context": TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Suggest failed: {res.text}"
        data = res.json()
        suggestions = data.get("suggestions", [])
        assert len(suggestions) >= 3, f"[{model}] Expected 3+ suggestions, got {len(suggestions)}"
        print(f"\n  [OK] [{model}] Audience suggestions ({len(suggestions)}): {suggestions[:3]}...")

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_suggest_brand_keywords(self, http_client: httpx.Client, model: str):
        """AI suggests brand keywords."""
        res = http_client.post(f"{PLANNER_URL}/suggest", json={
            "field": "brandKeywords",
            "context": TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Suggest failed: {res.text}"
        data = res.json()
        suggestions = data.get("suggestions", [])
        assert len(suggestions) >= 3
        print(f"\n  [OK] [{model}] Brand keywords ({len(suggestions)}): {suggestions[:5]}...")


# -- 2. Analysis Step (Strategy + Design + Insight in parallel) --

class TestAnalysis:
    """Test Phase 1 Analysis: strategy, marketing insight, design system."""

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_auto_strategy(self, http_client: httpx.Client, model: str):
        """AI generates marketing strategy presets."""
        res = http_client.post(f"{PLANNER_URL}/auto-strategy", json={
            **TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Strategy failed: {res.text}"
        data = res.json()
        strategy = data.get("strategy", {})
        assert isinstance(strategy, dict), f"[{model}] Strategy should be dict, got {type(strategy).__name__}"
        assert len(strategy) >= 3, f"[{model}] Expected 3+ strategy keys, got {list(strategy.keys())}"
        print(f"\n  [OK] [{model}] Strategy keys: {list(strategy.keys())}")
        for key in ["positioning", "primaryCTA"]:
            if key in strategy:
                print(f"    {key}: {strategy[key]}")

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_marketing_insight(self, http_client: httpx.Client, model: str):
        """AI generates deep marketing analysis."""
        res = http_client.post(f"{PLANNER_URL}/marketing-insight", json={
            **TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Insight failed: {res.text}"
        data = res.json()
        insight = data.get("insight", "")
        assert len(insight) > 200, f"[{model}] Insight too short ({len(insight)} chars)"
        print(f"\n  [OK] [{model}] Marketing insight: {len(insight)} chars")
        print(f"    Preview: {insight[:150]}...")

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_design_system(self, http_client: httpx.Client, model: str):
        """AI generates 9 color palettes + 6 font combinations."""
        res = http_client.post(f"{PLANNER_URL}/design-system", json={
            **TEST_BUSINESS,
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Design failed: {res.text}"
        data = res.json()
        ds = data.get("designSystem", {})
        assert isinstance(ds, dict), f"[{model}] designSystem should be dict"

        colors = ds.get("colorOptions", [])
        fonts = ds.get("fontOptions", [])
        print(f"\n  [OK] [{model}] Design system: {len(colors)} colors, {len(fonts)} fonts")
        assert len(colors) >= 3, f"[{model}] Expected 3+ color options, got {len(colors)}"
        assert len(fonts) >= 2, f"[{model}] Expected 2+ font options, got {len(fonts)}"

        # Validate color structure
        if colors:
            c = colors[0]
            assert "colors" in c or "name" in c, f"[{model}] Color option missing expected fields: {c}"
            print(f"    First color: {c.get('name', 'unnamed')} — {c.get('mood', '')}")
        if fonts:
            f = fonts[0]
            print(f"    First font: {f.get('heading', '')} + {f.get('body', '')}")


# -- 3. Sitemap Step --

class TestSitemap:
    """Test Phase 3 sitemap generation."""

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_sitemap_generation(self, http_client: httpx.Client, model: str):
        """AI generates sitemap with 10-20 pages."""
        res = http_client.post(f"{PLANNER_URL}/sitemap", json={
            **TEST_BUSINESS,
            "marketingStrategy": json.dumps({"positioning": "Premium Korean BBQ", "primaryCTA": "book"}),
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Sitemap failed: {res.text}"
        data = res.json()
        pages = data.get("pages", [])
        assert isinstance(pages, list), f"[{model}] pages should be list"
        assert len(pages) >= 4, f"[{model}] Expected 4+ pages, got {len(pages)}"

        # Verify structure
        for p in pages[:3]:
            assert "name" in p, f"[{model}] Page missing 'name': {p}"
            assert "slug" in p, f"[{model}] Page missing 'slug': {p}"

        top_level = [p for p in pages if not p.get("parent")]
        children = [p for p in pages if p.get("parent")]
        print(f"\n  [OK] [{model}] Sitemap: {len(pages)} pages ({len(top_level)} top-level, {len(children)} children)")
        for p in pages[:6]:
            indent = "    " if not p.get("parent") else "      +-"
            print(f"  {indent} {p['name']} ({p['slug']})")


# -- 4. Content Map (NEW endpoint) --

class TestContentMap:
    """Test Phase 2 bulk content generation — the NEW /content-map endpoint."""

    SAMPLE_SITEMAP = [
        {"name": "Home", "slug": "/"},
        {"name": "Menu", "slug": "/menu"},
        {"name": "About", "slug": "/about"},
        {"name": "Gallery", "slug": "/gallery"},
        {"name": "Contact", "slug": "/contact"},
    ]

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_content_map_generation(self, http_client: httpx.Client, model: str):
        """AI generates content for ALL pages at once."""
        res = http_client.post(f"{PLANNER_URL}/content-map", json={
            **TEST_BUSINESS,
            "pages": self.SAMPLE_SITEMAP,
            "strategy": {"positioning": "Premium Korean BBQ", "primaryCTA": "book"},
            "designSystem": {},
            "model": model,
        })
        assert res.status_code == 200, f"[{model}] Content map failed: {res.text}"
        data = res.json()
        content_map = data.get("contentMap", {})
        assert isinstance(content_map, dict), f"[{model}] contentMap should be dict"

        # Every actual page should have content
        for page in self.SAMPLE_SITEMAP:
            slug = page["slug"]
            assert slug in content_map, f"[{model}] Missing content for {slug}"
            entry = content_map[slug]
            assert "pageName" in entry, f"[{model}] Missing pageName for {slug}"
            assert "sections" in entry, f"[{model}] Missing sections for {slug}"
            sections = entry["sections"]
            assert len(sections) >= 2, f"[{model}] Expected 2+ sections for {slug}, got {len(sections)}"

        print(f"\n  [OK] [{model}] Content map: {len(content_map)} pages")
        for slug, entry in content_map.items():
            sections = entry["sections"]
            types = [s.get("sectionType", "?") for s in sections]
            print(f"    {entry['pageName']} ({slug}): {len(sections)} sections — {types}")

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_content_has_pattern_keys(self, http_client: httpx.Client, model: str):
        """Each section should have a pattern key (the field name is
        `gutenbergPattern` for backwards compatibility — apps/server's
        pattern-map.ts consumes it as a generic string key, not as actual
        Gutenberg)."""
        res = http_client.post(f"{PLANNER_URL}/content-map", json={
            **TEST_BUSINESS,
            "pages": [{"name": "Home", "slug": "/"}],
            "strategy": {},
            "designSystem": {},
            "model": model,
        })
        assert res.status_code == 200
        content_map = res.json().get("contentMap", {})
        home = content_map.get("/", {})
        sections = home.get("sections", [])

        for s in sections:
            pattern = s.get("gutenbergPattern", "")
            assert pattern, f"[{model}] Section missing pattern key: {s.get('sectionType')}"
            print(f"\n  [OK] [{model}] {s.get('sectionType')} -> {pattern}")

    def test_content_map_fallback_on_empty_pages(self, http_client: httpx.Client):
        """Empty pages list returns empty content map."""
        res = http_client.post(f"{PLANNER_URL}/content-map", json={
            **TEST_BUSINESS,
            "pages": [],
            "model": "gemini",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["contentMap"] == {}
        print("\n  [OK] Empty pages returns empty contentMap")


# Build-page integration tests were removed alongside the /build-page endpoint:
# block persistence is now the server's job (apps/server's POST
# /api/v1/ai/build-pages), so the agent service no longer ships its own
# pattern → block expander. Coverage for the live build path lives in
# apps/server's integration tests.


# -- 6. Full Pipeline E2E (Business -> Analysis -> Sitemap -> Content) --

class TestFullPipeline:
    """End-to-end test: simulate the complete PlannerWizard flow."""

    @pytest.mark.parametrize("model", ["gemini", "claude"])
    def test_full_pipeline(self, http_client: httpx.Client, model: str):
        """Run entire 5-step pipeline against deployed API."""
        print(f"\n{'='*60}")
        print(f"  FULL PIPELINE E2E — Model: {model.upper()}")
        print(f"{'='*60}")

        # -- Step 1: Business (no API call, just data) --
        business = TEST_BUSINESS.copy()
        print(f"\n  [1/5] Business: {business['businessName']}")

        # -- Step 2: Analysis (Strategy + Design in parallel) --
        print(f"\n  [2/5] Analysis ({model})...")
        t0 = time.time()

        strategy_res = http_client.post(f"{PLANNER_URL}/auto-strategy", json={**business, "model": model})
        assert strategy_res.status_code == 200, f"Strategy failed: {strategy_res.text}"
        strategy = strategy_res.json().get("strategy", {})
        assert isinstance(strategy, dict), f"Strategy should be dict, got {type(strategy).__name__}"

        design_res = http_client.post(f"{PLANNER_URL}/design-system", json={**business, "model": model})
        assert design_res.status_code == 200, f"Design failed: {design_res.text}"
        design_system = design_res.json().get("designSystem", {})

        t_analysis = time.time() - t0
        print(f"    Strategy: {len(strategy)} keys -- {list(strategy.keys())[:4]}")
        colors = design_system.get("colorOptions", [])
        fonts = design_system.get("fontOptions", [])
        print(f"    Design: {len(colors)} colors, {len(fonts)} fonts")
        print(f"    Time: {t_analysis:.1f}s")

        assert len(strategy) >= 2, f"Strategy too sparse: {strategy}"
        assert len(colors) >= 1 or len(fonts) >= 1, "Design system empty"

        # -- Step 3: Sitemap --
        print(f"\n  [3/5] Sitemap ({model})...")
        t0 = time.time()

        sitemap_res = http_client.post(f"{PLANNER_URL}/sitemap", json={
            **business,
            "marketingStrategy": json.dumps(strategy),
            "model": model,
        })
        assert sitemap_res.status_code == 200, f"Sitemap failed: {sitemap_res.text}"
        sitemap = sitemap_res.json().get("pages", [])
        t_sitemap = time.time() - t0

        actual_pages = [p for p in sitemap if not p.get("slug", "").startswith("#")]
        print(f"    Pages: {len(sitemap)} total, {len(actual_pages)} actual")
        for p in actual_pages[:5]:
            print(f"      {p['name']} ({p['slug']})")
        print(f"    Time: {t_sitemap:.1f}s")

        assert len(actual_pages) >= 3, f"Too few pages: {len(actual_pages)}"

        # -- Step 4: Content Map --
        print(f"\n  [4/5] Content Map ({model})...")
        t0 = time.time()

        content_res = http_client.post(f"{PLANNER_URL}/content-map", json={
            **business,
            "pages": sitemap,
            "strategy": strategy,
            "designSystem": design_system,
            "model": model,
        })
        assert content_res.status_code == 200, f"Content map failed: {content_res.text}"
        content_map = content_res.json().get("contentMap", {})
        t_content = time.time() - t0

        total_sections = sum(len(e["sections"]) for e in content_map.values())
        print(f"    Content: {len(content_map)} pages, {total_sections} total sections")
        for slug, entry in list(content_map.items())[:4]:
            types = [s.get("sectionType", "?") for s in entry["sections"]]
            print(f"      {entry['pageName']}: {types}")
        print(f"    Time: {t_content:.1f}s")

        assert len(content_map) >= 3, f"Too few content pages: {len(content_map)}"
        assert total_sections >= 10, f"Too few total sections: {total_sections}"

        # /build-page (block expansion) was removed — apps/server now owns
        # block persistence via POST /api/v1/ai/build-pages. The agent
        # service's job ends after content-map.

        # -- Summary --
        total_time = t_analysis + t_sitemap + t_content
        print(f"\n  {'-'*50}")
        print(f"  [OK] PIPELINE COMPLETE [{model.upper()}]")
        print(f"    Total time: {total_time:.1f}s")
        print(f"    Pages: {len(actual_pages)} | Sections: {total_sections}")
        print(f"    Strategy keys: {list(strategy.keys())}")
        print(f"    Design: {len(colors)} colors, {len(fonts)} fonts")
        print(f"  {'-'*50}")
