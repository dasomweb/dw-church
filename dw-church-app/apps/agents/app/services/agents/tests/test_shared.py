"""Unit tests for the Phase 1 shared agent infrastructure.

What's covered:
  - LLMClient routes to the right llm_service function based on provider
  - LLMClient invokes record_call, so observability gets a metric
  - SchemaRetryPolicy succeeds on the first attempt with a valid response
  - SchemaRetryPolicy retries on JSON parse failure and recovers
  - SchemaRetryPolicy retries on Pydantic ValidationError and recovers
  - SchemaRetryPolicy raises SchemaValidationError when retries exhaust
  - BaseAgent end-to-end with a fake LLMClient and a tiny schema

No network is touched — all LLM calls go through fake clients that
return canned strings.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import BaseModel

from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import (
    LLMClient,
    LLMRequest,
    LLMResponse,
    ModelSpec,
)
from app.services.agents.shared.observability import (
    all_metrics,
    get_metrics,
)
from app.services.agents.shared.retry import (
    SchemaRetryPolicy,
    SchemaValidationError,
)

# ──────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────


class _Greeting(BaseModel):
    """Minimal output schema used across multiple tests."""

    salutation: str
    audience: str


# ──────────────────────────────────────────────────────────────────
# LLMClient
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_llmclient_dispatches_to_claude() -> None:
    client = LLMClient()
    spec = ModelSpec(provider="claude", model="claude-sonnet-4-6", max_tokens=200)
    with patch(
        "app.services.agents.shared.llm_client.llm_service.call_claude",
        new=AsyncMock(return_value="hi"),
    ) as mock_claude, patch(
        "app.services.agents.shared.llm_client.llm_service.call_gemini",
        new=AsyncMock(return_value="should_not_run"),
    ) as mock_gemini:
        out = await client.complete(
            LLMRequest(prompt="say hi", spec=spec),
            agent="test_agent",
        )
    assert isinstance(out, LLMResponse)
    assert out.text == "hi"
    mock_claude.assert_awaited_once()
    # cache_system defaults to False — uncached path passes flag through.
    assert mock_claude.call_args.kwargs.get("cache_system") is False
    mock_gemini.assert_not_awaited()


@pytest.mark.asyncio
async def test_llmclient_passes_cache_system_to_call_claude() -> None:
    """Phase 2-6: ModelSpec.cache_system flag must reach call_claude as
    a kwarg so the underlying API request includes the ephemeral
    cache_control marker. Without this, agents that set cache_system=True
    silently fall back to the uncached path."""
    client = LLMClient()
    spec = ModelSpec(
        provider="claude",
        model="claude-sonnet-4-6",
        max_tokens=200,
        cache_system=True,
    )
    with patch(
        "app.services.agents.shared.llm_client.llm_service.call_claude",
        new=AsyncMock(return_value="ok"),
    ) as mock_claude:
        await client.complete(
            LLMRequest(prompt="hi", system="cached role", spec=spec),
            agent="test_agent",
        )
    mock_claude.assert_awaited_once()
    assert mock_claude.call_args.kwargs.get("cache_system") is True
    # Sanity: the system prompt is forwarded so the cache_control marker
    # has something to attach to.
    assert mock_claude.call_args.kwargs.get("system") == "cached role"


def test_modelspec_label_marks_cached_variant() -> None:
    """ModelSpec.label() is what observability log lines use for cost
    tracking. Lock the +cached suffix so spend on cached calls is
    distinguishable from uncached calls in the metrics dump."""
    plain = ModelSpec(provider="claude", model="claude-sonnet-4-6")
    cached = ModelSpec(
        provider="claude", model="claude-sonnet-4-6", cache_system=True,
    )
    assert plain.label() == "claude:claude-sonnet-4-6"
    assert cached.label() == "claude:claude-sonnet-4-6+cached"


@pytest.mark.asyncio
async def test_llmclient_dispatches_to_gemini() -> None:
    client = LLMClient()
    spec = ModelSpec(provider="gemini", model="gemini-2.5-flash", max_tokens=200)
    with patch(
        "app.services.agents.shared.llm_client.llm_service.call_claude",
        new=AsyncMock(return_value="should_not_run"),
    ) as mock_claude, patch(
        "app.services.agents.shared.llm_client.llm_service.call_gemini",
        new=AsyncMock(return_value="hello"),
    ) as mock_gemini:
        out = await client.complete(
            LLMRequest(prompt="hi", spec=spec),
            agent="test_agent",
        )
    assert out.text == "hello"
    mock_gemini.assert_awaited_once()
    mock_claude.assert_not_awaited()


@pytest.mark.asyncio
async def test_llmclient_records_observability_metrics() -> None:
    client = LLMClient()
    before = get_metrics("obs_test_agent").calls
    with patch(
        "app.services.agents.shared.llm_client.llm_service.call_claude",
        new=AsyncMock(return_value="ok"),
    ):
        await client.complete(
            LLMRequest(prompt="x", spec=ModelSpec(provider="claude")),
            agent="obs_test_agent",
        )
    after = get_metrics("obs_test_agent")
    assert after.calls == before + 1
    assert after.successes >= 1


# ──────────────────────────────────────────────────────────────────
# SchemaRetryPolicy
# ──────────────────────────────────────────────────────────────────


class _TextOnly:
    """Stub matching LLMResponseLike — only .text needed."""

    def __init__(self, text: str) -> None:
        self.text = text


@pytest.mark.asyncio
async def test_retry_policy_first_attempt_success() -> None:
    policy = SchemaRetryPolicy(max_retries=2)
    calls = 0

    async def _call(extra: str) -> _TextOnly:
        nonlocal calls
        calls += 1
        return _TextOnly('{"salutation": "안녕", "audience": "world"}')

    out = await policy.run(output_schema=_Greeting, call=_call)
    assert calls == 1
    assert out.salutation == "안녕"
    assert out.audience == "world"


@pytest.mark.asyncio
async def test_retry_policy_recovers_on_invalid_json() -> None:
    policy = SchemaRetryPolicy(max_retries=2)
    attempts: list[str] = []

    async def _call(extra: str) -> _TextOnly:
        attempts.append(extra)
        if len(attempts) == 1:
            return _TextOnly("not json at all 그냥 텍스트")
        return _TextOnly('{"salutation": "Howdy", "audience": "you"}')

    out = await policy.run(output_schema=_Greeting, call=_call)
    assert len(attempts) == 2
    # First attempt: empty extra. Second: corrective hint.
    assert attempts[0] == ""
    assert "previous answer failed validation" in attempts[1]
    assert out.salutation == "Howdy"


@pytest.mark.asyncio
async def test_retry_policy_recovers_on_schema_mismatch() -> None:
    policy = SchemaRetryPolicy(max_retries=2)
    attempts: list[str] = []

    async def _call(extra: str) -> _TextOnly:
        attempts.append(extra)
        if len(attempts) == 1:
            # Valid JSON but wrong shape — `audience` missing.
            return _TextOnly('{"salutation": "Hey"}')
        return _TextOnly('{"salutation": "Hey", "audience": "B2B"}')

    out = await policy.run(output_schema=_Greeting, call=_call)
    assert len(attempts) == 2
    assert out.audience == "B2B"


@pytest.mark.asyncio
async def test_retry_policy_exhausts_and_raises() -> None:
    policy = SchemaRetryPolicy(max_retries=1)  # 1 retry = 2 attempts max

    async def _call(extra: str) -> _TextOnly:
        return _TextOnly("not valid")

    with pytest.raises(SchemaValidationError):
        await policy.run(output_schema=_Greeting, call=_call)


# ──────────────────────────────────────────────────────────────────
# BaseAgent
# ──────────────────────────────────────────────────────────────────


class _GreetingInput(BaseModel):
    audience: str


class _GreetingAgent(BaseAgent[_GreetingInput, _Greeting]):
    name = "greeting_test_agent"
    model_spec = ModelSpec(provider="claude", model="test-model", max_tokens=100)
    output_schema = _Greeting

    def system_prompt(self) -> str:
        return "You are a friendly greeter."

    def build_prompt(self, input: _GreetingInput) -> str:
        return f'Greet {input.audience}. Reply JSON: {{"salutation": "...", "audience": "..."}}.'


class _FakeLLMClient(LLMClient):
    """LLMClient stub that returns a canned response — no network."""

    def __init__(self, text: str) -> None:
        super().__init__()
        self._text = text

    async def complete(self, request: LLMRequest, *, agent: str) -> LLMResponse:  # type: ignore[override]
        return LLMResponse(text=self._text)


@pytest.mark.asyncio
async def test_base_agent_end_to_end() -> None:
    fake = _FakeLLMClient('{"salutation": "Howdy", "audience": "B2B operators"}')
    agent = _GreetingAgent(llm_client=fake)
    out = await agent.run(_GreetingInput(audience="B2B operators"))
    assert isinstance(out, _Greeting)
    assert out.salutation == "Howdy"
    assert out.audience == "B2B operators"


@pytest.mark.asyncio
async def test_base_agent_subclass_must_set_name() -> None:
    class _Broken(BaseAgent[_GreetingInput, _Greeting]):
        # name not set — should raise on construction
        model_spec = ModelSpec(provider="claude")
        output_schema = _Greeting

        def system_prompt(self) -> str:
            return ""

        def build_prompt(self, input: Any) -> str:
            return ""

    with pytest.raises(TypeError, match="must set `name`"):
        _Broken()


def test_all_metrics_returns_a_dict() -> None:
    metrics = all_metrics()
    assert isinstance(metrics, dict)
    # Greeting tests above ran first and seeded the dict; we don't
    # assert specific entries because test ordering across files isn't
    # guaranteed — just that the snapshot interface is sane.
    for agent_name, m in metrics.items():
        assert isinstance(agent_name, str)
        assert m.calls >= 0
