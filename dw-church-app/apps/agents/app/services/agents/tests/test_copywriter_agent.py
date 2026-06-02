"""Unit tests for PageContentAgent (page-content endpoint)."""

from __future__ import annotations

import json

import pytest

from app.services.agents.copywriter import (
    PageContentAgent,
    PageContentDecision,
    PageContentInput,
    PageSection,
)
from app.services.agents.shared.llm_client import (
    LLMClient,
    LLMRequest,
    LLMResponse,
)


class _CapturingLLMClient(LLMClient):
    def __init__(self, canned_text: str) -> None:
        super().__init__()
        self._canned = canned_text
        self.last_request: LLMRequest | None = None
        self.last_agent: str = ""

    async def complete(self, request: LLMRequest, *, agent: str) -> LLMResponse:  # type: ignore[override]
        self.last_request = request
        self.last_agent = agent
        return LLMResponse(text=self._canned)


# ──────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────


def _full_page_payload() -> dict:
    """Representative 5-section payload covering hero / features /
    text-image / testimonials / cta — common for a Home page."""
    return {"sections": [
        {
            "sectionType": "hero",
            "title": "프리미엄 도매 난초",
            "subtitle": "플로리다 최대 규모 양식장에서 직접",
            "buttonText": "문의하기",
            "buttonLink": "/contact",
            "imagePrompt": "Premium orchid greenhouse, natural light, wide angle",
            "items": [],
        },
        {
            "sectionType": "features",
            "title": "왜 우리를 선택해야 하는가",
            "items": [
                {"title": "30일 개화 보장", "description": "수령 후 30일 이내 개화 시작 보증"},
                {"title": "전문 양식가 검수", "description": "재배 전문가 직접 출하"},
                {"title": "전국 익일 배송", "description": "콜드체인 배송"},
            ],
        },
        {
            "sectionType": "text-image",
            "title": "30년의 양식 노하우",
            "description": "1994년부터 플로리다에서 양식해온 가족 운영 농장.",
            "imagePrompt": "Workers tending orchid plants in a Florida greenhouse",
            "items": [],
        },
        {
            "sectionType": "testimonials",
            "title": "고객의 목소리",
            "items": [
                {"quote": "발색이 정말 좋아요", "author": "김XX", "company": "ABC 화원"},
            ],
        },
        {
            "sectionType": "cta",
            "title": "도매 견적이 필요하신가요?",
            "subtitle": "30분 안에 회신드립니다.",
            "buttonText": "견적 요청",
            "buttonLink": "/quote",
            "bgMode": "accent",
            "items": [],
        },
    ]}


# ──────────────────────────────────────────────────────────────────
# Round-trip
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_page_content_returns_validated_decision() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    out = await agent.run(PageContentInput(
        businessName="Korus Orchid",
        industry="Wholesale Plants",
        pageName="Home",
        pageSlug="/",
        sectionsToMake=["hero", "features", "text-image", "testimonials", "cta"],
        marketingContext='regional b2b wholesale',
        designSystem={"primary": "#1a4d2e"},
    ))
    assert isinstance(out, PageContentDecision)
    assert len(out.sections) == 5
    assert isinstance(out.sections[0], PageSection)
    assert out.sections[0].section_type == "hero"
    # Items + optional fields round-trip through the schema.
    assert len(out.sections[1].items) == 3
    assert out.sections[4].bg_mode == "accent"
    assert fake.last_agent == "page_content_agent"


@pytest.mark.asyncio
async def test_page_content_dump_emits_camelcase_keys() -> None:
    """The router converts the typed list back to dicts for the
    storefront's pattern-map. camelCase aliases must round-trip
    (sectionType / buttonText / buttonLink / imagePrompt / bgMode /
    ctaShape) — snake_case dumps would break the pattern-map lookup."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    out = await agent.run(PageContentInput(pageName="Home"))
    dumped = [s.model_dump(by_alias=True) for s in out.sections]
    for d in dumped:
        assert "sectionType" in d
    # Spot-check fields with snake-case-vs-camelCase split.
    cta = dumped[-1]
    assert "buttonText" in cta
    assert "bgMode" in cta


# ──────────────────────────────────────────────────────────────────
# Cost lock + caching
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_page_content_uses_sonnet() -> None:
    """Cost lock: page-content stays on Sonnet. Quality matters most
    here — switching to Haiku or a smaller model risks the bland
    /generic copy that erases the value of the AI workflow."""
    agent = PageContentAgent()
    assert agent.model_spec.provider == "claude"
    assert "sonnet" in agent.model_spec.model.lower()


@pytest.mark.asyncio
async def test_page_content_has_cache_system_enabled() -> None:
    """Phase 2-6 caching applies here too — the section-type guide is
    static across calls and the per-section AI button fires multiple
    times per session, so cache hits compound."""
    agent = PageContentAgent()
    assert agent.model_spec.cache_system is True


@pytest.mark.asyncio
async def test_page_content_section_guide_in_cached_system() -> None:
    """SECTION TYPE GUIDE belongs in the cached system block, not the
    per-call user prompt. Lock the placement so a future refactor
    doesn't push it back into the user prompt and erase the cache hit."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home"))
    user_prompt = fake.last_request.prompt  # type: ignore[union-attr]
    system_prompt = fake.last_request.system  # type: ignore[union-attr]

    # Section-type guide + items shape examples live in the cache.
    assert "SECTION TYPE GUIDE" in system_prompt
    assert "features — items:" in system_prompt
    assert "pricing — items:" in system_prompt
    assert "testimonials — items:" in system_prompt

    # Per-input directives stay in user prompt. Default language is en,
    # so the English label appears.
    assert "Sections to make:" in user_prompt
    # Reference to system-side guide rather than re-listing it inline.
    assert "SECTION TYPE GUIDE" in user_prompt or "system instructions" in user_prompt


# ──────────────────────────────────────────────────────────────────
# Per-input behavior
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_page_content_replace_mode_instruction_en() -> None:
    """Replace mode tells the model to write the page from scratch.
    Lock the English phrasing (default language) against drift."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home", mode="replace"))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "Write the entire page from scratch" in prompt


@pytest.mark.asyncio
async def test_page_content_replace_mode_instruction_ko() -> None:
    """When the operator opts into Korean via the wizard toggle the
    prompt switches to Korean phrasing — same intent, different
    language."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home", mode="replace", language="ko"))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "처음부터 새로 작성" in prompt


@pytest.mark.asyncio
async def test_page_content_append_mode_instruction_en() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(
        pageName="Home", mode="append",
        existingSummary="Existing on page:\n- hero: main",
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "Keep the tone and voice of the existing sections" in prompt
    assert "Do not repeat the wording" in prompt
    # Existing summary reaches the prompt verbatim.
    assert "hero: main" in prompt


@pytest.mark.asyncio
async def test_page_content_append_mode_instruction_ko() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(
        pageName="Home", mode="append", language="ko",
        existingSummary="현재 페이지에 이미 있는 섹션:\n- hero: 메인",
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "기존 섹션의 톤과 어조를 유지" in prompt
    assert "겹치지 않게" in prompt
    assert "hero: 메인" in prompt


@pytest.mark.asyncio
async def test_page_content_handles_minimal_input_en() -> None:
    """Per-section AI button sometimes fires before the operator has
    filled in much context — only pageName is set. Empty optional
    fields render as '(not specified)' / '(none)' / 'default' so
    Sonnet doesn't see visible double-colons it would treat as JSON
    delimiters. Default language is English."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    out = await agent.run(PageContentInput(pageName="About"))
    assert len(out.sections) >= 1
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "(not specified)" in prompt or "(none)" in prompt or "default" in prompt


@pytest.mark.asyncio
async def test_page_content_handles_minimal_input_ko() -> None:
    """Same empty-input handling in Korean mode renders Korean
    placeholders instead."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    out = await agent.run(PageContentInput(pageName="About", language="ko"))
    assert len(out.sections) >= 1
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "(미정)" in prompt or "(없음)" in prompt or "기본" in prompt


@pytest.mark.asyncio
async def test_page_content_language_default_is_en() -> None:
    """Default language is English even with no input — operator must
    explicitly opt into Korean via the wizard toggle."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home"))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "Output language: en" in prompt


@pytest.mark.asyncio
async def test_page_content_default_sections_when_empty() -> None:
    """sections_to_make=[] triggers the 'hero, features, about, cta'
    default in the prompt. The router pre-fills sections by page name
    before this point but defensive default keeps the agent safe to
    call with empty list."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home", sectionsToMake=[]))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "hero, features, about, cta" in prompt


# ──────────────────────────────────────────────────────────────────
# Dynamic BLOCK CATALOG injection
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_block_catalog_is_in_cached_system() -> None:
    """The BLOCK CATALOG (block_type + tags + description per block) is
    built from registry.json at import time and spliced into the
    cached system prompt. Locking placement so a future refactor
    doesn't move it into the per-call user prompt and erase the cache
    hit, or drop it entirely."""
    fake = _CapturingLLMClient(json.dumps(_full_page_payload()))
    agent = PageContentAgent(llm_client=fake)
    await agent.run(PageContentInput(pageName="Home"))
    system_prompt = fake.last_request.system  # type: ignore[union-attr]

    # Header + at least one canonical block from each big group.
    assert "BLOCK CATALOG" in system_prompt
    assert "hero_banner" in system_prompt
    assert "features_grid" in system_prompt
    assert "testimonials" in system_prompt
    assert "cta_section" in system_prompt
    # Tags surface in brackets — fuzzy-match anchors for the LLM.
    assert "above-fold" in system_prompt
    assert "social-proof" in system_prompt
    # Hidden + alias blocks are filtered out — only canonical entries
    # reach the LLM.
    assert "layout_columns" not in system_prompt
    assert "hero_full_width" not in system_prompt
