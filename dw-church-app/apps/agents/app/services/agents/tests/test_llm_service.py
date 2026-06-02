"""Unit tests for llm_service — covers the HTTP body construction
edge cases the LLMClient layer can't see.

Most planner / agent tests stub call_claude / call_gemini entirely.
That misses bugs inside those functions themselves: how the request
body is constructed for different model variants, which Gemini model
families accept which generation_config keys, cache_control wiring,
etc. This file holds the tests that exercise the real call_*
functions with the HTTP layer intercepted via respx.
"""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from app.services.planner import llm_service


@pytest.fixture(autouse=True)
def _fake_keys(monkeypatch):
    """Both Gemini + Claude refuse to run without an API key. Tests
    don't care about the value — respx intercepts before the auth
    header is ever validated upstream — so a stub keeps the early
    return out of the way."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")


# ──────────────────────────────────────────────────────────────────
# call_gemini — thinking budget gating
# ──────────────────────────────────────────────────────────────────


def _gemini_success_response(text: str = "ok") -> dict:
    """Minimal valid Gemini response body."""
    return {
        "candidates": [{
            "content": {"parts": [{"text": text}]},
        }],
    }


@pytest.mark.asyncio
@respx.mock
async def test_call_gemini_flash_sets_thinking_budget_zero() -> None:
    """Flash 2.5 + Flash-Lite must get thinkingBudget=0 — without it
    the model burns the entire maxOutputTokens budget on hidden
    reasoning and returns 400 with no candidates (parse-business
    used to hit this regularly at max_tokens=1500)."""
    route = respx.post(
        url__regex=r".*models/gemini-2\.5-flash:generateContent.*"
    ).mock(return_value=httpx.Response(200, json=_gemini_success_response()))

    await llm_service.call_gemini("test", max_tokens=500, model="gemini-2.5-flash")

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    cfg = body.get("generationConfig", {})
    assert cfg.get("thinkingConfig") == {"thinkingBudget": 0}


@pytest.mark.asyncio
@respx.mock
async def test_call_gemini_flash_lite_sets_thinking_budget_zero() -> None:
    """Flash-Lite (used by TextSuggestAgent — 5-10× per wizard run)
    needs the same thinking-disable as Flash, otherwise the chip
    suggestions take 8+ seconds instead of 1-2."""
    route = respx.post(
        url__regex=r".*models/gemini-2\.5-flash-lite:generateContent.*"
    ).mock(return_value=httpx.Response(200, json=_gemini_success_response()))

    await llm_service.call_gemini(
        "test", max_tokens=500, model="gemini-2.5-flash-lite",
    )

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    cfg = body.get("generationConfig", {})
    assert cfg.get("thinkingConfig") == {"thinkingBudget": 0}


@pytest.mark.asyncio
@respx.mock
async def test_call_gemini_pro_omits_thinking_config() -> None:
    """Gemini 2.5 Pro REJECTS thinkingBudget=0 with
    'Budget 0 is invalid. This model only works in thinking mode.'
    Pro is reserved for ArchitectAgent (hierarchical IA) which
    actually benefits from chain-of-thought reasoning, so we leave
    the thinking budget at the model's default. Regression we hit
    in production after Phase 2-4 shipped — locked here."""
    route = respx.post(
        url__regex=r".*models/gemini-2\.5-pro:generateContent.*"
    ).mock(return_value=httpx.Response(200, json=_gemini_success_response()))

    await llm_service.call_gemini("test", max_tokens=500, model="gemini-2.5-pro")

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    cfg = body.get("generationConfig", {})
    # No thinkingConfig key at all — Pro decides its own budget.
    assert "thinkingConfig" not in cfg


@pytest.mark.asyncio
@respx.mock
async def test_call_gemini_legacy_15_omits_thinking_config() -> None:
    """gemini-1.5-* rejects the thinkingConfig key entirely (HTTP 400
    'unknown name "thinkingConfig"'). The version-prefix gate keeps
    these calls clean."""
    route = respx.post(
        url__regex=r".*models/gemini-1\.5-flash:generateContent.*"
    ).mock(return_value=httpx.Response(200, json=_gemini_success_response()))

    await llm_service.call_gemini("test", max_tokens=500, model="gemini-1.5-flash")

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    cfg = body.get("generationConfig", {})
    assert "thinkingConfig" not in cfg


# ──────────────────────────────────────────────────────────────────
# call_claude — cache_system wiring
# ──────────────────────────────────────────────────────────────────


def _claude_success_response(text: str = "ok") -> dict:
    return {
        "content": [{"type": "text", "text": text}],
        "usage": {
            "input_tokens": 10,
            "output_tokens": 5,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        },
    }


@pytest.mark.asyncio
@respx.mock
async def test_call_claude_cache_system_sends_cache_control() -> None:
    """Phase 2-6: cache_system=True must send `system` as a list with
    cache_control:{type:ephemeral} on the only system block. Without
    that wiring the flag is dead code — Anthropic ignores anything
    that isn't shaped exactly so."""
    route = respx.post(llm_service.ANTHROPIC_API_URL).mock(
        return_value=httpx.Response(200, json=_claude_success_response()),
    )

    await llm_service.call_claude(
        "user prompt", system="cached role", max_tokens=500,
        cache_system=True,
    )

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    # system must be a LIST of typed blocks, not a bare string.
    assert isinstance(body["system"], list)
    assert body["system"][0]["type"] == "text"
    assert body["system"][0]["text"] == "cached role"
    assert body["system"][0]["cache_control"] == {"type": "ephemeral"}


@pytest.mark.asyncio
@respx.mock
async def test_call_claude_no_cache_uses_bare_string_system() -> None:
    """Default path (cache_system=False) sends system as a bare
    string — that's the legacy shape every other caller relies on."""
    route = respx.post(llm_service.ANTHROPIC_API_URL).mock(
        return_value=httpx.Response(200, json=_claude_success_response()),
    )

    await llm_service.call_claude(
        "user prompt", system="plain role", max_tokens=500,
    )

    assert route.called
    body = json.loads(route.calls.last.request.content.decode("utf-8"))
    assert body["system"] == "plain role"
