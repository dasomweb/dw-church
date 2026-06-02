"""Unit tests for ArchitectAgent (sitemap generation)."""

from __future__ import annotations

import json

import pytest

from app.services.agents.architect import (
    ArchitectAgent,
    SitemapDecision,
    SitemapInput,
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


def _full_sitemap_payload() -> dict:
    """A representative 12-page sitemap with both nested categories
    and a label-only menu group (#products)."""
    return {"pages": [
        {"name": "Home", "slug": "/"},
        {"name": "About", "slug": "/about"},
        {"name": "Mission", "slug": "/about/mission", "parent": "/about"},
        {"name": "Team", "slug": "/about/team", "parent": "/about"},
        {"name": "Products", "slug": "/products"},
        {"name": "Phalaenopsis", "slug": "/products/phalaenopsis", "parent": "/products"},
        {"name": "Oncidium", "slug": "/products/oncidium", "parent": "/products"},
        {"name": "Maxillaria", "slug": "/products/maxillaria", "parent": "/products"},
        {"name": "Wholesale", "slug": "/wholesale"},
        {"name": "Catalog", "slug": "/wholesale/catalog", "parent": "/wholesale"},
        {"name": "Contact", "slug": "/contact"},
        {"name": "Get a Quote", "slug": "/contact/quote", "parent": "/contact"},
    ]}


@pytest.mark.asyncio
async def test_architect_returns_validated_sitemap() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_sitemap_payload()))
    agent = ArchitectAgent(llm_client=fake)
    out = await agent.run(SitemapInput(
        businessName="Korus Orchid",
        industry="Wholesale Horticulture",
        description="Premium orchid wholesaler in Florida",
        services="Phalaenopsis, Oncidium, tropical orchids",
        targetAudience="Garden centers, retail nurseries",
        marketingStrategy='{"deliveryModel":"regional","transactionType":"b2b"}',
    ))
    assert isinstance(out, SitemapDecision)
    assert len(out.pages) == 12
    # Nesting was preserved through validation.
    nested = [p for p in out.pages if p.parent]
    assert len(nested) == 7
    assert any(p.slug == "/products/phalaenopsis" for p in nested)
    assert fake.last_agent == "architect_agent"


@pytest.mark.asyncio
async def test_architect_uses_gemini_pro() -> None:
    """Cost lock: sitemap stays on Gemini Pro (NOT Flash, NOT Sonnet).
    Pro is ~3-4× cheaper than Sonnet for similar IA quality, and Flash
    flubs hierarchical decisions on multi-product catalogs. Don't
    silently downgrade or upgrade."""
    agent = ArchitectAgent()
    assert agent.model_spec.provider == "gemini"
    assert agent.model_spec.model == "gemini-2.5-pro"


@pytest.mark.asyncio
async def test_architect_prompt_carries_marketing_strategy() -> None:
    """The marketing strategy isn't decorative — funnel coverage and
    segmentation choices should influence which pages get included.
    Lock the prompt against silently dropping it."""
    fake = _CapturingLLMClient(json.dumps(_full_sitemap_payload()))
    agent = ArchitectAgent(llm_client=fake)
    strategy = (
        '{"deliveryModel":"regional","transactionType":"b2b",'
        '"funnelCoverage":["awareness","consideration","purchase"]}'
    )
    await agent.run(SitemapInput(
        businessName="Korus", industry="Wholesale Plants",
        services="Phalaenopsis, Oncidium",
        marketingStrategy=strategy,
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "regional" in prompt
    assert "b2b" in prompt
    assert "funnelCoverage" in prompt
    # IA rules — locked because operators rely on them.
    assert "10~20" in prompt or "10-20" in prompt
    assert "nested slug" in prompt.lower() or "nested slug" in prompt


@pytest.mark.asyncio
async def test_architect_handles_minimal_input_en() -> None:
    """Wizard sometimes calls /sitemap with just industry + description
    filled in (operator skipped Step 3 chip refinement). Empty optional
    fields render as '(not specified)' rather than visible double
    colons that Pro occasionally treats as section breaks. Default
    language is English."""
    fake = _CapturingLLMClient(json.dumps(_full_sitemap_payload()))
    agent = ArchitectAgent(llm_client=fake)
    out = await agent.run(SitemapInput(industry="cafe"))
    assert len(out.pages) >= 5
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "(not specified)" in prompt


@pytest.mark.asyncio
async def test_architect_handles_minimal_input_ko() -> None:
    """Same minimal-input handling switches placeholders to Korean
    when the operator picks Korean in the wizard toggle."""
    fake = _CapturingLLMClient(json.dumps(_full_sitemap_payload()))
    agent = ArchitectAgent(llm_client=fake)
    out = await agent.run(SitemapInput(industry="cafe", language="ko"))
    assert len(out.pages) >= 5
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "(미정)" in prompt


@pytest.mark.asyncio
async def test_architect_rejects_too_few_pages() -> None:
    """Below 5 pages a sitemap doesn't justify the AI workflow — the
    operator might as well hand-author. Schema bound enforces this so
    a freak 2-page response surfaces as a validation error rather
    than silently shipping a near-empty wizard step."""
    from app.services.agents.shared.retry import SchemaValidationError

    sparse = {"pages": [
        {"name": "Home", "slug": "/"},
        {"name": "Contact", "slug": "/contact"},
    ]}
    fake = _CapturingLLMClient(json.dumps(sparse))
    agent = ArchitectAgent(llm_client=fake)
    with pytest.raises(SchemaValidationError):
        await agent.run(SitemapInput(industry="cafe"))
