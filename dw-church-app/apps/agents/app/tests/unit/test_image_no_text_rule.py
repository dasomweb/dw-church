"""Image-service NO_TEXT_RULE enforcement tests.

These tests lock the prompt-assembly + systemInstruction shape that
prevents Gemini/Imagen from rendering text in generated images.
Operators reported that text was still leaking through despite the
constraint being present — the previous layout buried the rule at
the END of the prompt and didn't use Gemini's systemInstruction
channel at all. The rewrite front-loads the rule, adds a tail
reminder, and also passes it via systemInstruction. These tests
ensure that ordering doesn't silently regress.
"""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest

from app.services import image_service
from app.services.image_service import (
    _NO_TEXT_TAIL,
    NO_TEXT_RULE,
    QUALITY_RULES,
    build_section_prompt,
    generate_image_bytes,
)

# ──────────────────────────────────────────────────────────────────
# Static composition — locks the placement of the constraint
# ──────────────────────────────────────────────────────────────────


def test_no_text_rule_constants_are_distinct() -> None:
    """The full rule + tail reminder must be different strings. If they
    accidentally collapse to the same value, removing QUALITY_RULES
    would silently strip the front-load."""
    assert NO_TEXT_RULE
    assert _NO_TEXT_TAIL
    assert NO_TEXT_RULE != _NO_TEXT_TAIL


def test_no_text_rule_is_no_longer_duplicated_in_quality_rules() -> None:
    """QUALITY_RULES used to embed NO_TEXT_RULE. After the refactor,
    NO_TEXT_RULE is prepended separately and QUALITY_RULES should
    cover only photographic-quality directives — keep them
    orthogonal so the prompt has one source of truth per concern."""
    assert "ABSOLUTE RULE" not in QUALITY_RULES
    assert "no readable text" not in QUALITY_RULES.lower()


def test_build_section_prompt_leads_with_no_text_rule() -> None:
    """Legacy build_section_prompt: NO_TEXT_RULE is the first line and
    the tail reminder is the last line, with caller content sandwiched
    between."""
    p = build_section_prompt(
        variant="section",
        section_text="Modern interior of a flower wholesale store",
        style_descriptor="Brand: cozy, natural light",
    )
    lines = p.splitlines()
    assert lines[0].startswith("ABSOLUTE RULE"), (
        f"first line should be NO_TEXT_RULE, got: {lines[0]!r}"
    )
    assert _NO_TEXT_TAIL in lines[-1]


# ──────────────────────────────────────────────────────────────────
# generate_image_bytes — full pipeline, downstream calls mocked
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_image_bytes_prompt_sandwich() -> None:
    """generate_image_bytes wraps the caller prompt in
    [NO_TEXT_RULE ... caller ... QUALITY_RULES ... TAIL]. Validate
    the sandwich by capturing the prompt passed to _try_gemini_model."""
    captured: dict = {}

    async def fake_gemini(client, model, api_key, prompt, reference_urls=None):  # noqa: ARG001
        captured["prompt"] = prompt
        captured["model"] = model
        return b"\x89PNG\r\n", "image/png"

    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
         patch.object(image_service, "_try_gemini_model", side_effect=fake_gemini), \
         patch.object(image_service, "_try_imagen_model", AsyncMock(return_value=(None, "n/a"))):
        result, _info = await generate_image_bytes(
            "Hero image: lush orchid greenhouse with workers",
            variant="hero",
        )

    assert result == b"\x89PNG\r\n"

    final_prompt = captured["prompt"]
    # Front-loaded constraint — model attends to first tokens most.
    assert final_prompt.startswith(NO_TEXT_RULE)
    # Tail reminder at the end — anchors the constraint during the
    # final attention pass.
    assert final_prompt.rstrip().endswith(_NO_TEXT_TAIL)
    # Caller's content is preserved unchanged in the middle.
    assert "lush orchid greenhouse" in final_prompt
    # Quality rules come after the user prompt, before the tail.
    assert QUALITY_RULES in final_prompt


@pytest.mark.asyncio
async def test_generate_image_bytes_with_mode_keeps_no_text_first() -> None:
    """Mode policy prefix (space/product) inserts after NO_TEXT_RULE,
    not before it. The mode policy is heavy text ("preserve walls /
    windows / fixtures") — letting it come first would push the
    no-text rule out of the model's primary attention window."""
    captured: dict = {}

    async def fake_gemini(client, model, api_key, prompt, reference_urls=None):  # noqa: ARG001
        captured["prompt"] = prompt
        return b"\x89PNG\r\n", "image/png"

    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
         patch.object(image_service, "_try_gemini_model", side_effect=fake_gemini), \
         patch.object(image_service, "_try_imagen_model", AsyncMock(return_value=(None, "n/a"))):
        await generate_image_bytes(
            "Front view of the cafe",
            variant="hero",
            mode="space",
            reference_urls=["https://example.test/cafe.jpg"],
        )

    final_prompt = captured["prompt"]
    no_text_pos = final_prompt.find(NO_TEXT_RULE)
    policy_pos = final_prompt.find("SPACE / VENUE PHOTOGRAPHY POLICY")
    assert no_text_pos == 0, f"NO_TEXT_RULE should be at index 0, got {no_text_pos}"
    assert policy_pos > no_text_pos, (
        "mode policy must come AFTER the no-text rule"
    )


# ──────────────────────────────────────────────────────────────────
# Gemini systemInstruction — strongest place to park the constraint
# ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_try_gemini_model_includes_system_instruction() -> None:
    """_try_gemini_model must pass NO_TEXT_RULE in the
    systemInstruction field. Gemini weights systemInstruction more
    heavily than user-content parts, so this is the strongest place
    to enforce the constraint — especially when image-to-image
    references contain visible text the model would otherwise copy."""
    captured: dict = {}

    class FakeResponse:
        status_code = 200

        def json(self) -> dict:
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "inlineData": {
                                        "mimeType": "image/png",
                                        "data": "iVBORw0KGgo=",
                                    },
                                },
                            ],
                        },
                    },
                ],
            }

    class FakeClient:
        async def post(self, url, json, headers):  # noqa: ARG002, A002
            captured["body"] = json
            captured["url"] = url
            return FakeResponse()

    result, _info = await image_service._try_gemini_model(
        FakeClient(),  # type: ignore[arg-type]
        "gemini-3.1-flash-image-preview",
        "fake-key",
        "Demo prompt",
        reference_urls=None,
    )
    assert result is not None

    body = captured["body"]
    assert "systemInstruction" in body, (
        "Gemini request body must include systemInstruction with NO_TEXT_RULE"
    )
    sys_parts = body["systemInstruction"]["parts"]
    assert any(NO_TEXT_RULE in part.get("text", "") for part in sys_parts), (
        f"NO_TEXT_RULE must appear in systemInstruction parts, got: {sys_parts!r}"
    )
