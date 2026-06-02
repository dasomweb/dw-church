"""ArchitectAgent — site IA / sitemap generation.

Runs on Gemini Pro (NOT Flash). Cost rationale:
  - Single call per wizard invocation, but the output drives the
    entire downstream pipeline (Content / Build steps regenerate from
    this list). A bad sitemap → 10 bad pages → wasted Copywriter
    spend. So this is the place to spend a few extra cents on
    reasoning quality.
  - Hierarchical decisions (which products to group under which
    category, when to use a #-prefix label-only menu vs a real
    category page, where to nest deeply vs keep flat) require multi-
    step planning that Flash sometimes flubs. Pro 2.5 handles it
    consistently.
  - Compared to Sonnet, Pro is ~3-4× cheaper for similar output
    quality on structured-IA tasks. Using Pro instead of Sonnet
    keeps the cost knob aligned with the cost-conscious philosophy
    the user laid out earlier.

The output schema reuses PageSuggestion from the business package so
downstream consumers (SitemapStep, ContentMap) treat sitemap and
suggest output identically.
"""

from __future__ import annotations

from app.services.agents.architect.domain import (
    SitemapDecision,
    SitemapInput,
)
from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import ModelSpec
from app.services.agents.shared.must_haves import format_must_haves

# Architect runs on Claude Opus 4.7 per the operator's model policy
# (project_ai_model_policy memory): Planner / Designer = Opus 4.7. Sitemap
# is the canonical IA every downstream agent regenerates from — a wrong
# sitemap cascades into wrong pages, so the most accurate model is
# warranted. Previously on Gemini Pro 2.5; the operator observed that
# Gemini returned similar first-options across tenants, contributing to
# the "every site looks the same" symptom.
_OPUS = "claude-opus-4-7"


class ArchitectAgent(BaseAgent[SitemapInput, SitemapDecision]):
    """Designs site IA from business profile + marketing strategy.

    Output is the canonical list the wizard's Sitemap step shows as
    chip-grid for include/exclude. Every downstream agent (Copywriter,
    Build) regenerates from these exact pages, so a missing-parent
    bug here cascades — schema-typing the output is what catches it
    before the bad sitemap ships."""

    name = "architect_agent"
    model_spec = ModelSpec(
        provider="claude",
        model=_OPUS,
        max_tokens=4000,
    )
    output_schema = SitemapDecision
    # 1 retry — same calculus as DesignAgent. Schema validation catches
    # Pro's rare "wraps the array in a {pages: ...} envelope" misses.
    max_schema_retries = 1

    def system_prompt(self) -> str:
        return (
            "You are a senior information architect for B2B and SMB "
            "websites. You design site structure that operators can "
            "actually populate — never propose a 6-level deep nesting "
            "or a 50-page sitemap when 12 pages would carry the same "
            "intent. Page names follow the explicit `Output language` "
            "directive in the user prompt — never auto-detect from "
            "business name characters. Output ONLY valid JSON in the "
            "shape requested — no prose, no markdown fences."
        )

    def build_prompt(self, input: SitemapInput) -> str:
        # Optional fields render as the locale-appropriate placeholder
        # ("(not specified)" / "(미정)") so the prompt doesn't have
        # visible "Description: \nServices: " gaps that Pro occasionally
        # treats as section breaks.
        is_ko = input.language == "ko"
        empty = "(미정)" if is_ko else "(not specified)"

        def _or_dash(v: str) -> str:
            return v if v else empty

        marketing_empty = "(없음)" if is_ko else "(none)"
        marketing = input.marketing_strategy if input.marketing_strategy else marketing_empty

        # Operator must-haves come FIRST. Architect specifically reads
        # required_pages — those MUST appear in the sitemap output.
        must_have_block = format_must_haves(
            must_haves=input.must_haves,
            required_pages=input.required_pages,
            required_key_messages=input.required_key_messages,
            required_stats=input.required_stats,
            is_ko=is_ko,
        )

        if is_ko:
            header = (
                f"'{_or_dash(input.business_name)}' "
                f"({_or_dash(input.industry)}) 웹사이트의 사이트맵을 생성하세요.\n"
                f"사업 설명: {_or_dash(input.description)}\n"
                f"서비스: {_or_dash(input.services)}\n"
                f"타겟 고객: {_or_dash(input.target_audience)}\n"
                f"마케팅 전략: {marketing}\n"
                "\n"
                "[출력 언어] 모든 페이지 이름(name 필드)을 한국어로 작성하세요. "
                "Home / About / Contact 같은 일반 명사도 한국어로(홈/회사 소개/연락처).\n"
                "\n"
                "규칙:\n"
                "- 페이지 10~20개. Home 1개 + 카테고리 4~6개 + "
                "카테고리당 자식 2~5개.\n"
                "- 같은 주제 페이지가 3개 이상이면 반드시 부모 카테고리 아래로 묶을 것.\n"
                "  예: 제품이 5개면 \"/our-products\" 부모 + 5개 자식.\n"
                "- **자식 페이지는 nested slug 사용**: "
                "부모 \"/our-products\" → 자식 \"/our-products/widget-a\".\n"
                "- 부모는 두 가지 방식 중 택1:\n"
                "  a) 콘텐츠가 있는 카테고리 페이지 → 일반 slug \"/our-products\"\n"
                "  b) 라벨만 있는 메뉴 그룹 → \"#our-products\"\n"
                "- 마지막에 Contact / Quote / CTA 페이지 1~2개.\n"
                "- top-level 메뉴 항목은 8개를 넘지 말 것.\n"
            )
        else:
            header = (
                f"Generate a sitemap for '{_or_dash(input.business_name)}' "
                f"({_or_dash(input.industry)}) website.\n"
                f"Description: {_or_dash(input.description)}\n"
                f"Services: {_or_dash(input.services)}\n"
                f"Target audience: {_or_dash(input.target_audience)}\n"
                f"Marketing strategy: {marketing}\n"
                "\n"
                "[OUTPUT LANGUAGE] Write every page name (the `name` field) "
                "in English.\n"
                "\n"
                "Rules:\n"
                "- 10-20 pages. 1 Home + 4-6 categories + 2-5 children per "
                "category.\n"
                "- If 3+ pages share a topic, group them under a parent "
                "category. e.g. 5 products → \"/our-products\" parent + 5 "
                "children.\n"
                "- **Child pages use nested slugs**: parent \"/our-products\""
                " → child \"/our-products/widget-a\".\n"
                "- Parent is one of two shapes:\n"
                "  a) A real category page with content → normal slug "
                "\"/our-products\"\n"
                "  b) A label-only menu group → \"#our-products\"\n"
                "- End with 1-2 Contact / Quote / CTA pages.\n"
                "- Top-level menu items <= 8.\n"
            )

        # Locale-aware JSON example. Previously a single English example
        # (Home / About / Our Products / Contact) was shown to the model
        # in both languages — Gemini Pro frequently copy-pasted those
        # English page names into Korean sitemaps. See
        # feedback-no-hardcoded-defaults.
        if is_ko:
            example_block = (
                '{\n'
                '  "pages": [\n'
                '    {"name": "홈", "slug": "/"},\n'
                '    {"name": "회사 소개", "slug": "/about"},\n'
                '    {"name": "제품", "slug": "/products"},\n'
                '    {"name": "제품 A", "slug": "/products/widget-a", '
                '"parent": "/products"},\n'
                '    {"name": "문의", "slug": "/contact"}\n'
                '  ]\n'
                '}'
            )
        else:
            example_block = (
                '{\n'
                '  "pages": [\n'
                '    {"name": "Home", "slug": "/"},\n'
                '    {"name": "About", "slug": "/about"},\n'
                '    {"name": "Our Products", "slug": "/our-products"},\n'
                '    {"name": "Widget A", "slug": "/our-products/widget-a", '
                '"parent": "/our-products"},\n'
                '    {"name": "Contact", "slug": "/contact"}\n'
                '  ]\n'
                '}'
            )
        return (
            must_have_block
            + header
            + "\n"
            + "Return ONLY this JSON shape (no markdown fences):\n"
            + example_block
        )
