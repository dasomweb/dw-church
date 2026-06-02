"""Unit tests for StrategyAgent and InsightAgent.

Validates the prompt-construction contract (census fact-block injection,
hallucination guards, schema enforcement) and the end-to-end run path
through a fake LLMClient. No network is touched.
"""

from __future__ import annotations

import json

import pytest

from app.services.agents.shared.llm_client import (
    LLMClient,
    LLMRequest,
    LLMResponse,
)
from app.services.agents.strategy import (
    CensusSnapshot,
    InsightAgent,
    InsightInput,
    MarketingInsight,
    StrategyAgent,
    StrategyDecision,
    StrategyInput,
)

# ──────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────


def _census_fixture() -> CensusSnapshot:
    """Sample census snapshot — same shape census_service.fetch_census_data
    returns. Built via the alias-key constructor to mirror the real call
    site (the dict comes from JSON over the wire, so camelCase keys)."""
    return CensusSnapshot.model_validate({
        "zipCode": "32703",
        "totalPopulation": 50_000,
        "medianAge": 38.4,
        "medianIncome": 56_000,
        "households": 18_000,
        "gender": {"male": 24_000, "female": 26_000, "malePct": "48.0%", "femalePct": "52.0%"},
        "race": {"white": "55.0%", "black": "10.0%", "asian": "5.0%", "hispanic": "26.5%", "other": "3.5%"},
        "education": {"collegePlusPct": "38.2%"},
        "summary": "ZIP 32703: Pop 50,000 | Age 38.4 | Income $56,000 | "
                   "White 55.0%, Hispanic 26.5%, Asian 5.0%, Black 10.0% | College+ 38.2%",
    })


class _CapturingLLMClient(LLMClient):
    """LLMClient stub that captures the prompt and returns a canned
    text. Useful for asserting on what the agent built before sending."""

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
# StrategyAgent
# ──────────────────────────────────────────────────────────────────


def _full_strategy_payload() -> dict:
    """Canned 11-field StrategyDecision payload — the shape the LLM is
    asked to return. Reused across tests so a schema change shows up in
    one place."""
    return {
        "deliveryModel": "regional",
        "transactionType": "b2b",
        "revenueModel": "repeat",
        "segmentAxis": ["firmographic", "behavioral"],
        "positioning": "프리미엄 B2B 도매 공급",
        "involvementLevel": "high",
        "purchaseBlocker": "evaluation",
        "mixFocus": "7p",
        "keyP": "process",
        "funnelCoverage": ["awareness", "consideration", "purchase"],
        "primaryCTA": "quote",
    }


def _minimal_strategy_payload(**overrides) -> dict:
    """Smallest valid payload — explicitly fills every required field
    with sensible defaults, then applies caller overrides. Tests that
    don't care about specific fields use this to stay terse."""
    base = {
        "deliveryModel": "local",
        "transactionType": "b2c",
        "revenueModel": "one-time",
        "segmentAxis": ["geographic"],
        "positioning": "x",
        "involvementLevel": "low",
        "purchaseBlocker": "awareness",
        "mixFocus": "4p",
        "keyP": "product",
        "funnelCoverage": ["awareness"],
        "primaryCTA": "buy",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_strategy_agent_returns_validated_decision() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_strategy_payload()))
    agent = StrategyAgent(llm_client=fake)
    out = await agent.run(StrategyInput(
        businessName="Korus Orchid",
        industry="Wholesale Plants",
        description="Florida-based premium orchid supplier",
        location="Apopka, FL 32703",
        targetAudience="Large retailers and garden centers",
        census=_census_fixture(),
    ))
    assert isinstance(out, StrategyDecision)
    # The four new fields must round-trip through validation.
    assert out.delivery_model == "regional"
    assert out.transaction_type == "b2b"
    assert out.revenue_model == "repeat"
    assert out.key_p == "process"
    # Spot-check the existing fields too — these were the v1 schema.
    assert out.involvement_level == "high"
    assert out.primary_cta == "quote"
    assert "firmographic" in out.segment_axis
    assert fake.last_agent == "strategy_agent"


@pytest.mark.asyncio
async def test_strategy_agent_dump_emits_all_eleven_camelcase_fields() -> None:
    """The frontend's MarketingCore expects exactly these 11 keys —
    drift here breaks Marketing Strategy auto-fill silently. Lock it
    with an explicit set comparison."""
    fake = _CapturingLLMClient(json.dumps(_full_strategy_payload()))
    agent = StrategyAgent(llm_client=fake)
    out = await agent.run(StrategyInput(businessName="X", industry="Y"))
    dumped = out.model_dump(by_alias=True)
    expected_keys = {
        "deliveryModel", "transactionType", "revenueModel",
        "segmentAxis", "positioning", "involvementLevel",
        "purchaseBlocker", "mixFocus", "keyP",
        "funnelCoverage", "primaryCTA",
    }
    assert set(dumped.keys()) == expected_keys


@pytest.mark.asyncio
async def test_strategy_agent_injects_census_facts_into_prompt() -> None:
    fake = _CapturingLLMClient(json.dumps(_minimal_strategy_payload()))
    agent = StrategyAgent(llm_client=fake)
    await agent.run(StrategyInput(
        businessName="X",
        industry="Y",
        census=_census_fixture(),
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    # Census numbers must appear verbatim — agents must NOT paraphrase
    # them away or the hallucination guard is meaningless.
    assert "32703" in prompt
    assert "50,000" in prompt              # total population
    assert "$56,000" in prompt             # median income
    assert "26.5%" in prompt               # hispanic
    # Hallucination guard wording
    assert "GROUND TRUTH" in prompt
    assert "DO NOT MODIFY" in prompt


@pytest.mark.asyncio
async def test_strategy_agent_prompt_asks_for_all_eleven_fields() -> None:
    """If the prompt drops a field name the LLM may omit it from the
    JSON, breaking schema validation. Lock the prompt against that
    drift by asserting every field name appears in the prompt."""
    fake = _CapturingLLMClient(json.dumps(_minimal_strategy_payload()))
    agent = StrategyAgent(llm_client=fake)
    await agent.run(StrategyInput(businessName="X", industry="Y"))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    for field in [
        "deliveryModel", "transactionType", "revenueModel",
        "segmentAxis", "positioning", "involvementLevel",
        "purchaseBlocker", "mixFocus", "keyP",
        "funnelCoverage", "primaryCTA",
    ]:
        assert field in prompt, f"prompt missing {field}"


@pytest.mark.asyncio
async def test_strategy_agent_field_guidance_lives_in_cached_system() -> None:
    """Phase 2-6: the FIELD GUIDANCE block (~2KB of static taxonomy)
    moved from build_prompt to system_prompt so Anthropic's ephemeral
    cache covers it. Lock the placement so a future refactor doesn't
    silently push it back into the per-call user prompt and erase the
    cache hit."""
    fake = _CapturingLLMClient(json.dumps(_minimal_strategy_payload()))
    agent = StrategyAgent(llm_client=fake)
    await agent.run(StrategyInput(businessName="X", industry="Y"))
    user_prompt = fake.last_request.prompt  # type: ignore[union-attr]
    system_prompt = fake.last_request.system  # type: ignore[union-attr]

    # Field guidance verbiage is cache-resident (system).
    assert "FIELD GUIDANCE" in system_prompt
    assert "deliveryModel — where service happens" in system_prompt
    assert "transactionType — who buys" in system_prompt

    # Per-input directives still live in the user prompt (not cached).
    assert "[BUSINESS]" in user_prompt
    assert "[OUTPUT JSON SHAPE]" in user_prompt
    assert "Refer to the FIELD GUIDANCE in your system instructions" in user_prompt


@pytest.mark.asyncio
async def test_strategy_agent_has_cache_system_enabled() -> None:
    """Cost lock: cache_system stays True on Sonnet agents. Ephemeral
    cache writes 1.25× / reads 0.1× — disabling this would 10× the
    system-prompt cost on the second+ call within the wizard's analysis
    step (Strategy → Insight back-to-back)."""
    agent = StrategyAgent()
    assert agent.model_spec.cache_system is True
    assert "+cached" in agent.model_spec.label()


@pytest.mark.asyncio
async def test_strategy_agent_warns_when_census_missing() -> None:
    fake = _CapturingLLMClient(json.dumps(_minimal_strategy_payload(
        segmentAxis=["demographic"],
    )))
    agent = StrategyAgent(llm_client=fake)
    await agent.run(StrategyInput(businessName="X", industry="Y", census=None))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    # When census is unavailable the prompt explicitly tells the model
    # to bail rather than hallucinate.
    assert "CENSUS DATA — UNAVAILABLE" in prompt
    assert "Do NOT invent" in prompt


@pytest.mark.asyncio
async def test_strategy_agent_uses_claude_sonnet() -> None:
    """Lock the model choice so a future tweak doesn't silently
    downgrade to Haiku (cost-cutting that breaks Marketing Insight
    quality is exactly the regression we want to catch)."""
    agent = StrategyAgent()
    assert agent.model_spec.provider == "claude"
    assert "sonnet" in agent.model_spec.model.lower()


# ──────────────────────────────────────────────────────────────────
# InsightAgent
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_insight_agent_returns_validated_insight() -> None:
    long_markdown = "# Marketing Strategy Report\n\n" + ("Detailed B2B analysis. " * 50)
    fake = _CapturingLLMClient(json.dumps({"insight": long_markdown}))
    agent = InsightAgent(llm_client=fake)
    out = await agent.run(InsightInput(
        businessName="Korus Orchid",
        industry="Wholesale Plants",
        description="Premium orchid supplier",
        targetLocation="Florida",
        targeting="B2B retailers",
        census=_census_fixture(),
    ))
    assert isinstance(out, MarketingInsight)
    assert len(out.insight) >= 200
    assert fake.last_agent == "insight_agent"


@pytest.mark.asyncio
async def test_insight_agent_injects_census_facts() -> None:
    long_markdown = "# Report\n\n" + ("Body. " * 100)
    fake = _CapturingLLMClient(json.dumps({"insight": long_markdown}))
    agent = InsightAgent(llm_client=fake)
    await agent.run(InsightInput(
        businessName="X",
        industry="Y",
        census=_census_fixture(),
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "$56,000" in prompt
    assert "32703" in prompt
    assert "GROUND TRUTH" in prompt


@pytest.mark.asyncio
async def test_insight_agent_includes_strategy_block_when_provided() -> None:
    """The (deliveryModel × transactionType) frame matrix is the whole
    point of receiving the strategy — without it the report defaults
    to ZIP-centric local marketing for every business. Lock both the
    frame matrix AND the strategy values into the prompt."""
    long_markdown = "# Report\n\n" + ("Body. " * 100)
    fake = _CapturingLLMClient(json.dumps({"insight": long_markdown}))
    agent = InsightAgent(llm_client=fake)
    strategy = StrategyDecision.model_validate(_full_strategy_payload())
    await agent.run(InsightInput(
        businessName="Korus Orchid",
        industry="Wholesale Plants",
        description="Premium orchid supplier",
        targetLocation="Apopka, FL 32703",
        targeting="B2B retailers across the Southeast",
        census=_census_fixture(),
        strategy=strategy,
    ))
    user_prompt = fake.last_request.prompt  # type: ignore[union-attr]
    system_prompt = fake.last_request.system  # type: ignore[union-attr]
    # Frame matrix headers — these moved to the system prompt as part
    # of Phase 2-6 prompt caching (~4KB of static text now read-cached
    # at 0.1× cost on the second+ call within the 5-min window).
    assert "ANALYSIS FRAME" in system_prompt
    assert "Regional-B2B / Wholesale" in system_prompt
    assert "International / Trade / Export" in system_prompt
    # Per-input strategy values still reach the user prompt verbatim
    # (kept out of the cached system block so the cache fingerprint
    # stays stable across runs).
    assert "deliveryModel:   regional" in user_prompt
    assert "transactionType: b2b" in user_prompt
    assert "프리미엄 B2B 도매 공급" in user_prompt


@pytest.mark.asyncio
async def test_insight_agent_handles_missing_strategy_gracefully() -> None:
    """When the frontend doesn't send a strategy yet (legacy callers,
    or a partial run), the InsightAgent must still produce a report —
    the prompt falls back to inference-from-description rather than
    erroring out."""
    long_markdown = "# Report\n\n" + ("Body. " * 100)
    fake = _CapturingLLMClient(json.dumps({"insight": long_markdown}))
    agent = InsightAgent(llm_client=fake)
    out = await agent.run(InsightInput(
        businessName="X",
        industry="Y",
        census=_census_fixture(),
        strategy=None,
    ))
    assert isinstance(out, MarketingInsight)
    user_prompt = fake.last_request.prompt  # type: ignore[union-attr]
    system_prompt = fake.last_request.system  # type: ignore[union-attr]
    # Missing-strategy guard wording stays in the per-input user
    # prompt — it's about the absence of THIS run's strategy.
    assert "STRATEGY — UNAVAILABLE" in user_prompt
    # Frame matrix is in the cached system prompt — it's the model's
    # persistent role definition, identical across every run.
    assert "ANALYSIS FRAME" in system_prompt


@pytest.mark.asyncio
async def test_insight_agent_caches_section_guidance_too() -> None:
    """Phase 2-6: section guidance (~2KB) moved to system_prompt
    alongside frame matrix. Together that's ~4KB of stable text the
    ephemeral cache covers — the single largest caching win in the
    pipeline. Lock the placement against drift."""
    fake = _CapturingLLMClient(json.dumps({"insight": "x" * 250}))
    agent = InsightAgent(llm_client=fake)
    await agent.run(InsightInput(businessName="X", industry="Y"))
    system_prompt = fake.last_request.system  # type: ignore[union-attr]
    user_prompt = fake.last_request.prompt  # type: ignore[union-attr]

    # Both static blocks are cache-resident.
    assert "ANALYSIS FRAME" in system_prompt
    assert "SECTION CONTENT GUIDANCE" in system_prompt
    # Sample matrix rows that downstream prompts depend on.
    assert "Regional-B2B / Wholesale" in system_prompt
    assert "B2G (any geography)" in system_prompt

    # Per-run input only — the cache fingerprint stays stable.
    assert "[BUSINESS]" in user_prompt
    assert "ANALYSIS FRAME" not in user_prompt


@pytest.mark.asyncio
async def test_insight_agent_has_cache_system_enabled() -> None:
    """Same cost lock as StrategyAgent — InsightAgent's ~4KB of stable
    role text is the largest single caching opportunity in the pipeline,
    and it fires right after StrategyAgent so the cache is fresh."""
    agent = InsightAgent()
    assert agent.model_spec.cache_system is True
