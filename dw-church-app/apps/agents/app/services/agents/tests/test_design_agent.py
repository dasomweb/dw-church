"""Unit tests for DesignAgent.

Same shape as the other agent test suites — CapturingLLMClient stubs
the network so we assert on prompt construction + structured output
without burning tokens.
"""

from __future__ import annotations

import json

import pytest

from app.services.agents.design import (
    ColorPalette,
    DesignAgent,
    DesignDecision,
    DesignInput,
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
# Fixtures — sample valid output
# ──────────────────────────────────────────────────────────────────


def _palette(primary: str = "#1a1a2e") -> dict:
    """One valid 8-slot palette. Hex values are arbitrary but match
    the WCAG-AA-ish text/background pair (#1a1a2e on #ffffff = 16.6:1)."""
    return {
        "primary": primary,
        "secondary": "#16213e",
        "accent": "#e94560",
        "background": "#ffffff",
        "surface": "#f5f5f5",
        "text": "#1a1a2e",
        "muted": "#6b7280",
        "border": "#e5e7eb",
    }


def _font_option(name: str = "Modern Sans") -> dict:
    return {
        "name": name,
        "heading": "Inter",
        "body": "Inter",
        "koreanFont": "Pretendard",
        "mood": "modern, clean",
        "style": "Geometric sans-serif pairing",
    }


def _full_design_payload() -> dict:
    """Minimal-but-valid 9-color × 6-font response. Used as the canned
    response for round-trip tests so the schema validates cleanly."""
    return {
        "colorOptions": [
            {"name": f"Option {i}", "mood": "modern", "harmony": "complementary",
             "colors": _palette()}
            for i in range(9)
        ],
        "fontOptions": [
            _font_option(f"Pair {i}") for i in range(6)
        ],
        "fontSizes": {
            "desktop": {"h1": "48px", "h2": "36px", "h3": "28px", "body": "16px"},
            "mobile":  {"h1": "32px", "h2": "26px", "h3": "22px", "body": "14px"},
        },
        "spacing": {"sectionPadding": "80px", "containerMax": "1200px"},
        "borderRadius": {"sm": "6px", "md": "12px", "lg": "20px"},
    }


# ──────────────────────────────────────────────────────────────────
# DesignAgent
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_design_agent_returns_validated_decision() -> None:
    fake = _CapturingLLMClient(json.dumps(_full_design_payload()))
    agent = DesignAgent(llm_client=fake)
    out = await agent.run(DesignInput(
        businessName="Korus Orchid Corporation",
        industry="Wholesale Horticulture",
        brandKeywords="premium, reliable, large-scale",
        preferredMood="modern",
        languages="English, Korean",
    ))
    assert isinstance(out, DesignDecision)
    assert len(out.color_options) == 9
    assert len(out.font_options) == 6
    assert isinstance(out.color_options[0].colors, ColorPalette)
    # All 8 palette slots round-tripped.
    for c in out.color_options:
        assert all([c.colors.primary, c.colors.secondary, c.colors.accent,
                    c.colors.background, c.colors.surface, c.colors.text,
                    c.colors.muted, c.colors.border])
    assert fake.last_agent == "design_agent"


@pytest.mark.asyncio
async def test_design_agent_uses_gemini_flash() -> None:
    """Cost lock: design-system stays on Gemini Flash. Sonnet here was
    overkill for structured token output and cost ~50× more for
    marginal palette-quality gains. Schema retry catches Flash's
    occasional dropped-slot misses."""
    agent = DesignAgent()
    assert agent.model_spec.provider == "gemini"
    assert agent.model_spec.model == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_design_agent_dump_emits_camelcase_keys() -> None:
    """The wizard renders this output as designSystem.colorOptions /
    .fontOptions / .fontSizes / .borderRadius / .colors.koreanFont —
    snake_case dumps would break every consumer."""
    fake = _CapturingLLMClient(json.dumps(_full_design_payload()))
    agent = DesignAgent(llm_client=fake)
    out = await agent.run(DesignInput(industry="cafe"))
    dumped = out.model_dump(by_alias=True)
    expected_top = {"colorOptions", "fontOptions", "fontSizes", "spacing", "borderRadius"}
    assert set(dumped.keys()) == expected_top
    # Nested aliases too — koreanFont, sectionPadding, containerMax.
    assert "koreanFont" in dumped["fontOptions"][0]
    assert "sectionPadding" in dumped["spacing"]
    assert "containerMax" in dumped["spacing"]


@pytest.mark.asyncio
async def test_design_agent_prompt_carries_business_inputs() -> None:
    """The Design step's quality depends on the prompt threading
    industry / brand keywords / preferred mood through. Lock this so
    a future input refactor doesn't silently strip context."""
    fake = _CapturingLLMClient(json.dumps(_full_design_payload()))
    agent = DesignAgent(llm_client=fake)
    await agent.run(DesignInput(
        businessName="Korus",
        industry="Wholesale Horticulture",
        brandKeywords="premium, reliable",
        preferredMood="modern",
        demographics="B2B retail buyers",
        languages="English, Korean",
    ))
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    assert "Korus" in prompt
    assert "Wholesale Horticulture" in prompt
    assert "premium, reliable" in prompt
    assert "modern" in prompt
    assert "B2B retail buyers" in prompt
    assert "English, Korean" in prompt
    # Spacing context from spacing_core.get_spacing_for_prompt
    assert "여백 시스템" in prompt
    # JSON-shape directive
    assert "colorOptions" in prompt
    assert "fontOptions" in prompt


@pytest.mark.asyncio
async def test_design_agent_handles_bare_industry_input() -> None:
    """Operator sometimes runs the wizard with only industry filled in
    (e.g. 'cafe' on a fresh tenant). The agent must produce a usable
    design system from minimal context — empty optional fields render
    as '—' in the prompt rather than visible double-colons that Flash
    occasionally treats as JSON delimiters."""
    fake = _CapturingLLMClient(json.dumps(_full_design_payload()))
    agent = DesignAgent(llm_client=fake)
    out = await agent.run(DesignInput(industry="cafe"))
    assert len(out.color_options) == 9
    prompt = fake.last_request.prompt  # type: ignore[union-attr]
    # Em-dash placeholder for empty optional fields
    assert "—" in prompt


@pytest.mark.asyncio
async def test_design_agent_prompt_demands_korean_font_authenticity() -> None:
    """Without an explicit nudge Flash sometimes returns 'Apple SD
    Gothic-style' or other transliterations as koreanFont. The system
    prompt names actual families so that's caught at the source."""
    agent = DesignAgent()
    sys = agent.system_prompt()
    assert "Pretendard" in sys or "Noto Sans KR" in sys
    # Korean font directive
    assert "Korean" in sys
