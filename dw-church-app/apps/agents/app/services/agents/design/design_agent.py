"""DesignAgent — design system generation for the wizard's Design step.

Runs on Claude Opus 4.7 per the operator's model policy
(project_ai_model_policy memory: Planner / Designer = Opus 4.7). Design
system is the visual identity of the entire tenant site — every
downstream block reads from these tokens, so the brand differentiation
output quality directly determines whether "every site looks the same"
or whether each tenant gets a distinct visual feel. Previously on Gemini
Flash; the operator observed Flash returning similar first-options
across tenants, contributing to the "default look" symptom.

Industry-specific spacing context is injected via the existing
spacing_core.get_spacing_for_prompt() helper — keeps the
per-vertical "dense vs balanced vs spacious" guidance the wizard's
operators rely on.
"""

from __future__ import annotations

from app.services.agents.design.domain import (
    DesignDecision,
    DesignInput,
)
from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import ModelSpec
from app.services.planner.spacing_core import get_spacing_for_prompt

_OPUS = "claude-opus-4-7"


class DesignAgent(BaseAgent[DesignInput, DesignDecision]):
    """Produces 9 color palettes + 6 font pairings + size/spacing/radius
    tokens for the wizard's Design step. Output shape mirrors the
    storefront's theme.json contract verbatim."""

    name = "design_agent"
    model_spec = ModelSpec(
        provider="claude",
        model=_OPUS,
        max_tokens=8000,
    )
    output_schema = DesignDecision
    # 1 retry — schema is large and Flash occasionally drops a single
    # color slot. One retry recovers; more is wasted tokens for a call
    # that fires once per wizard run.
    max_schema_retries = 1

    def system_prompt(self) -> str:
        return (
            "You are a senior web design director with experience in B2B "
            "and SMB websites. Output ONLY valid JSON — no prose, no "
            "markdown fences, no commentary. Every color is a hex "
            "string. Text/background contrast must reach WCAG AA "
            "(≥ 4.5:1) on the body text pair. Korean fonts must be "
            "actual Korean families (Pretendard, Noto Sans KR, etc.) — "
            "not English transliterations."
        )

    def build_prompt(self, input: DesignInput) -> str:
        spacing_context = get_spacing_for_prompt(input.industry)

        # Optional fields render as "—" rather than empty strings so
        # the prompt doesn't have visible double-colons that Flash
        # sometimes treats as JSON delimiters and bail on.
        def _or_dash(v: str) -> str:
            return v if v else "—"

        return (
            "웹 디자인 디렉터로서, 비즈니스에 맞는 디자인 시스템을 만드세요.\n"
            "\n"
            f"사업: {_or_dash(input.business_name)} "
            f"({_or_dash(input.industry)})\n"
            f"브랜드 키워드: {_or_dash(input.brand_keywords)}\n"
            f"선호 컬러: {_or_dash(input.preferred_colors)}\n"
            f"선호 무드: {_or_dash(input.preferred_mood)}\n"
            f"타겟 인구: {_or_dash(input.demographics)}\n"
            f"언어: {_or_dash(input.languages or 'English')}\n"
            "\n"
            f"{spacing_context}\n"
            "\n"
            "9가지 컬러 옵션과 6가지 폰트 조합을 제안하세요.\n"
            "각 컬러 옵션의 colors 객체에는 다음 8개 키가 모두 포함되어야 합니다:\n"
            "  primary, secondary, accent, background, surface, text, muted, border\n"
            "각 폰트 옵션의 키: name, heading(영문), body(영문), "
            "koreanFont(한국어), mood, style.\n"
            "text↔background 대비비 4.5:1 이상 필수.\n"
            "\n"
            "Return ONLY this JSON shape (no markdown fences). All the\n"
            "values shown below are FORMAT placeholders — replace every\n"
            "one with values appropriate to the business's industry,\n"
            "brand keywords, and audience. Do not copy the example\n"
            "px values verbatim; pick sizes that fit the brand's mood.\n"
            "See feedback-no-hardcoded-defaults — Gemini Flash has been\n"
            "observed copying example numerics across many sites:\n"
            "{\n"
            '  "colorOptions": [\n'
            '    {"name": "<옵션명>", "mood": "<분위기>", "harmony": "<배색원리>", '
            '"colors": {"primary":"<#hex>","secondary":"<#hex>","accent":"<#hex>",'
            '"background":"<#hex>","surface":"<#hex>","text":"<#hex>","muted":"<#hex>",'
            '"border":"<#hex>"}}\n'
            "  ],\n"
            '  "fontOptions": [\n'
            '    {"name": "<옵션명>", "heading": "<Heading Font Name>", "body": "<Body Font Name>", '
            '"koreanFont": "<한국어 폰트>", "mood": "<분위기>", "style": "<스타일 설명>"}\n'
            "  ],\n"
            '  "fontSizes": {\n'
            '    "desktop": {"h1":"<NNpx>","h2":"<NNpx>","h3":"<NNpx>","body":"<NNpx>"},\n'
            '    "mobile":  {"h1":"<NNpx>","h2":"<NNpx>","h3":"<NNpx>","body":"<NNpx>"}\n'
            "  },\n"
            '  "spacing": {"sectionPadding":"<NNpx>","containerMax":"<NNNNpx>"},\n'
            '  "borderRadius": {"sm":"<NNpx>","md":"<NNpx>","lg":"<NNpx>"}\n'
            "}"
        )
