"""Unit tests for BusinessParseAgent + TextSuggestAgent + PageListSuggestAgent.

Same shape as test_strategy_agent.py: a CapturingLLMClient stubs the
network so we assert on the prompt the agent built and the structured
output it returns. No model is actually called.
"""

from __future__ import annotations

import json

import pytest

from app.services.agents.business import (
    PAGE_LIST_FIELD,
    BusinessParseAgent,
    BusinessParseInput,
    BusinessParseOutput,
    PageListSuggestAgent,
    PageListSuggestOutput,
    SuggestInput,
    TextSuggestAgent,
    TextSuggestOutput,
    parse_text_suggestions,
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
# BusinessParseAgent
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_business_parse_returns_validated_profile() -> None:
    canned = json.dumps({
        "businessName": "Korus Orchid Corporation",
        "industry": "Wholesale Horticulture",
        "description": "Florida-based premium wholesale orchid grower.",
        "services": "Phalaenopsis, Oncidium, tropical orchids",
        "targetAudience": "Garden centers, retail nurseries",
        "brandKeywords": "premium, reliable, large-scale",
        "location": "Apopka, FL 32712",
        "referenceUrls": "https://better-gro.com\nhttps://costafarms.com",
    })
    fake = _CapturingLLMClient(canned)
    agent = BusinessParseAgent(llm_client=fake)
    out = await agent.run(BusinessParseInput(prompt="orchid wholesaler in Florida..."))
    assert isinstance(out, BusinessParseOutput)
    assert out.business_name == "Korus Orchid Corporation"
    assert out.location == "Apopka, FL 32712"
    assert "better-gro" in out.reference_urls
    assert fake.last_agent == "business_parse_agent"


@pytest.mark.asyncio
async def test_business_parse_uses_gemini_flash() -> None:
    """Cost lock: parseBusiness must NOT regress to Sonnet — that path
    was 50× the cost of Flash for marginal extraction quality. If a
    future tweak swaps the model spec by accident this test fails."""
    agent = BusinessParseAgent()
    assert agent.model_spec.provider == "gemini"
    assert agent.model_spec.model == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_business_parse_prompt_carries_user_input_verbatim() -> None:
    """The free-text prompt must reach the LLM unmodified — we don't
    pre-summarize or truncate. Operators sometimes paste paragraphs
    that include URL hints, brand notes, etc. that the model needs."""
    user_text = (
        "We run Korus Orchid Corporation, a wholesale grower in Apopka FL. "
        "Reference sites: better-gro.com, costafarms.com."
    )
    fake = _CapturingLLMClient(json.dumps({}))
    agent = BusinessParseAgent(llm_client=fake)
    await agent.run(BusinessParseInput(prompt=user_text))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert user_text in prompt
    # Schema directive — without "Return JSON only" Flash sometimes
    # wraps in markdown fences.
    assert "Return JSON only" in prompt


@pytest.mark.asyncio
async def test_business_parse_tolerates_partial_extraction() -> None:
    """LLM returning only a subset of fields shouldn't 500 the wizard.
    Defaults of empty string preserve the operator's manual values
    when they merge the parsed profile into existing state."""
    canned = json.dumps({"businessName": "X", "industry": "Y"})
    fake = _CapturingLLMClient(canned)
    agent = BusinessParseAgent(llm_client=fake)
    out = await agent.run(BusinessParseInput(prompt="x"))
    assert out.business_name == "X"
    assert out.location == ""
    assert out.reference_urls == ""


# ──────────────────────────────────────────────────────────────────
# TextSuggestAgent
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_text_suggest_returns_validated_list() -> None:
    canned = json.dumps({"suggestions": [
        "Garden centers", "Retail nurseries", "Landscape designers",
        "Hotel chains", "Restaurants", "Event venues",
        "Botanical gardens", "Florists", "Interior designers",
        "Property managers",
    ]})
    fake = _CapturingLLMClient(canned)
    agent = TextSuggestAgent(llm_client=fake)
    out = await agent.run(SuggestInput(
        field="targetAudience",
        context={"businessName": "Korus", "industry": "Wholesale Plants",
                 "description": "Florida orchid wholesaler"},
    ))
    assert isinstance(out, TextSuggestOutput)
    assert len(out.suggestions) == 10
    assert "Garden centers" in out.suggestions


@pytest.mark.asyncio
async def test_text_suggest_uses_flash_lite() -> None:
    """Cost lock: TextSuggestAgent must run on Flash-Lite. This is the
    single most-called LLM on the wizard (5-10× per session) so a
    silent upgrade to Flash or Sonnet here multiplies platform costs."""
    agent = TextSuggestAgent()
    assert agent.model_spec.provider == "gemini"
    assert agent.model_spec.model == "gemini-2.5-flash-lite"


@pytest.mark.asyncio
async def test_text_suggest_prompt_includes_business_context() -> None:
    """Without business context, suggestions are generic. The prompt
    template must interpolate the businessName / industry / description
    so 'targetAudience for Korus orchid wholesaler' reads differently
    from 'targetAudience for Joe's Pizza'."""
    fake = _CapturingLLMClient(json.dumps({"suggestions": ["a"]}))
    agent = TextSuggestAgent(llm_client=fake)
    await agent.run(SuggestInput(
        field="brandKeywords",
        context={"businessName": "Korus", "industry": "Wholesale Plants",
                 "description": "Premium orchid wholesaler"},
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "Korus" in prompt
    assert "Wholesale Plants" in prompt
    assert "Premium orchid wholesaler" in prompt
    # JSON directive — Flash-Lite drifts to bullet-list output without
    # explicit shape guidance.
    assert '"suggestions"' in prompt


@pytest.mark.asyncio
async def test_text_suggest_rejects_unknown_field() -> None:
    agent = TextSuggestAgent(llm_client=_CapturingLLMClient("{}"))
    with pytest.raises(ValueError, match="unsupported field"):
        await agent.run(SuggestInput(field="bogus", context={}))


@pytest.mark.asyncio
async def test_text_suggest_handles_missing_context_gracefully() -> None:
    """Wizard sometimes calls suggest on Step 2 before any field is filled —
    only freePrompt was parsed. Empty/missing fields render as '(미정)'
    rather than blank strings that would make the prompt look broken."""
    fake = _CapturingLLMClient(json.dumps({"suggestions": ["a"]}))
    agent = TextSuggestAgent(llm_client=fake)
    await agent.run(SuggestInput(field="services", context={}))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "(미정)" in prompt


# ──────────────────────────────────────────────────────────────────
# PageListSuggestAgent
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_page_list_suggest_returns_hierarchical_pages() -> None:
    canned = json.dumps({"suggestions": [
        {"name": "Home", "slug": "/"},
        {"name": "About", "slug": "/about"},
        {"name": "Products", "slug": "/products"},
        {"name": "Phalaenopsis", "slug": "/products/phalaenopsis", "parent": "/products"},
        {"name": "Oncidium",     "slug": "/products/oncidium",     "parent": "/products"},
        {"name": "Contact", "slug": "/contact"},
    ]})
    fake = _CapturingLLMClient(canned)
    agent = PageListSuggestAgent(llm_client=fake)
    out = await agent.run(SuggestInput(
        field=PAGE_LIST_FIELD,
        context={"businessName": "Korus", "industry": "Wholesale Plants"},
    ))
    assert isinstance(out, PageListSuggestOutput)
    parents = [s for s in out.suggestions if s.parent]
    assert len(parents) == 2
    assert parents[0].parent == "/products"


@pytest.mark.asyncio
async def test_page_list_suggest_uses_gemini_flash_not_lite() -> None:
    """pageList needs Flash, not Flash-Lite — Flash-Lite tends to
    flatten the parent/child hierarchy and we end up with 15 root
    pages and no nesting. The Sitemap step's chip layout falls apart
    when that happens."""
    agent = PageListSuggestAgent()
    assert agent.model_spec.provider == "gemini"
    assert agent.model_spec.model == "gemini-2.5-flash"


# ──────────────────────────────────────────────────────────────────
# parse_text_suggestions helper (legacy fallback)
# ──────────────────────────────────────────────────────────────────


def test_parse_text_suggestions_strips_bullets_and_numbering() -> None:
    raw = (
        "1. Garden centers\n"
        "2. Retail nurseries\n"
        "- Landscape designers\n"
        "• Hotels\n"
        "Florists\n"
    )
    parsed = parse_text_suggestions(raw)
    assert "Garden centers" in parsed
    assert "Retail nurseries" in parsed
    assert "Landscape designers" in parsed
    assert "Hotels" in parsed
    assert "Florists" in parsed
    # Numbering / bullets all gone.
    assert all(not s[0].isdigit() for s in parsed)
    assert all(not s.startswith(("-", "·", "•")) for s in parsed)


def test_parse_text_suggestions_caps_at_ten() -> None:
    raw = "\n".join(f"{i}. item {i}" for i in range(20))
    parsed = parse_text_suggestions(raw)
    assert len(parsed) == 10
