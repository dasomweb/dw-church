"""Web Planner — AI website planning pipeline.

Ported from DW-Studio's web planner with Gutenberg block output.
Pipeline: Business → Suggest → Marketing → Strategy → Design System → Sitemap → Page Content → Gutenberg Blocks
"""

import asyncio
import json
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.services.agents.architect import (
    ArchitectAgent,
    SitemapInput,
)
from app.services.agents.business import (
    PAGE_LIST_FIELD,
    TEXT_SUGGEST_FIELDS,
    BusinessParseAgent,
    BusinessParseInput,
    PageListSuggestAgent,
    SuggestInput,
    TextSuggestAgent,
)
from app.services.agents.copywriter import (
    PageContentAgent,
    PageContentInput,
)
from app.services.agents.design import (
    DesignAgent,
    DesignInput,
)
from app.services.agents.shared.church_voice import CHURCH_VOICE
from app.services.agents.shared.church_content_reference import CHURCH_CANON
from app.services.agents.shared.retry import SchemaValidationError
from app.services.agents.strategy import (
    CensusSnapshot,
    InsightAgent,
    InsightInput,
    StrategyAgent,
    StrategyDecision,
    StrategyInput,
)
from app.services.planner.census_service import (
    extract_zip_from_location,
    fetch_census_data,
)
from app.services.planner.llm_service import call_gemini, call_llm, extract_json

logger = logging.getLogger(__name__)
def _verify_service_token(authorization: str | None = Header(default=None)) -> None:
    """Router-level auth — require ``Authorization: Bearer $INTERNAL_SERVICE_TOKEN``.

    The agents service is reachable on a public Railway domain, but every
    legitimate caller is api-server's planner proxy (planner-proxy/
    agents-client.ts AND builder-routes/routes.ts), which always sends this
    header. Enforcing it here closes the hole where anyone could hit
    /api/planner/* directly and burn LLM credits — without breaking the proxy.
    /health stays open (it's a top-level route in main.py, not on this router).
    Fail-closed: if INTERNAL_SERVICE_TOKEN is unset on this service, reject all.
    """
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="INTERNAL_SERVICE_TOKEN not configured on agents service")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    if authorization.removeprefix("Bearer ").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid service token")


router = APIRouter(prefix="/api/planner", tags=["planner"], dependencies=[Depends(_verify_service_token)])


# ── Request Models ──

class SuggestRequest(BaseModel):
    field: str
    context: dict = {}
    model: str = "claude"


class MarketingInsightRequest(BaseModel):
    businessName: str = ""
    industry: str = ""
    description: str = ""
    targetLocation: str = ""
    # Legacy frontend sends censusData as a pre-formatted string;
    # accepted for backward compat but the router now also fetches the
    # raw census snapshot itself when a ZIP is extractable from
    # targetLocation, and prefers that typed snapshot in the prompt.
    censusData: str = ""
    targeting: str = ""
    # Upstream StrategyDecision (from /auto-strategy). Optional — when
    # present the InsightAgent picks an analysis frame from the
    # (deliveryModel × transactionType) matrix instead of defaulting to
    # ZIP-centric consumer demographics. This is what makes the report
    # correct for wholesale, online B2C, B2B SaaS, and international-
    # trade businesses where local Census is mostly irrelevant. The
    # frontend's PlannerWizard awaits autoStrategy first and feeds its
    # camelCase result here verbatim.
    strategy: dict | None = None
    # 'en' (default) | 'ko'. Operator opts into Korean via the wizard's
    # language toggle; default is English so reports don't surprise
    # operators of US/international businesses.
    language: str = "en"
    model: str = "claude"


class AutoStrategyRequest(BaseModel):
    businessName: str = ""
    industry: str = ""
    description: str = ""
    # Frontend sends a location string; router uses it to fetch the
    # typed census snapshot directly so the prompt sees structured
    # data, not just a hand-formatted summary string.
    location: str = ""
    targetAudience: str = ""
    censusSummary: str = ""  # legacy fallback if location has no ZIP
    language: str = "en"
    model: str = "claude"


class DesignSystemRequest(BaseModel):
    businessName: str = ""
    industry: str = ""
    brandKeywords: str = ""
    preferredColors: str = ""
    preferredMood: str = ""
    demographics: str = ""
    languages: str = ""
    model: str = "claude"


class SitemapRequest(BaseModel):
    businessName: str = ""
    industry: str = ""
    description: str = ""
    services: str = ""
    targetAudience: str = ""
    marketingStrategy: str = ""
    language: str = "en"
    model: str = "claude"


class PageContentRequest(BaseModel):
    businessName: str = ""
    industry: str = ""
    pageName: str = ""
    pageSlug: str = ""
    # Empty list → server picks a default composition based on pageName
    # (see PAGE_SECTION_DEFAULTS / _guess_sections_for_page).
    sections: list[str] = []
    designSystem: dict = {}
    marketingContext: str = ""
    language: str = "en"
    model: str = "claude"
    # ── In-builder context (used by the per-page "AI 추천" button) ──
    # currentSections lets the LLM see what the user already has on the page
    # so it can either avoid duplicates (mode=append) or use the existing
    # tone/topics as inspiration (mode=replace).
    currentSections: list[dict] = []
    # "replace" — generate full page from scratch (default; matches legacy
    # behavior). "append" — generate only sections that complement what's
    # already there, never duplicating existing sectionTypes.
    mode: str = "replace"


# ── 0. Parse free-text prompt into BusinessInfo ──

class ParseBusinessRequest(BaseModel):
    prompt: str
    # Kept for API back-compat with the SPA, but ignored — BusinessParseAgent
    # always uses Gemini Flash (cost-optimized for this extraction task).
    # Phase 2-2 cost note: Sonnet here was ~50× the cost for marginal
    # quality gain; Flash handles structured extraction from short
    # descriptions reliably.
    model: str = "gemini"


@router.post("/parse-business")
async def parse_business(body: ParseBusinessRequest) -> dict:
    """Parse a free-text business description into structured fields.

    Wired through BusinessParseAgent so the JSON-shape retry policy and
    per-agent observability cover this endpoint, and the cost-optimized
    Gemini Flash choice is locked in (operator/SPA model arg ignored)."""
    agent = BusinessParseAgent()
    try:
        result = await agent.run(BusinessParseInput(prompt=body.prompt))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        logger.error("BusinessParseAgent schema validation failed: %s", e)
        # Don't 500 — return an empty profile so the wizard's Business
        # step still loads and the operator can fill in manually.
        return {"business": {}}
    # Match the legacy response shape: { business: {camelCase fields} }
    return {"business": result.model_dump(by_alias=True)}


# ── 0-B. Census Data ──

class CensusRequest(BaseModel):
    location: str = ""


@router.post("/census")
async def get_census(body: CensusRequest) -> dict:
    """Extract ZIP from location and fetch US Census demographics."""
    from app.services.planner.census_service import extract_zip_from_location, fetch_census_data

    zip_code = extract_zip_from_location(body.location)
    if not zip_code:
        return {"found": False, "error": "No ZIP code found in location"}

    data = await fetch_census_data(zip_code)
    if not data:
        return {"found": False, "zipCode": zip_code, "error": "Census data unavailable"}

    return {"found": True, **data}


# ── 1. AI Suggest ──

@router.post("/suggest")
async def suggest(body: SuggestRequest) -> dict:
    """Generate AI suggestions for a specific field.

    Phase 2-2: routed through TextSuggestAgent (10 chip-style strings —
    Gemini Flash-Lite for cost) or PageListSuggestAgent (sitemap with
    parent/child — Gemini Flash for hierarchical thinking). Field name
    selects the agent; unknown fields 400 like before."""
    agent_input = SuggestInput(field=body.field, context=body.context or {})

    if body.field == PAGE_LIST_FIELD:
        page_agent = PageListSuggestAgent()
        try:
            page_out = await page_agent.run(agent_input)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except SchemaValidationError as e:
            logger.error("PageListSuggestAgent schema validation failed: %s", e)
            return {"suggestions": []}
        # Same shape the SPA expects: list of {name, slug, parent?}
        return {"suggestions": [s.model_dump(exclude_none=True) for s in page_out.suggestions]}

    if body.field in TEXT_SUGGEST_FIELDS:
        text_agent = TextSuggestAgent()
        try:
            text_out = await text_agent.run(agent_input)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except SchemaValidationError as e:
            logger.error("TextSuggestAgent schema validation failed: %s", e)
            return {"suggestions": []}
        # Cap at 10 — the LLM occasionally returns more than asked.
        return {"suggestions": text_out.suggestions[:10]}

    raise HTTPException(status_code=400, detail=f"Unknown field: {body.field}")


# ── Shared helpers ──

def _normalize_language(raw: str | None) -> str:
    """Clamp the wizard-provided language string to one of {'en','ko'}.

    Anything else (typo, legacy 'auto', null) falls back to English so
    operators never get surprised by a language they didn't pick. The
    OutputLanguage Literal in the agent domain re-validates this at
    Pydantic time, so this guard is belt-and-braces."""
    if isinstance(raw, str) and raw.lower() == "ko":
        return "ko"
    return "en"


# ── 2. Marketing Insight (InsightAgent) ──

async def _fetch_census(location: str) -> CensusSnapshot | None:
    """Fetch the typed Census snapshot for a location string. Returns
    None when the string has no ZIP, the API key isn't configured, or
    the API call fails — agents handle the None case explicitly with a
    "no census data, do not invent numbers" prompt directive."""
    zip_code = extract_zip_from_location(location or "")
    if not zip_code:
        return None
    raw = await fetch_census_data(zip_code)
    if not raw:
        return None
    try:
        return CensusSnapshot.model_validate(raw)
    except Exception:  # noqa: BLE001 — defensive, never fail the request
        logger.warning("CensusSnapshot validation failed for ZIP %s", zip_code)
        return None


@router.post("/marketing-insight")
async def marketing_insight(body: MarketingInsightRequest) -> dict:
    """Generate deep marketing analysis. Wired through InsightAgent so
    the prompt receives a typed Census snapshot (ground truth) and
    schema-level retries recover from invalid LLM output. When the
    caller provides an upstream StrategyDecision, the agent uses it to
    pick the right analysis frame (local-B2C census-centric vs
    regional-B2B wholesale vs national-B2C online vs international
    trade vs B2G) instead of defaulting to ZIP demographics."""
    census = await _fetch_census(body.targetLocation)

    # Upstream strategy is optional and arrives as camelCase JSON. Try
    # to validate it into the typed StrategyDecision; on failure (older
    # frontend, partially filled object) silently drop to None — the
    # InsightAgent handles the missing-strategy case explicitly with
    # the "infer from description" fallback in its prompt.
    strategy_obj: StrategyDecision | None = None
    if body.strategy:
        try:
            strategy_obj = StrategyDecision.model_validate(body.strategy)
        except Exception:  # noqa: BLE001
            logger.info("InsightAgent: strategy payload didn't validate, ignoring")

    agent = InsightAgent()
    try:
        result = await agent.run(InsightInput(
            businessName=body.businessName,
            industry=body.industry,
            description=body.description,
            targetLocation=body.targetLocation,
            targeting=body.targeting,
            census=census,
            strategy=strategy_obj,
            language=_normalize_language(body.language),
        ))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        # Schema retries exhausted — surface the real cause so the SPA
        # toast says something more useful than a generic 500.
        logger.error("InsightAgent schema validation failed: %s", e)
        raise HTTPException(status_code=502, detail="LLM output failed validation")
    return {"insight": result.insight}


# ── 3. Auto Strategy (StrategyAgent) ──

@router.post("/auto-strategy")
async def auto_strategy(body: AutoStrategyRequest) -> dict:
    """AI determines marketing strategy presets. Wired through
    StrategyAgent for typed output, schema retries, and Census
    grounding."""
    census = await _fetch_census(body.location)
    agent = StrategyAgent()
    try:
        decision = await agent.run(StrategyInput(
            businessName=body.businessName,
            industry=body.industry,
            description=body.description,
            location=body.location,
            targetAudience=body.targetAudience,
            census=census,
            language=_normalize_language(body.language),
        ))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        logger.error("StrategyAgent schema validation failed: %s", e)
        raise HTTPException(status_code=502, detail="LLM output failed validation")
    # Match the legacy response shape: { strategy: {...} } with camelCase
    # field names. Pydantic's model_dump(by_alias=True) emits the alias
    # form (segmentAxis, involvementLevel, etc.) so the frontend's
    # existing parser keeps working.
    return {"strategy": decision.model_dump(by_alias=True)}


# ── 4. Design System (DesignAgent) ──

@router.post("/design-system")
async def generate_design_system(body: DesignSystemRequest) -> dict:
    """Generate 9 color palettes + 6 font combinations → theme.json ready.

    Phase 2-3: routed through DesignAgent on Gemini Flash. Schema-typed
    output catches Flash's occasional "drop one color slot in palette
    7" bug at validation time so the wizard never renders a
    half-broken palette."""
    agent = DesignAgent()
    try:
        decision = await agent.run(DesignInput(
            businessName=body.businessName,
            industry=body.industry,
            brandKeywords=body.brandKeywords,
            preferredColors=body.preferredColors,
            preferredMood=body.preferredMood,
            demographics=body.demographics,
            languages=body.languages,
        ))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        logger.error("DesignAgent schema validation failed: %s", e)
        raise HTTPException(status_code=502, detail="LLM output failed validation")
    return {"designSystem": decision.model_dump(by_alias=True)}


# ── 5. Sitemap (ArchitectAgent) ──

@router.post("/sitemap")
async def generate_sitemap(body: SitemapRequest) -> dict:
    """Generate sitemap as JSON with parent-child hierarchy.

    Phase 2-4: routed through ArchitectAgent on Gemini Pro. Reasoning
    quality matters here because every downstream agent (Copywriter,
    Build) regenerates from this page list, so a missed-parent or
    wrong-nesting cascades into 10+ bad pages."""
    agent = ArchitectAgent()
    try:
        decision = await agent.run(SitemapInput(
            businessName=body.businessName,
            industry=body.industry,
            description=body.description,
            services=body.services,
            targetAudience=body.targetAudience,
            marketingStrategy=body.marketingStrategy,
            language=_normalize_language(body.language),
        ))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        logger.error("ArchitectAgent schema validation failed: %s", e)
        # Don't 502 — return an empty list so the wizard's Sitemap
        # step shows the empty-state and the operator can hand-author.
        # Upgrading to 502 here would force operators to restart the
        # whole wizard.
        return {"pages": []}
    return {"pages": [s.model_dump(exclude_none=True) for s in decision.pages]}


# ── Section-order policy ────────────────────────────────────────────
#
# AI-generated pages must follow a predictable layout: hero variants
# always at the top (so the page leads with impact), CTA variants
# always at the bottom (so the page closes with an action). Without
# this, Sonnet occasionally returns sections in a different order than
# we requested — most often putting a generic "hero" mid-page after a
# stats block, or scattering CTAs in the middle.
#
# The reorder is stable inside each bucket: heroes preserve the order
# they came in (matters when a page has both hero + page-hero), CTAs
# preserve the order between them, the middle keeps every other
# section's relative position.

_HERO_SECTION_TYPES: frozenset[str] = frozenset({
    "hero", "hero-section", "hero-split", "hero-text", "hero-form", "hero-map",
    "hero_banner", "hero_full_width", "hero_split", "hero_image_slider",
    "page-hero", "banner-slider", "banner_slider",
})
_CTA_SECTION_TYPES: frozenset[str] = frozenset({
    "cta", "cta-section", "call_to_action", "call-to-action",
    "subscribe", "newsletter-signup", "newsletter_signup",
    "subscribe-form", "subscribe_form",
})


# ── Church content-module page structure enforcement ──
#
# A page whose PURPOSE is to surface a content module (설교/주보/목회칼럼/
# 영상/앨범/예배안내/교역자/연혁/행사/게시판) must follow ONE fixed shape:
#
#     page-hero  →  one intro text block  →  the module's DATA block
#
# e.g. 목회칼럼 = page-hero + intro text + recent_columns. The copywriter
# sometimes renders these as a generic text-image/gallery instead of the
# data block, so we enforce the shape deterministically after generation.
# Keyword (matched against page name + slug, lowercased) → data-block
# sectionType. Order matters — earlier, more specific keywords win.
_CONTENT_MODULE_KEYWORDS: list[tuple[tuple[str, ...], str]] = [
    (("sermon", "설교", "말씀", "preach"), "sermons"),
    (("bulletin", "주보"), "bulletins"),
    (("column", "칼럼", "목회"), "columns"),
    (("video", "영상", "찬양"), "videos"),
    (("album", "앨범", "사진", "gallery", "갤러리"), "albums"),
    (("worship", "예배", "모임", "schedule"), "worship-schedule"),
    (("staff", "교역자", "clergy", "섬기는"), "clergy"),
    (("event", "행사", "소식"), "events"),
    (("history", "연혁", "발자취"), "history"),
    (("board", "게시판", "공지", "notice"), "board"),
]


def _detect_content_module(name: str, slug: str) -> str | None:
    """Return the content-module sectionType this page is about, or None.

    Home ('/') is intentionally NOT matched — it aggregates several modules
    (hero → pastor-message → worship → sermons → events → newcomer) and must
    stay free-form. Only single-purpose content pages get the fixed shape.
    """
    s = (slug or "").strip().lower()
    if s in ("/", "", "home", "#home"):
        return None
    hay = f"{name} {slug}".lower()
    for keywords, section in _CONTENT_MODULE_KEYWORDS:
        if any(k in hay for k in keywords):
            return section
    return None


def _enforce_content_module_structure(page: dict, sections: list[dict]) -> list[dict] | None:
    """If `page` is a church content module, force its sections to exactly
    [page-hero, intro text, <data block>]. Returns the new list, or None when
    the page is not a content module (caller keeps the LLM output as-is).

    The hero + intro COPY is reused from the LLM's own output for this page
    (so the text is still AI-written for the church) — we only fix the
    STRUCTURE: compact hero, one plain text block, then the DB-driven block.
    """
    module = _detect_content_module(str(page.get("name", "")), str(page.get("slug", "")))
    if not module:
        return None

    def _is_hero(sec: dict) -> bool:
        return str(sec.get("sectionType", "")).lower() in _HERO_SECTION_TYPES

    # 1. Hero — reuse the LLM's hero copy if present; always render compact.
    hero_src = next((s for s in sections if _is_hero(s)), None)
    hero = {
        "sectionType": "page-hero",
        "title": (hero_src or {}).get("title") or page.get("name", ""),
        "subtitle": (hero_src or {}).get("subtitle", ""),
        "eyebrow": (hero_src or {}).get("eyebrow", ""),
        "imagePrompt": (hero_src or {}).get("imagePrompt", ""),
    }

    # 2. Intro text — reuse the LLM's first non-hero textual section as a plain
    #    text block (keep its copy); synthesize a minimal one if none.
    intro_src = next(
        (s for s in sections
         if not _is_hero(s)
         and (s.get("title") or s.get("description") or s.get("content") or s.get("subtitle"))),
        None,
    )
    intro = {
        "sectionType": "text",
        "title": (intro_src or {}).get("title") or page.get("name", ""),
        "subtitle": (intro_src or {}).get("subtitle", ""),
        "description": (intro_src or {}).get("description") or (intro_src or {}).get("content", ""),
        "eyebrow": (intro_src or {}).get("eyebrow", ""),
    }

    # 3. The DATA block — DB-driven, no LLM-authored items. Title left empty so
    #    the storefront block renders its own heading.
    data_block = {"sectionType": module, "title": ""}

    return [hero, intro, data_block]


def _reorder_sections_by_role(sections: list[dict]) -> list[dict]:
    """Put hero variants first, CTA variants last, leave the rest in
    their relative order. No-op for empty/single-section lists. **No
    fallback insertion** — if the LLM omitted a CTA, that is reported
    upstream (validation) rather than silently filled with code-level
    defaults. See feedback-no-hardcoded-defaults.

    Operator-uploaded page-content from /page-content has the
    section-types-to-make list as input, but Sonnet's response order
    doesn't always match — and even when it does, the operator can
    add a 'cta' section to a list that already has one at the front
    by accident. Centralized reorder keeps the storefront layout
    sane regardless.
    """
    if not isinstance(sections, list) or len(sections) <= 1:
        return sections
    heroes: list[dict] = []
    ctas: list[dict] = []
    middle: list[dict] = []
    for s in sections:
        if not isinstance(s, dict):
            continue
        st = str(s.get("sectionType") or "")
        if st in _HERO_SECTION_TYPES:
            heroes.append(s)
        elif st in _CTA_SECTION_TYPES:
            ctas.append(s)
        else:
            middle.append(s)
    return heroes + middle + ctas


# ── 6. Page Content → Gutenberg Section Mapping ──

# Site-level header/footer come from designSystem (headerStyle + menus),
# not from page sections. The legacy "site-header"/"site-footer" mappings
# were removed in v2.1.0 — Planner no longer requests them as page sections.
SECTION_TO_PATTERN = {
    "page-hero": "page-hero",
    "hero": "hero-section",
    "hero-split": "hero-split",
    # Future hero variants — pattern-map degrades these to page-hero today,
    # the dedicated form/map renderers ship in a later phase.
    "hero-form": "hero-form",
    "hero-map":  "hero-map",
    # Web pattern blocks (web-block-patterns-reference §2)
    "stats":      "stats-numbers",
    "subscribe":  "subscribe",
    "logo-bar":   "logo-bar",
    "about": "about-section",
    "features": "features-grid",
    "services": "features-grid",
    "cta": "cta-section",
    "testimonials": "testimonials",
    "pricing": "pricing-table",
    "team": "team-members",
    "gallery": "gallery-showcase",
    "contact": "contact",
    "faq": "faq",
    "blog": "post-list",
    "post-list": "post-list",
    "text": "text-block",
    "text-split": "text-split",
    "text-cta": "text-cta",
    "text-quote": "text-quote",
    "text-list": "text-list",
    "hero-text": "hero-text",
    "text-image": "text-image",
    "image-text": "image-text",
    "carousel": "carousel",
    "logo-grid": "logo-grid",
    "two-columns": "two-columns",
    # Process / "How we work" — distinct from features (parallel) since
    # it implies sequence and renders with numbered indicators.
    "steps": "steps",
    "process": "steps",
    "process-steps": "steps",
    "how-we-work": "steps",
    "how-it-works": "steps",
    "workflow": "steps",
    # Tabbed category filter + card grid — Stanislav "Unsere
    # Kategorien". Distinct from layout-tabs (children blocks per tab).
    "category-tabs": "category-tabs",
    "category-filter": "category-tabs",
    "tab-grid": "category-tabs",
    "filtered-grid": "category-tabs",
    # ── Church content modules (dw-church) ──
    # These are DB-driven data blocks: the LLM only picks the sectionType
    # and writes a section title/eyebrow — the actual items (설교/주보/…)
    # are pulled from /api/v1/{resource} at render time, registered by the
    # operator in the admin app. build-pages/pattern-map.ts maps each of
    # these patterns to the matching True Light data block_type.
    "sermons": "recent-sermons",
    "recent-sermons": "recent-sermons",
    "bulletins": "recent-bulletins",
    "recent-bulletins": "recent-bulletins",
    "columns": "recent-columns",
    "recent-columns": "recent-columns",
    "videos": "video-board",
    "video-board": "video-board",
    "albums": "album-gallery",
    "album-gallery": "album-gallery",
    "worship-schedule": "schedule-board",
    "schedule": "schedule-board",
    "schedule-board": "schedule-board",
    "clergy": "staff-grid",
    "staff-grid": "staff-grid",
    "pastors": "staff-grid",
    "events": "event-grid",
    "event-grid": "event-grid",
    "history": "history-timeline",
    "history-timeline": "history-timeline",
    "board": "board",
    "notices": "board",
    "pastor-message": "pastor-message",
    "greeting": "pastor-message",
    "newcomer": "newcomer-info",
    "new-family": "newcomer-info",
    "newcomer-form": "newcomer-form",
    "newcomer-registration": "newcomer-form",
    "새가족등록": "newcomer-form",
    "cells": "cell-grid",
    "cell-grid": "cell-grid",
    "small-groups": "cell-grid",
    "목장": "cell-grid",
    "giving": "giving-info",
    "giving-info": "giving-info",
    "donation": "giving-info",
    "헌금": "giving-info",
}


@router.post("/page-content")
async def generate_page_content(body: PageContentRequest) -> dict:
    """Generate full page content with section-to-pattern mapping.

    Behavior summary
      - sections empty           → guess by page name (PAGE_SECTION_DEFAULTS)
      - mode == "replace"        → produce a complete page (legacy behavior)
      - mode == "append"         → produce only NEW sections that complement
                                   the user's existing currentSections
                                   (never repeats an existing sectionType)
      - currentSections present  → fed back into the prompt as context so the
                                   LLM can match the established tone, even
                                   in replace mode

    Returns sections with actual content + mapped Gutenberg pattern names.
    """
    # The caller MUST supply the section composition. Previously this
    # endpoint silently fell back to a hard-coded page-name → sections
    # map (PAGE_SECTION_DEFAULTS), which meant every site with an empty
    # `sections` request got the same boilerplate composition that
    # looked AI-generated but wasn't. Fail-loud instead — operator /
    # caller must decide what's on the page. See
    # feedback-no-hardcoded-defaults.
    if not body.sections:
        raise HTTPException(
            status_code=400,
            detail=(
                "page-content requires `sections` — no code-level fallback "
                "is filled. Call /sitemap or /content-map first to let the "
                "LLM decide the page composition."
            ),
        )
    requested_sections = body.sections

    existing_types: list[str] = []
    if body.currentSections:
        for s in body.currentSections:
            t = s.get("sectionType") if isinstance(s, dict) else None
            if isinstance(t, str) and t:
                existing_types.append(t)

    is_append = body.mode == "append" and len(existing_types) > 0
    if is_append:
        # In append mode, drop any requested types that are already on
        # the page so the LLM can't duplicate. If nothing remains, the
        # caller asked to add sections that are all already present —
        # raise instead of inventing "safe additions" (testimonials/cta)
        # the operator didn't request. See feedback-no-hardcoded-defaults.
        sections_to_make = [s for s in requested_sections if s not in existing_types]
        if not sections_to_make:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Every requested section is already on this page. "
                    "Choose different section types or switch to "
                    "mode=replace — the server does not invent "
                    "additional sections."
                ),
            )
    else:
        sections_to_make = requested_sections

    # Compact textual snapshot of what's already on the page so the LLM can
    # match tone without us shipping the entire props blob.
    existing_summary = ""
    if body.currentSections:
        bullets: list[str] = []
        for s in body.currentSections[:8]:  # cap to avoid blowing the prompt budget
            if not isinstance(s, dict):
                continue
            t = str(s.get("sectionType") or s.get("gutenbergPattern") or "section")
            title = str(s.get("title") or "").strip()
            sub = str(s.get("subtitle") or s.get("description") or "").strip()
            line = f"- {t}: {title}" + (f" — {sub[:80]}" if sub else "")
            bullets.append(line)
        if bullets:
            existing_summary = (
                "현재 페이지에 이미 있는 섹션 (참고용, 톤 일관성 유지):\n"
                + "\n".join(bullets)
            )

    # Phase 2-5a: route through CopywriterAgent on Sonnet with prompt
    # caching. Static section-type guide + items-shape examples live
    # in the agent's cached system block; per-page inputs (business /
    # page name / sections / design / marketing context / mode) here
    # in the user prompt. The per-section AI button fires multiple
    # times per builder session, so cache hits compound.
    agent = PageContentAgent()
    try:
        decision = await agent.run(PageContentInput(
            businessName=body.businessName,
            industry=body.industry,
            pageName=body.pageName,
            pageSlug=body.pageSlug,
            sectionsToMake=sections_to_make,
            existingSummary=existing_summary,
            mode="append" if is_append else "replace",
            marketingContext=body.marketingContext,
            designSystem=body.designSystem or {},
            language=_normalize_language(body.language),
        ))
        sections_typed = decision.sections
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SchemaValidationError as e:
        logger.error("PageContentAgent schema validation failed: %s", e)
        # Empty list rather than 502 — the builder can show a clear
        # error toast and the operator can retry without losing state.
        sections_typed = []

    # Convert typed sections back to dicts for downstream consumers.
    sections: list[dict] = [s.model_dump(by_alias=True, exclude_defaults=False)
                            for s in sections_typed]

    # Defensive: in append mode, Sonnet occasionally re-emits an existing
    # sectionType despite the instruction. Filter those out so the
    # builder doesn't render duplicates.
    if is_append and existing_types:
        existing_set = set(existing_types)
        sections = [s for s in sections if s.get("sectionType") not in existing_set]

    # Layout policy: hero first, CTA last. Sonnet doesn't always
    # respect the requested order — e.g. asked for hero-features-cta,
    # returned features-hero-cta with the hero in the middle. The
    # reorder is stable so non-hero / non-CTA blocks keep their
    # relative order from the LLM's response.
    sections = _reorder_sections_by_role(sections)

    # Map each section to a Gutenberg pattern.
    for section in sections:
        section_type = section.get("sectionType", "text")
        section["gutenbergPattern"] = SECTION_TO_PATTERN.get(section_type, "text-block")

    return {
        "sections": sections,
        "pageName": body.pageName,
        "pageSlug": body.pageSlug,
        "mode": body.mode,
    }


# ── 6-B. Content Map — bulk content for ALL pages ──

class ContentMapRequest(BaseModel):
    """Generate content for all pages at once (Phase 2: Content Planning)."""

    businessName: str = ""
    industry: str = ""
    description: str = ""
    services: str = ""
    targetAudience: str = ""
    pages: list[dict] = []  # [{name, slug, parent?}]
    strategy: dict = {}
    designSystem: dict = {}
    crawlContext: str = ""  # Formatted crawl analysis from reference sites
    # Optional per-page operator instructions, keyed by page slug
    # ({"/about": "지속가능성·인증 강조", ...}). Phase-1 of the
    # structured-context rework: the operator can finally steer a single
    # page without it leaking into the global brief for every other page.
    # Empty / absent → prompts are byte-identical to before (no
    # regression). When present, the note is injected verbatim as the
    # highest-priority instruction for that page in BOTH Phase A
    # (strategy) and Phase B (copy).
    pageNotes: dict[str, str] = {}
    # Phase-2: full (un-truncated) analysis as discrete fields. The
    # client used to .slice(0,3000) these into crawlContext, so anything
    # past the cut never reached the agent. Now passed whole — Phase A
    # (Gemini Flash, large context) distils per-page specifics from the
    # full text into each page's strategy, and Phase B writes from that
    # distillation. No global truncation anywhere. Absent → unchanged.
    marketingInsight: str = ""
    competitiveAnalysis: str = ""
    model: str = "claude"


# PAGE_SECTION_DEFAULTS and _guess_sections_for_page were removed. They
# were a hard-coded `page-name keyword → section list` table that the
# routes used as a silent fallback when the LLM either failed or wasn't
# called at all, producing template-shaped sections (always "hero,
# features, about, testimonials, cta" for /home, etc.) that operators
# mistook for AI output. The endpoints now require an explicit
# `sections` payload from the caller — there is no code-level guess.
# See feedback-no-hardcoded-defaults.


# Pages per AI call. Historically 2 (a 4-page batch doubled output
# tokens and per-call latency scales with output size; the only reason
# for >1 was amortising the big shared prompt across pages for cost).
#
# Phase-3 of the context rework drops this to 1 — true per-page
# generation. This is now optimal on every axis:
#   - Phase 2 removed the global crawl/insight blob from the Phase-B
#     prompt, so the per-call fixed preamble is small. The old cost
#     argument for batching (don't repeat a huge prompt per page) no
#     longer holds — repeating a small prompt per page is cheap.
#   - Smallest possible output per call → lowest per-call latency.
#     With the Semaphore(5) gate, N pages run in ceil(N/5) fast waves.
#   - Quality: the model focuses on ONE page with exactly that page's
#     strategy/evidence/operator-note — no cross-page context dilution.
#   - Failure isolation: one page's LLM/JSON failure no longer blanks
#     its batch-mates. Only that page comes back empty; the wizard's
#     missing-page check surfaces just it for retry.
BATCH_SIZE = 1


@router.post("/content-map")
async def generate_content_map(body: ContentMapRequest) -> dict:
    """Generate content via 2-phase pipeline:

    Phase A: Content Strategist — defines page purposes, key messages,
             and cross-page information architecture (no duplication).
    Phase B: Copywriter — writes actual section copy for each page,
             guided by the strategy from Phase A.
    """
    actual_pages = [p for p in body.pages if not p.get("slug", "").startswith("#")]
    if not actual_pages:
        return {"contentMap": {}}

    strategy_str = json.dumps(body.strategy, ensure_ascii=False) if body.strategy else "N/A"
    crawl_ctx = f"\n{body.crawlContext}\n" if body.crawlContext else ""
    page_list_str = "\n".join(f"  - {p['name']} ({p['slug']})" for p in actual_pages)

    # Operator per-page instructions. Only pages the operator actually
    # annotated appear here; absent → this whole block is "" and the
    # prompt is unchanged from before.
    page_notes = {
        slug: note.strip()
        for slug, note in (body.pageNotes or {}).items()
        if isinstance(note, str) and note.strip()
    }
    operator_block = ""
    if page_notes:
        lines = "\n".join(
            f"  - {slug}: {note}" for slug, note in page_notes.items()
        )
        operator_block = (
            "\n[OPERATOR PAGE INSTRUCTIONS — HIGHEST PRIORITY]\n"
            "The site owner gave explicit instructions for these pages. "
            "Their purpose/keyMessage/contentNotes MUST reflect these "
            "exactly, overriding any generic pattern:\n"
            f"{lines}\n"
        )

    # ── Phase A: Content Strategy (the per-page router) ──
    # One AI call that reads the FULL analysis and distils it into
    # per-page structured strategy. This is the architectural pivot:
    # instead of Phase B re-ingesting a globally-truncated blob, Phase A
    # routes the relevant facts to each page (contentNotes + evidence),
    # and Phase B writes from that. Phase A runs on Gemini Flash (large
    # context, cheap) so the full text fits with no slicing.
    analysis_sections = ""
    if body.marketingInsight.strip():
        analysis_sections += (
            f"\n[MARKETING INSIGHT — full report]\n{body.marketingInsight.strip()}\n"
        )
    if body.competitiveAnalysis.strip():
        analysis_sections += (
            f"\n[COMPETITIVE ANALYSIS — full]\n{body.competitiveAnalysis.strip()}\n"
        )
    if crawl_ctx.strip():
        analysis_sections += (
            f"\n[REFERENCE / CRAWL CONTEXT]\n{crawl_ctx.strip()}\n"
        )

    strategy_prompt = f"""You are a senior content strategist for a {body.industry} website.

This is a Christian church website. Frame every purpose / keyMessage in a
pastoral, faith-rooted voice — think about a visitor's spiritual journey and
how to welcome them into the community, NOT a customer sales funnel. Speak of
성도/이웃/방문자, 예배·말씀·섬김·공동체 — never 고객/전환/마케팅 혜택.

Church: "{body.businessName}"
Description: {body.description}
Services: {body.services}
Target audience: {body.targetAudience}
Marketing strategy: {strategy_str}

[ALL ANALYSIS DATA — read in full, then ROUTE the specifics to the
right page. Do not summarise globally; pull the concrete facts each
individual page needs.]
{analysis_sections if analysis_sections else "(no extra analysis provided)"}

All pages on this website:
{page_list_str}
{operator_block}
For EACH page, define:
1. "purpose" — Why does this page exist? What should a visitor learn or do here? (1-2 sentences)
2. "keyMessage" — The single most important thing this page communicates (1 sentence)
3. "uniqueAngle" — What makes this page's content different from ALL other pages? (1 sentence)
4. "targetAction" — What specific action should the visitor take after reading?
5. "contentNotes" — Specific information that MUST appear on this page and NOWHERE else (2-3 bullet points)
6. "evidence" — Concrete, page-relevant facts pulled FROM THE ANALYSIS
   ABOVE that the copywriter should use on THIS page: specific numbers,
   credentials, competitor gaps to beat, customer-segment language,
   pricing/positioning cues. 2-4 short bullets. This is how the full
   analysis reaches the copy without a global blob — be specific and
   page-targeted, never generic. Empty array if nothing applies.

CRITICAL RULES:
- NO two pages should have the same keyMessage or purpose
- Each page must cover DIFFERENT information — zero content overlap
- Be specific to THIS business — mention actual products, services, processes
- Route analysis facts to the page that needs them (pricing facts →
  pricing/quote page, credibility facts → about, etc.)
- Think about the customer journey: what do they need at each step?

Return JSON only:
{{
  "/": {{
    "purpose": "...",
    "keyMessage": "...",
    "uniqueAngle": "...",
    "targetAction": "...",
    "contentNotes": ["...", "...", "..."],
    "evidence": ["...", "..."]
  }},
  "/about": {{...}}
}}"""

    # Phase A is structured-output strategy work: bullet-style purpose /
    # keyMessage / uniqueAngle — high-volume but low-quality-bar. We
    # always run this on Gemini Flash regardless of body.model (which
    # governs Phase B copywriting where word-level quality matters).
    # Saves ~20s vs Sonnet on a typical 10-page sitemap.
    page_strategies: dict = {}
    try:
        result = await call_gemini(strategy_prompt, max_tokens=6000, model="gemini-2.5-flash")
        page_strategies = extract_json(result) or {}
        logger.info("Phase A: Content strategy for %d pages (gemini-flash)", len(page_strategies))
    except Exception as e:
        logger.warning("Phase A (gemini-flash) failed: %s — falling back to %s", e, body.model)
        try:
            result = await call_llm(strategy_prompt, max_tokens=6000, model=body.model)
            page_strategies = extract_json(result) or {}
            logger.info("Phase A: Content strategy for %d pages (fallback)", len(page_strategies))
        except Exception as e2:
            logger.warning("Phase A fallback also failed: %s", e2)

    # ── Phase B: Copywriting (batched, parallel) ──
    # Use page strategies to write actual section content per page.
    #
    # Each batch is one LLM call covering BATCH_SIZE pages. We run all
    # batches concurrently with asyncio.gather instead of awaiting them
    # sequentially — for a 10-page sitemap that's the difference between
    # 5×60s ≈ 5 minutes (was hitting AGENTS_TIMEOUT) and max(60s) ≈ 1
    # minute. The semaphore caps concurrency at 5 so a 50-page site
    # doesn't fan out 25 simultaneous LLM calls and trip provider rate
    # limits.

    content_map: dict[str, dict] = {}
    batch_semaphore = asyncio.Semaphore(5)

    async def process_batch(batch_start: int, batch: list[dict]) -> dict[str, dict]:
        # Build per-page strategy context for this batch
        batch_strategy_ctx = ""
        for p in batch:
            ps = page_strategies.get(p["slug"], {})
            note = page_notes.get(p["slug"], "")
            # Emit a per-page block when there's strategy OR an operator
            # note — a note-only page must still reach the copywriter.
            if (isinstance(ps, dict) and ps) or note:
                ps = ps if isinstance(ps, dict) else {}
                block = f"""
Page: {p['name']} ({p['slug']})
  Purpose: {ps.get('purpose', '')}
  Key message: {ps.get('keyMessage', '')}
  Unique angle: {ps.get('uniqueAngle', '')}
  Target action: {ps.get('targetAction', '')}
  Must include: {json.dumps(ps.get('contentNotes', []), ensure_ascii=False)}
  Evidence (use these specific facts from the analysis): {json.dumps(ps.get('evidence', []), ensure_ascii=False)}
"""
                if note:
                    block += (
                        f"  OPERATOR INSTRUCTION (highest priority — "
                        f"follow exactly, override generic patterns): {note}\n"
                    )
                batch_strategy_ctx += block

        batch_pages_str = "\n".join(f"  - {p['name']} ({p['slug']})" for p in batch)

        # Phase-2: NO global crawl_ctx[:4000] re-injection here. Phase A
        # already read the full analysis and routed the page-relevant
        # facts into each page's `evidence` / `contentNotes` above. The
        # copywriter writes from that distilled per-page strategy — this
        # removes the last truncation point and keeps the prompt focused
        # on exactly what this page needs (smaller AND lossless).
        copy_prompt = f"""You are an expert church-website copywriter. Your job is to write the
ACTUAL TEXT that will appear on each section of each page. This text must be
ready to publish, and must sound like a warm faith community — not a business.

{CHURCH_VOICE}

===== CHURCH CANON (Dr. John Kwak, Church Planting LCCM 3354 — full lectures + reference) =====
Use the lectures as the theological/ministry source for what each page should
actually say; apply the reference's §13 Do/Don't and pass the §13.5 seven-point
self-check before finalizing. Draw concrete, specific substance — never generic
church filler.
{CHURCH_CANON}
===== END CANON =====

Church: "{body.businessName}" — {body.description}
Ministries: {body.services}
Audience: {body.targetAudience}

[CONTENT STRATEGY — Follow this exactly. The "Evidence" bullets are
specific facts already distilled from the full market/competitor
analysis for THIS page — weave them into the copy, don't invent
generic claims.]
{batch_strategy_ctx if batch_strategy_ctx else f"Pages: {batch_pages_str}"}

Write website copy for these pages. Think like a UX designer — less is more.

Each section needs:

1. "sectionType" — choose the BEST type for the content:
   hero, hero-text, hero-split, page-hero, features, about, text, text-split,
   text-cta, text-quote, text-image, image-text, cta, testimonials, pricing,
   team, faq, contact, stats, logo-bar, subscribe, gallery,
   steps, process, how-we-work,
   sermons, bulletins, columns, videos, albums, worship-schedule, clergy,
   events, history, board, pastor-message, newcomer

   TYPE GUIDE:
   - "text" = center-aligned title + description (simple about/intro)
   - "text-split" = left title + right description (magazine-style, elegant for stories)
   - "text-cta" = center title + description + CTA button (conversion section)
   - "text-quote" = quote + 3 key points (trust/philosophy section)
   - "hero-text" = text-only hero, no image (clean, modern)
   - "text-image" / "image-text" = text + image side by side (max 1-2 per page)
   - "stats" = 2-4 number cards (use items: [{{value, label, unit?, prefix?}}])
                value can be "12,400" / "99.9%" / "$5M". Use this for trust building.
   - "pricing" = 2-4 plan cards (items: [{{name, price, period, features:[], buttonText, featured:bool}}])
                Mark exactly ONE plan featured=true to draw the eye.
   - "team" = avatar grid (items: [{{name, role, photoUrl?, bio?}}])
   - "subscribe" = inline newsletter form (no items, just title/subtitle/buttonText)
   - "logo-bar" = grayscale partner/customer logo strip (items: [{{name, logoUrl}}])
   - "steps" / "process" / "how-we-work" = numbered/icon-led sequence
     (items: [{{title, description, iconName?}}]). Use this — NOT
     "features" — when the content implies an ORDER ("first do X,
     then Y, finally Z") or a workflow. 3-4 steps → renders as 3-up
     grid; 5+ steps → renders as long vertical list with row separators.
   - "category-tabs" = tabbed category filter + card grid. Use ONLY
     when the content is genuinely a set of categories the visitor
     wants to switch between (Stanislav-style "Unsere Kategorien").
     Requires both tabs[] and cards[]:
       tabs: [{{id, label}}]
       cards: [{{tab, title, description, imagePrompt, buttonText, buttonUrl}}]
     Each card's `tab` field MUST match one of the tabs[].id values.
     Don't use this for plain feature grids — use "features" instead.

   CHURCH CONTENT BLOCKS (dw-church) — USE THESE on church content pages.
   These are DATA blocks: they pull live content the operator registers in
   the admin app (설교/주보/…). You only pick the type and write a short
   section "title"/"eyebrow" — DO NOT invent items[] for them (the items
   come from the database). Match the page to its block:
   - "sermons"          = 최근 설교 그리드 (/api/v1/sermons). USE on the
                          설교/말씀 (/sermons) page and optionally home.
   - "bulletins"        = 주보 PDF 그리드 (/api/v1/bulletins). USE on the
                          주보 (/bulletins) page.
   - "columns"          = 목회칼럼 그리드 (/api/v1/columns). USE on the
                          목회칼럼 (/columns) page.
   - "videos"           = YouTube 영상 그리드 (/api/v1/videos). USE on
                          찬양/영상 pages.
   - "albums"           = 교회앨범 갤러리 (/api/v1/albums). USE on the
                          앨범/사진 page.
   - "worship-schedule" = 예배·모임 시간표 (/api/v1/schedules). USE on the
                          예배안내 page and optionally home.
   - "clergy"           = 교역자 그리드 (/api/v1/staff). USE on the 교역자
                          (/staff) page. (NOT "team" — that's a hand-typed
                          generic grid; church staff comes from the DB.)
   - "events"           = 교회 행사/소식 그리드 (/api/v1/events). USE on the
                          행사/소식 page and optionally home.
   - "history"          = 교회 연혁 타임라인 (/api/v1/history). USE on the
                          연혁 page.
   - "board"            = 게시판 목록 (/api/v1/boards). USE on 공지/게시판
                          pages.
   - "cells"            = 목장(셀) 그리드 (/api/v1/cells). USE on the 목장/
                          공동체/소그룹 page. Data block — write only a title.
   And STATIC church blocks you DO write copy for:
   - "newcomer-form"    = 새가족 온라인 등록 폼 (방문자가 직접 작성 → 새가족
                          관리 인박스). title/subtitle 만 작성. USE on a 새가족/
                          처음오신분 page when online registration is wanted.
                          (NOT "newcomer" — that's the welcome+CTA info block.)
   - "pastor-message"   = 담임목사 인사말 (title=headline, description=인사말
                          본문, imagePrompt=목사 사진). USE on 교회소개/home.
   - "newcomer"         = 새가족 환영 + 등록 CTA (title/subtitle/description
                          + buttonText/buttonUrl). USE as a home/새가족 CTA.
   - "giving"           = 헌금 안내 (온라인 헌금 '방법' 안내 — 결제 아님).
                          title + intro 만 작성; Zelle·계좌·우편주소는 운영자가
                          채움. USE on a 헌금/온라인헌금 page.
2. "title" — Short, powerful headline (max 8 words). Specific, not generic.
3. "subtitle" — One short line (max 15 words) that expands the title
4. "description" — 1-2 sentences MAXIMUM. Concise and impactful.
   Real websites don't have paragraphs of text in sections.
   One strong sentence is better than three weak ones.
5. "buttonText" — 2-4 words. Action verb. Be specific to what the user
   gets, not a generic verb — "<browse-the-thing>" / "<get-the-quote>"
   over a vague "<read-more>". Match the [OUTPUT LANGUAGE] of the page.
6. "items" — For features/pricing/team/faq:
   - features: "title" (3-5 words) + "description" (1 SHORT sentence, max 15 words)
                + optional "imagePrompt" / "caption" (small sub-line under title, e.g. "4000+ projects")
   - faq: "question" + "answer" (2-3 sentences)
   - testimonials: "quote" (1-2 sentences) + "author" + "company"
7. "imagePrompt" — Photo description (English, no text in image)
8. "eyebrow" — OPTIONAL small uppercase label above the title. Use it to
   give context (e.g. "ABOUT US", "OUR PROCESS", "WHY US"). 2-3 WORDS
   MAX. Renders as a pill badge in brand-accent color. Set on hero
   variants, features, stats, testimonials, cta. Skip on plain "text".
9. "bgMode" — section background. One of:
     "none"   (default white)
     "subtle" (light gray) — use to break up consecutive white sections
     "dark"   (near-black + white text) — picks one visual rhythm break
              per page; common for testimonials or final CTA section
     "accent" (brand accent color) — at most ONE per page, save for the
              final CTA / subscribe section so it stands out
   IMPORTANT: at most 1 'dark' AND 1 'accent' per page.
10. "variant" — for "features" ONLY: choose card layout per content:
     "compact"     (default, small icon + title + 1 line desc) — for
                   "Why us" trust grids, 4 short benefits
     "image-card"  (full-width image at top, title + caption + desc
                   below) — for catalog/portfolio/services
                   showcases. Each item should have an imagePrompt.
     "icon-large"  (centered 80px icon circle + title + desc) — for
                   process steps or 4-feature centered grids
11. "ctaShape" — "pill" (rounded-full, modern marketing default) /
    "rounded" (current default) / "square". Use "pill" on hero/cta
    sections for that modern marketing-site look unless the brand
    style explicitly calls for sharper edges.

UX RULES:
- Hero: title + subtitle + CTA. Description is OPTIONAL (skip if subtitle says enough)
- Features grid: title + 1 LINE description per item. NOT paragraphs.
- CTA: title + subtitle + button. That's it. No long descriptions.
- text-image/image-text: 1-2 sentences max. The image does half the work.
- If content is complex, use "faq" (accordion) instead of long text blocks

✗ BAD: 3-column features with 4 sentences each → wall of text
✓ GOOD: 3-column features with title + 1 line each → clean, scannable

✗ BAD: a wordy "At <BusinessName>, we pride ourselves on providing
   <generic mission statement>..." opener (operators read this once
   and ignore it forever)
✓ GOOD: one concrete proof point per line. e.g. a specific guarantee
   window, a measurable quality claim, or a credential. Use the
   business's own services / numbers / certifications — NEVER copy
   the example wording above. See feedback-no-hardcoded-defaults.

PAGE COMPOSITION RULES — CRITICAL:
- Each page should have 4-6 sections (not 3) so the page has rhythm + depth
- MANDATORY: Every page MUST have at least 1-2 visual sections
- MAX 1 pure text section per page (text, text-split, text-block)
- DIVERSIFY — DO NOT default to {{hero, features, text-image, cta}}. The
  operator has explicitly flagged this 3-block pattern as the lazy /
  same-site-every-time output. Mix AT LEAST 4 DISTINCT section types per
  page from the full guide above (24 types). Same sectionType MUST NOT
  appear twice on the same page unless content genuinely requires it.
- Pick per page's purpose, not per habit:
    "stats"          when the business has impressive numbers / proof
    "testimonials"   when social proof is the page's job (about, services, home)
    "logo-bar"       when there are partner / customer brand names to show
    "pricing"        on pricing / plans page (also good on services bottom)
    "team"           on about / team page
    "faq"            when objections / Q&A are the page's job
    "steps"/"process" when the content is sequential / workflow
    "gallery"        for portfolio / case-study pages
    "subscribe"      when newsletter sign-up is a meaningful lead path
    "text-quote"     when there's a CEO quote / brand philosophy line
    "category-tabs"  when content is genuinely tabbed categories
- "text-image" / "image-text" / "features" are GOOD tools but NOT
  defaults — only pick them when no more-specific pattern fits the
  content. If you reach for features-grid by reflex, stop and ask: would
  stats / testimonials / pricing / team / faq tell this story better?
- NEVER put 2 text-only sections in a row

VISUAL RHYTHM RULES — IMPORTANT:
- A page of all-white sections looks flat. Use bgMode to create rhythm.
- AT MOST ONE section per page with bgMode="dark" (typically testimonials
  or a stats break). NEVER two dark sections in a row.
- AT MOST ONE section per page with bgMode="accent" — reserve it for the
  final cta or subscribe section that you want to be the page's loudest
  voice.
- Use bgMode="subtle" (light gray) freely to break up long white runs.
- Cards-on-dark look great: testimonials with bgMode="dark" + features
  with variant="image-card" alternating gives modern rhythm.

EYEBROW USAGE:
- Set "eyebrow" on hero / features / stats / testimonials / cta sections
  for that modern "Unsere Vorteile" / "О нас" / "Why Choose Us" feel.
- 2-3 words, treated as uppercase. Skip for plain text sections.

HERO RULES — STRICTLY ENFORCED:
- The FIRST section of EVERY page MUST be a hero. Pick sectionType from:
    hero, hero-split, hero-text, page-hero
  Never start a page with text / text-split / features / cta / about / etc.
- Hero choice by page slug:
    "/" or "home"                          → "hero"        (image-overlay, full impact)
    slug starts with "/about" or "/team"   → "hero-split"  (story + portrait/photo)
    slug contains "service" or "product"   → "hero-split"  (offering + image)
    slug contains "contact"|"quote"|"book" → "page-hero"   (compact header — form lives in next section for now)
    slug contains "location"|"branch"      → "page-hero"   (compact header — map lives in next section for now)
    every other sub-page                   → "page-hero"   (header strip, default for sub-pages)
- The hero's title is the page name written punchy; subtitle expands it.
- Sub-page heroes (page-hero) should NOT have a long description — title +
  short subtitle is enough. The page body carries the substance.

CHURCH CTA RULE: do NOT force a CTA section at the bottom of church pages. A
church site is not a sales funnel — most pages should simply END with their
content (the sermon list, the schedule, the map). Only add a CTA / newcomer
section when it's genuinely useful (e.g., the home page, or a 새가족 page).
Never tack a generic CTA onto every page.

GOOD page structure examples (each picks DIFFERENT patterns — that's the point;
note these do NOT all end in cta):
  /              hero → pastor-message → worship-schedule → sermons → events → newcomer
  /about         hero-split → text-quote → pastor-message → history
  /sermons       page-hero → sermons
  /bulletins     page-hero → bulletins
  /columns       page-hero → columns
  /staff         page-hero → clergy
  /worship       page-hero → worship-schedule → text-image
  /contact       page-hero → worship-schedule → contact

CHURCH PAGE RULE — CRITICAL: a page whose purpose is a single church content
module must use EXACTLY THREE sections in this order:
    1. a hero  (page-hero)
    2. ONE short intro text block  (sectionType "text")
    3. the module's DATA block
NOTHING ELSE — no text-image, no gallery, no features on these pages. The
data block already shows the real content, so the page is just: header +
one intro paragraph + the block. Mapping:
  /sermons → "sermons", /bulletins → "bulletins", 목회칼럼/columns →
  "columns", /staff or /교역자 → "clergy" (NOT "team"), /events or 행사 →
  "events", /history or /연혁 → "history", /albums or 갤러리 → "albums",
  예배안내/worship → "worship-schedule", 영상 → "videos", 게시판 → "board".
The HOME page is the exception — it aggregates several modules
(hero → pastor-message → worship-schedule → sermons → events → newcomer).

BAD page structures (the "every site looks the same" anti-pattern):
  hero → features → text-image → cta                 (too few, too predictable)
  hero → features → features → text-image → cta      (repeating features)
  hero-text → text-split → text → text-cta → text-image  (all text, no rhythm)
  Any page where {{hero, features, text-image, cta}} are the only patterns used.

Pages to write:
{batch_pages_str}

Return JSON only:
{{
  "{batch[0]['slug']}": [
    {{
      "sectionType": "...",
      "eyebrow": "OUR APPROACH",
      "title": "max 8 words",
      "subtitle": "max 15 words",
      "description": "1-2 sentences max",
      "buttonText": "2-4 words",
      "imagePrompt": "...",
      "bgMode": "none|subtle|dark|accent",
      "variant": "compact|image-card|icon-large",
      "ctaShape": "pill|rounded",
      "items": []
    }}
  ]
}}"""

        async with batch_semaphore:
            try:
                result = await call_llm(copy_prompt, max_tokens=8000, model=body.model)
                batch_map = extract_json(result)
            except Exception as e:
                logger.warning("Phase B batch %d failed: %s", batch_start, e)
                batch_map = None

        out: dict[str, dict] = {}
        for page in batch:
            slug = page["slug"]
            name = page["name"]
            sections: list = []

            if isinstance(batch_map, dict):
                raw = batch_map.get(slug, [])
                if isinstance(raw, list):
                    sections = raw

            # Previously, missing/empty sections fell through to
            # _build_default_sections which produced placeholder rows
            # like {"title": "Home — Hero", "buttonText": "Learn More"}.
            # The wizard then built those into the tenant and the
            # operator shipped a fake site without ever knowing AI
            # failed. Emit empty list instead so the wizard can detect
            # the gap and surface a clear error.
            sections = _reorder_sections_by_role(sections)
            # Church content-module pages (설교/주보/목회칼럼/예배안내/…) get a
            # FIXED shape: page-hero → intro text → the module's DATA block.
            # The copywriter otherwise renders some of these as text-image; this
            # guarantees the data block is used. Non-module pages pass through.
            enforced = _enforce_content_module_structure(page, sections)
            if enforced is not None:
                sections = enforced
            for s in sections:
                st = s.get("sectionType", "text")
                s["gutenbergPattern"] = SECTION_TO_PATTERN.get(st, "text-block")

            # Attach page strategy for reference
            ps = page_strategies.get(slug, {})
            out[slug] = {
                "pageName": name,
                "purpose": ps.get("purpose", "") if isinstance(ps, dict) else "",
                "keyMessage": ps.get("keyMessage", "") if isinstance(ps, dict) else "",
                "sections": sections,
            }

        logger.info("Phase B batch %d done (%d pages)", batch_start, len(batch))
        return out

    batch_jobs = [
        process_batch(start, actual_pages[start:start + BATCH_SIZE])
        for start in range(0, len(actual_pages), BATCH_SIZE)
    ]
    batch_results = await asyncio.gather(*batch_jobs, return_exceptions=True)
    for r in batch_results:
        if isinstance(r, Exception):
            logger.warning("Phase B batch coroutine raised: %s", r)
            continue
        content_map.update(r)

    # Resilience pass: the copywriter occasionally drops ONE page from a
    # batch's JSON (returns it empty / omits it), which used to fail the whole
    # wizard step ("N개 페이지 실패 — 다시 시도하세요"). Retry just the empty pages
    # ONCE, each on its own so a single bad page can't take others down. Only
    # overwrite when the retry actually produced sections — never paper over a
    # persistent failure with placeholders (see feedback-no-hardcoded-defaults).
    empty_pages = [
        p for p in actual_pages
        if not (content_map.get(p["slug"], {}) or {}).get("sections")
    ]
    if empty_pages:
        logger.info(
            "Phase B retry: %d empty page(s): %s",
            len(empty_pages), [p["slug"] for p in empty_pages],
        )
        retry_results = await asyncio.gather(
            *[process_batch(-1, [p]) for p in empty_pages],
            return_exceptions=True,
        )
        for r in retry_results:
            if isinstance(r, Exception):
                logger.warning("Phase B retry coroutine raised: %s", r)
                continue
            for slug, data in r.items():
                if data.get("sections"):
                    content_map[slug] = data

    return {"contentMap": content_map}


# `_build_default_sections` was removed. It was the source of the
# long-standing "fake site" bug — when the LLM failed for some page,
# callers used to inject placeholder rows ("PageName — Hero", "Learn
# More" buttons, business.description copy-pasted into every page,
# "Great experience with {businessName}!" testimonials) and the wizard
# happily built them into the tenant. The operator shipped sites with
# template-shaped content thinking it was AI-generated. Anyone tempted
# to re-introduce a similar helper: don't. LLM failure must be surfaced
# as an error, never papered over with code-level placeholder copy.
# See feedback-no-hardcoded-defaults.


# /build-page (Gutenberg core/* expansion) was removed. Block persistence
# is now the server's responsibility — the admin's PlannerWizard posts the
# /page-content output directly to apps/server's POST /api/v1/ai/build-pages,
# which uses apps/server/src/modules/ai/build-pages/pattern-map.ts to map
# each section to a True Light block_type. Keeping this endpoint here would
# duplicate that mapping in Python while pulling Gutenberg's core/heading,
# core/cover, core/media-text vocabulary back into the agent service —
# exactly what CLAUDE.md's "no WordPress code" rule prohibits.


# ── 8. Reference Site Crawling ──

class CrawlRequest(BaseModel):
    urls: list[str]  # 1-5 reference/competitor site URLs


@router.post("/crawl-sites")
async def crawl_reference_sites(body: CrawlRequest) -> dict:
    """Crawl reference/competitor sites and return structured analysis.

    Crawls ALL pages of each site (up to 30 per site, max 5 sites).
    Returns per-page section analysis and cross-site patterns.
    """
    from app.services.planner.site_crawler import crawl_multiple_sites, format_crawl_for_prompt

    if not body.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    # Clean URLs
    urls = []
    for url in body.urls[:5]:
        url = url.strip()
        if not url.startswith("http"):
            url = f"https://{url}"
        urls.append(url)

    try:
        result = await crawl_multiple_sites(urls)
        # Also include formatted text for AI prompt injection
        result["promptContext"] = format_crawl_for_prompt(result)
        return result
    except Exception as e:
        logger.error("Crawl failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Crawl failed: {e}")

# ── Reference image analysis (Phase B of AI Image Plan) ──
#
# Vision call that turns an uploaded reference photo into a short
# descriptive caption + tag suggestion. Operators paste-uploading 10
# venue/product photos don't want to write captions; the captions
# meaningfully help downstream generation (better reference selection
# + clearer prompts), so we run the analysis automatically.
#
# Uses Gemini 2.5 Flash multimodal — fast (~2-4s), cheap, returns
# structured JSON with description + tag. Failure is non-fatal: the
# reference still uploads, just without an auto-caption.

class ImageAnalyzeRequest(BaseModel):
    imageUrl: str
    # Optional hint(s) — if the operator picked categories in the
    # upload UI we bias the description toward that domain (e.g.
    # 'product' prompts the LLM to describe the product's shape/color/
    # material rather than the surrounding scene). Multi-tag callers
    # pass the array; single-tag stays for back-compat with older SPAs.
    tagHint: str | None = None
    tagHints: list[str] | None = None


class LlmRankRequest(BaseModel):
    """Generic JSON-ranking LLM call.

    Used by apps/server's section-image/auto-match endpoint to score
    media-library candidates against a section's context. The server
    composes the prompt + candidate list and calls this — agents simply
    forwards to Gemini Flash and returns the raw text response. Keeping
    it generic avoids re-implementing the auto-match candidate plumbing
    on the agents side; the server already knows about per-tenant
    `files` rows.
    """

    prompt: str
    model: str = "gemini"
    maxTokens: int = 400


@router.post("/llm-rank")
async def llm_rank(body: LlmRankRequest) -> dict:
    """Generic Gemini Flash call used by server-composed ranking prompts.

    Returns { text } verbatim — the caller parses whatever JSON shape
    they encoded into their prompt.
    """
    try:
        text = await call_gemini(body.prompt, max_tokens=body.maxTokens, model="gemini-2.5-flash")
    except Exception as e:
        logger.error("llm-rank failed: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM 호출 실패: {e}")
    return {"text": text}


@router.post("/image/analyze")
async def analyze_image(body: ImageAnalyzeRequest) -> dict:
    """Run Gemini multimodal over a reference photo and return a
    short caption + suggested tag. Used by the SuperAdmin
    TenantReferences upload flow so newly-uploaded references arrive
    with auto-generated descriptions instead of operators having to
    caption each one.

    Returns:
      {
        description: str,
        tag: str,           # legacy single-tag for back-compat (= tags[0])
        tags: list[str],    # multi-tag (one or more from the allowed set)
      }

    Errors:
      503 if GEMINI_API_KEY is missing.
      400 if the image URL is unreachable or not an image.
      Schema-tolerant: if Gemini returns a malformed JSON wrapper we
      best-effort the description from raw text and default tag.
    """
    import base64
    import os

    if not body.imageUrl or not body.imageUrl.strip():
        raise HTTPException(
            status_code=400,
            detail="IMAGE_URL_REQUIRED: imageUrl is missing",
        )

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AUTH_FAILED: GEMINI_API_KEY 미설정 — 환경변수를 설정하세요.",
        )

    # Fetch the image bytes inline (not via _fetch_reference_bytes,
    # which returns None on every failure category and would force the
    # caller to guess WHY). Specific failure reasons let the SPA toast
    # tell the operator exactly what's wrong — unreachable URL needs a
    # different fix than oversized file needs a different fix than
    # non-image content.
    #
    # Size cap: 8MB raw. Gemini's 20MB inline-payload limit is per call;
    # base64 expands 4:3 (raw 8MB → encoded ~10.7MB), leaves headroom
    # for prompt + JSON envelope. Server-side upload allows 10MB and
    # the OLD _fetch_reference_bytes capped at 4MB — operators were
    # silently dropping anything in the 4-10MB band. 8MB matches the
    # band the upload path accepts.
    import httpx

    ANALYZE_MAX_BYTES = 8 * 1024 * 1024  # noqa: N806 — function-scoped const, UPPER_CASE 가 의도
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            img_resp = await client.get(body.imageUrl, timeout=20.0)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=502,
                detail=(
                    f"IMAGE_UNREACHABLE: 이미지 URL에 연결할 수 없습니다 "
                    f"({type(e).__name__}). R2 공개 URL 설정을 확인하세요."
                ),
            )
        if img_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"IMAGE_UNREACHABLE: 이미지 URL이 HTTP {img_resp.status_code}로 "
                    f"응답합니다. R2 객체가 삭제됐거나 비공개 상태인지 확인하세요."
                ),
            )
        if len(img_resp.content) > ANALYZE_MAX_BYTES:
            mb = len(img_resp.content) / 1024 / 1024
            raise HTTPException(
                status_code=413,
                detail=(
                    f"IMAGE_TOO_LARGE: 이미지가 {mb:.1f}MB로 분석 한도 "
                    f"({ANALYZE_MAX_BYTES // 1024 // 1024}MB)를 초과합니다. "
                    "원본을 압축해서 다시 업로드하세요."
                ),
            )
        mime = img_resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not mime.startswith("image/"):
            raise HTTPException(
                status_code=415,
                detail=(
                    f"IMAGE_INVALID_TYPE: URL이 이미지가 아닙니다 "
                    f"(content-type={mime!r})."
                ),
            )
        image_bytes = img_resp.content

        # Resolve operator-provided hints — multi-tag if available,
        # otherwise the legacy single tagHint, otherwise nothing.
        hint_set: set[str] = set()
        if body.tagHints:
            hint_set = {t.strip().lower() for t in body.tagHints if t and t.strip()}
        elif body.tagHint and body.tagHint.strip():
            hint_set = {body.tagHint.strip().lower()}

        # Build a tag-biased prompt — when the upload UI knows the
        # categories, we ask the model to cover each one in the
        # description. Multi-hint cases (e.g. interior+product) get a
        # combined directive so the caption mentions both contexts.
        instructions: list[str] = []
        if "exterior" in hint_set:
            instructions.append(
                "the building exterior, signage, and surroundings"
            )
        if "interior" in hint_set:
            instructions.append(
                "the interior layout, lighting, materials, fixtures"
            )
        if "product" in hint_set:
            instructions.append(
                "the product itself — shape, color, material, finish, "
                "branding/logo if visible, packaging if any"
            )
        if "team" in hint_set:
            instructions.append(
                "the people, their roles/uniform if visible, the work "
                "context they're in"
            )
        if "process" in hint_set:
            instructions.append(
                "the activity being performed, the tools, the stage of "
                "the workflow shown"
            )

        tag_instruction = (
            f"Focus on: {'; '.join(instructions)}. "
            if instructions
            else ""
        )

        prompt = (
            f"{tag_instruction}"
            "Describe this photograph for use as a visual reference in AI "
            "image generation. Be specific — name what's visible (subject, "
            "setting, materials, lighting, mood). 2-3 sentences max. "
            "Then classify the photo with ALL applicable category tags "
            "(typically 1-2; pick more only when the photo genuinely "
            "covers multiple themes — e.g. a wide interior shot with "
            "products on shelves fits both 'interior' AND 'product').\n"
            "\n"
            "Return ONLY this JSON shape (no markdown fences):\n"
            "{\n"
            '  "description": "concrete factual description, 2-3 sentences",\n'
            '  "tags": ["exterior" | "interior" | "product" | "team" | "process" | "other"]\n'
            "}"
        )

        # Direct call to Gemini multimodal — image part first (model
        # attends to inputs that precede their description), then prompt.
        # Using gemini-2.5-flash here (vision capable, cheap, fast); the
        # llm_service.call_gemini path is text-only.
        gemini_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent"
        )
        try:
            resp = await client.post(
                f"{gemini_url}?key={api_key}",
                json={
                    "contents": [{
                        "parts": [
                            {"inlineData": {
                                "mimeType": mime,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }},
                            {"text": prompt},
                        ],
                    }],
                    "generationConfig": {
                        "maxOutputTokens": 400,
                        "thinkingConfig": {"thinkingBudget": 0},
                    },
                },
                headers={"Content-Type": "application/json"},
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("analyze-image network error: %s", e)
            raise HTTPException(status_code=503, detail=f"Gemini network error: {e}")

        if resp.status_code != 200:
            logger.warning(
                "analyze-image Gemini %d: %s", resp.status_code, resp.text[:500],
            )
            # Map upstream Gemini errors to actionable SPA-side messages.
            # Status-code only is too vague — "502 Gemini API error" gives
            # the operator nothing to fix. Parse the error body for the
            # Google API status string ("RESOURCE_EXHAUSTED" / etc.) and
            # surface the cause so the toast can tell them whether it's
            # a quota issue (charge billing), a key issue (configure),
            # or a transient one (retry).
            err_body: dict = {}
            try:
                err_body = resp.json().get("error", {}) or {}
            except Exception:  # noqa: BLE001
                pass
            err_status = str(err_body.get("status") or "")
            err_msg = str(err_body.get("message") or "")
            up_code = resp.status_code

            # Quota / billing exhausted — most common after free-tier
            # cap or unfunded billing. Google returns this under many
            # shapes:
            #   429 + RESOURCE_EXHAUSTED                  (rate / quota)
            #   400 + "billing account not configured"    (no billing)
            #   400 + "exceeded your current quota"       (paid quota hit)
            #   403 + "billing has been disabled"         (card declined)
            # Match the union — anything that smells like billing/credit
            # routes to the same "charge credits" toast on the SPA side.
            err_lower = err_msg.lower()
            quota_keywords = ("quota", "billing", "credit", "exhausted", "rate limit", "exceed")
            if (
                up_code == 429
                or err_status == "RESOURCE_EXHAUSTED"
                or any(k in err_lower for k in quota_keywords)
            ):
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "QUOTA_EXHAUSTED: Gemini API 사용 한도/크레딧이 소진되었습니다. "
                        "Google AI Studio 또는 Google Cloud 결제 정보를 확인하세요. "
                        f"(upstream: {err_msg or f'HTTP {up_code}'})"
                    ),
                )
            # Auth issues — wrong key, key revoked, key not configured.
            # Status 401 / 403 / API_KEY_INVALID / PERMISSION_DENIED.
            if up_code in (401, 403) or "API key" in err_msg or err_status in ("INVALID_ARGUMENT", "PERMISSION_DENIED", "UNAUTHENTICATED"):
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "AUTH_FAILED: Gemini API 키 설정 오류입니다. "
                        f"GEMINI_API_KEY 환경변수를 확인하세요. ({err_msg or 'no detail'})"
                    ),
                )
            # Service overloaded / temporary outage — retry will likely
            # work in a few seconds. Status 503 / UNAVAILABLE.
            if up_code in (500, 502, 503, 504) or err_status == "UNAVAILABLE":
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "SERVICE_OVERLOADED: Gemini API가 일시적으로 응답하지 않습니다. "
                        "잠시 후 다시 시도하세요."
                    ),
                )
            # Anything else — model rejected the input (size / format /
            # safety filter). Caller can surface the upstream message
            # so the operator sees what was wrong.
            raise HTTPException(
                status_code=502,
                detail=f"GEMINI_ERROR: {err_msg or f'HTTP {up_code}'}",
            )

        try:
            data = resp.json()
            text_out = (
                ((data.get("candidates") or [{}])[0].get("content") or {})
                .get("parts", [{}])[0].get("text", "")
            )
        except Exception:  # noqa: BLE001
            text_out = ""

        # Best-effort JSON parse. Gemini sometimes wraps the JSON in
        # markdown fences despite the instruction; strip them first.
        from app.services.planner.llm_service import extract_json
        parsed = extract_json(text_out)
        ALLOWED = {"exterior", "interior", "product", "team", "process", "other"}  # noqa: N806 — frozen set 상수, UPPER_CASE 가 의도
        if isinstance(parsed, dict):
            description = str(parsed.get("description", ""))
            # Accept either tags[] (multi) or tag (legacy single). Filter
            # to known values; defensive against the model returning
            # adjacent-but-wrong values like 'service' instead of 'process'.
            raw_tags = parsed.get("tags")
            if isinstance(raw_tags, list):
                tags = [str(t) for t in raw_tags if isinstance(t, str) and t in ALLOWED]
            else:
                single = parsed.get("tag")
                tags = [str(single)] if isinstance(single, str) and single in ALLOWED else []
        else:
            description = text_out.strip()
            tags = []

        # Fallback when the model returned nothing usable — use the
        # operator's hints (if any) so the upload form's selection
        # stays the source of truth.
        if not tags:
            tags = sorted(hint_set & ALLOWED) or ["other"]

        # Legacy single-tag mirror for older readers in the SPA. New
        # consumers should read `tags`.
        return {"description": description, "tag": tags[0], "tags": tags}


# ── Image generation ──
class ImageGenRequest(BaseModel):
    prompt: str
    variant: str = "section"   # hero | section | square | hero_mobile | banner_wide | product_card | product_detail
    # Operator-curated reference photos (R2 URLs). When provided, the
    # underlying call goes image-to-image via Gemini multimodal so the
    # output matches the actual look of the business — the cafe's
    # exterior, the team on the about page, etc. Cap at ~5 to keep the
    # inline payload reasonable; SPA picks based on section context.
    referenceUrls: list[str] = []
    # ── Tenant context (REQUIRED in practice) ────────────────────
    # The server-side proxies (builder-routes / planner-proxy) inject
    # both the slug (used to scope the R2 storage key under
    # tenant_<slug>/ai-images/...) AND the UUID id (used as
    # X-Tenant-Id when calling apps/server's internal register-image
    # endpoint, which is how the image lands in the tenant's Media
    # Library instead of becoming an R2 orphan). Both are optional so
    # the agent endpoint stays back-compat with the legacy "fire it
    # naked" flow — but a warning is logged and the image is NOT
    # registered when they're missing.
    tenantSlug: str | None = None
    tenantId: str | None = None
    # ── AI image policy/metadata (saved into files row) ──────────
    # 'space' (real venue, structure preserved) or 'product' (commercial
    # context, brand preserved). Drives the prompt-prefix policy that
    # Phase 2 of the AI image plan will plumb into image_service. None
    # for general-purpose generation that doesn't need the policy.
    mode: str | None = None
    # '16:9', '9:16', '1:1', '4:5', '21:9', '3:2' — for Media Library
    # filtering when picking an image for a hero (16:9) vs product card
    # (1:1). Caller may compute from variant; we don't require it.
    aspectRatio: str | None = None
    # The reference photo (`files.id` in tenant schema) this image was
    # derived from. Lets the Media Library show siblings and lets QA
    # enforce that space-mode generations always have a master ref.
    referenceImageId: str | None = None


# Map variant → aspect_ratio when the caller doesn't supply one. Keep
# this in sync with the values the frontend's per-section AI image
# button picks per block_type. Unknown variants default to a square
# value rather than NULL so the Media Library picker can still filter.
_VARIANT_ASPECT_RATIO = {
    "hero":            "16:9",
    "section":         "3:2",
    "square":          "1:1",
    "hero_mobile":     "9:16",
    "banner_wide":     "21:9",
    "product_card":    "1:1",
    "product_detail":  "4:5",
}


async def _register_ai_image_with_server(
    *,
    tenant_id: str,
    storage_key: str,
    url: str,
    size_bytes: int,
    mime_type: str,
    body: "ImageGenRequest",
) -> None:
    """POST to apps/server's /api/v1/internal/files/register-image so
    the AI-generated image lands in the tenant's Media Library. This is
    the fix for "AI 이미지가 R2에 직접 박히고 DB 기록이 없어서 고아가
    되는" 문제 — without this call, the image is orphaned forever.

    Logged-but-non-fatal on failure: if the registration fails the
    image is still uploaded and the URL is returned, so the user's
    flow doesn't break, but the image becomes a one-off orphan and the
    error is surfaced for ops to investigate. Better than swallowing.
    """
    import os

    import httpx

    # Same env vars as adapter_factory.build_adapter — SERVER_INTERNAL_URL
    # is the established convention for agents → server calls. Default
    # mirrors the local-dev port the server listens on.
    server_url = os.getenv("SERVER_INTERNAL_URL", "http://localhost:3001")
    token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not token:
        logger.warning(
            "AI image not registered in Media Library — INTERNAL_SERVICE_TOKEN "
            "missing on agents service. URL=%s", url,
        )
        return

    aspect_ratio = body.aspectRatio or _VARIANT_ASPECT_RATIO.get(body.variant)
    payload = {
        "url": url,
        "storageKey": storage_key,
        "mimeType": mime_type,
        "sizeBytes": size_bytes,
        "originalName": f"ai-image-{body.variant}.png",
        "kind": "ai_generated",
        "tag": body.variant,
        # The prompt itself; description is left null for AI-generated
        # rows since `prompt` is the canonical text.
        "prompt": body.prompt,
        "generationMode": body.mode,
        "aspectRatio": aspect_ratio,
        "referenceImageId": body.referenceImageId,
    }

    endpoint = f"{server_url.rstrip('/')}/api/v1/internal/files/register-image"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Tenant-Id": tenant_id,
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code >= 400:
                logger.warning(
                    "register-image failed: %d %s — image will be an R2 "
                    "orphan. tenant=%s url=%s",
                    resp.status_code, resp.text[:200], tenant_id, url,
                )
    except Exception as e:  # noqa: BLE001 — never break the user flow
        logger.warning(
            "register-image errored: %s — image will be an R2 orphan. "
            "tenant=%s url=%s", e, tenant_id, url,
        )


@router.post("/image/generate")
async def generate_image(body: ImageGenRequest) -> dict:
    """Generate an image via Gemini/Imagen, upload to R2, and register
    it in the tenant's Media Library.

    Used by the page builder's per-section AI image button. Falls back
    to a 503 when GEMINI_API_KEY or R2 env is missing — the builder
    keeps the prompt around so the user can copy it manually.

    referenceUrls (optional) puts the call in image-to-image mode using
    Gemini multimodal. Imagen is dropped from the chain in that case
    since it doesn't accept image input.

    tenantSlug + tenantId (server-injected): when present, the R2
    object is stored under tenant_<slug>/ai-images/<filename> AND a
    row is inserted into tenant_<slug>.files via the internal
    register-image endpoint so the operator can browse / delete the
    image from the Media Library. Without these, falls back to the
    legacy dw/_global/ path with a warning log (orphan image).
    """
    from app.services.image_service import generate_image_bytes
    from app.services.storage.r2_service import get_r2

    if not body.prompt or not body.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")

    # Trim & cap references defensively — over 5 references rarely improves
    # output and grows the inline payload past what Gemini accepts.
    refs = [u.strip() for u in (body.referenceUrls or []) if u and u.strip()][:5]

    try:
        data, info = await generate_image_bytes(
            body.prompt,
            variant=body.variant,
            reference_urls=refs or None,
            mode=body.mode,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Image generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")

    r2 = get_r2()
    if r2 is None:
        # No silent fallback — the previous "return url:null + base64"
        # branch returned 200 with no URL, which the builder displayed
        # as a vague "HTTP 200" error because no consumer ever read the
        # base64 data. Fail loudly so the operator (or ops) knows R2
        # env vars are missing on this service.
        raise HTTPException(
            status_code=503,
            detail=(
                "R2 storage not configured on agents service. "
                "Set R2_ENDPOINT_URL / R2_BUCKET_NAME / R2_ACCESS_KEY_ID / "
                "R2_SECRET_ACCESS_KEY / R2_PUBLIC_URL on dw-church-agents."
            ),
        )

    # Build a tenant-scoped R2 key when the proxy provided slug. The uuid
    # prefix avoids collisions on identical filenames across calls; the
    # tenant_<slug> prefix matches the existing files-table convention.
    import uuid as _uuid
    filename = f"ai-image-{body.variant}.png"
    if body.tenantSlug:
        explicit_key = f"tenant_{body.tenantSlug}/ai-images/{_uuid.uuid4().hex[:8]}-{filename}"
    else:
        # Legacy / unrouted callers — keep working but emit a warning so
        # ops can find any caller that didn't migrate.
        explicit_key = None
        logger.warning(
            "image/generate called without tenantSlug — image will end up "
            "under dw/_global/ and won't appear in any Media Library."
        )

    storage_key, url = r2.upload_bytes(
        data,
        filename,
        mime="image/png",
        key=explicit_key,
    )

    # Register the image in the tenant's Media Library. Skipped silently
    # for legacy callers without tenantId — those become orphans (the
    # warning above flags the upload site for cleanup).
    if body.tenantId:
        await _register_ai_image_with_server(
            tenant_id=body.tenantId,
            storage_key=storage_key,
            url=url,
            size_bytes=len(data),
            mime_type="image/png",
            body=body,
        )

    return {"url": url, "storageKey": storage_key, "mime": "image/png", "info": info}

