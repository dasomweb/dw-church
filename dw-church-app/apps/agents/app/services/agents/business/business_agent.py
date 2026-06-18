"""BusinessParseAgent + TextSuggestAgent + PageListSuggestAgent.

All three run on Gemini Flash — Flash for parse / pageList because they
need light reasoning (page hierarchy, multi-field extraction), Flash-Lite
for the chip-style text suggestions where 10-quick-strings is the whole
job. Cost rationale (per the project's cost-optimization rule):

  - parseBusiness fires once per wizard invocation. Sonnet here would
    give marginally better extraction but at ~50× the cost of Flash.
    Flash handles structured extraction reliably for free-text inputs
    of this size.

  - suggest fires every time the operator clicks "AI Suggest" next to
    a single field — so 5-10× per wizard run. Sonnet was overkill for
    "give me 10 brand-keyword chips for a coffee shop" and added 8-10s
    of latency that hurts the chip-click feel. Flash-Lite returns in
    1-2s for the same task at ~1% the Sonnet cost.

  - pageList sits between the two — it's a single call but the output
    needs the LLM to think about parent/child grouping and slug nesting.
    Flash gets it consistently; Flash-Lite tends to flatten.

Each agent picks an explicit ModelSpec rather than relying on defaults
so cost regressions show up as a diff in this file.
"""

from __future__ import annotations

import json

from app.services.agents.business.domain import (
    BusinessParseInput,
    BusinessParseOutput,
    PageListSuggestOutput,
    SuggestInput,
    TextSuggestOutput,
)
from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import ModelSpec

# Model identifiers. Centralized so the cost-knob lives in one place.
_GEMINI_FLASH = "gemini-2.5-flash"
_GEMINI_FLASH_LITE = "gemini-2.5-flash-lite"


# ──────────────────────────────────────────────────────────────────
# BusinessParseAgent — free text → typed BusinessInfo
# ──────────────────────────────────────────────────────────────────


class BusinessParseAgent(BaseAgent[BusinessParseInput, BusinessParseOutput]):
    """Extract structured business profile from a free-form prompt.

    Single-shot extraction; no chain-of-thought. The output is consumed
    directly by the admin-app PlannerWizard's setBusiness call so the
    field names below MUST match the BusinessInfo TypeScript interface.
    """

    name = "business_parse_agent"
    # Flash, not Flash-Lite — the prompt has up to ~1KB of free text to
    # parse and we need decent JSON discipline. max_tokens=1500 covers
    # the 8-field JSON envelope plus any short reasoning the model emits.
    model_spec = ModelSpec(provider="gemini", model=_GEMINI_FLASH, max_tokens=1500)
    output_schema = BusinessParseOutput

    def system_prompt(self) -> str:
        return (
            "You are a business analyst. Extract structured information "
            "from free-text business descriptions. Output ONLY valid JSON, "
            "with no prose, no commentary, no markdown fences. Empty "
            "string for fields the input doesn't mention — never invent."
        )

    def build_prompt(self, input: BusinessParseInput) -> str:
        return (
            "Extract business information from the following description.\n"
            "Return JSON only:\n"
            "\n"
            "{\n"
            '  "businessName": "extracted name or empty string",\n'
            '  "industry": "extracted industry/category",\n'
            '  "description": "1-2 sentence business description",\n'
            '  "services": "comma-separated services/products",\n'
            '  "targetAudience": "target customers",\n'
            '  "brandKeywords": "brand style keywords (comma-separated)",\n'
            '  "location": "business location",\n'
            '  "referenceUrls": "newline-separated URLs if mentioned, '
            'or empty"\n'
            "}\n"
            "\n"
            "User input:\n"
            f"{input.prompt}"
        )


# ──────────────────────────────────────────────────────────────────
# TextSuggestAgent — 10 short suggestions for chip-style fields
# ──────────────────────────────────────────────────────────────────


# Per-field prompt templates. Centralized so the wording stays
# consistent and one operator request to "make brand keywords longer"
# touches one block. Each template gets the relevant business-info
# context interpolated at call time.
# Phase 11-A4 (dw-church): "비즈니스" → "교회" 로 terminology 정리.
# field key 는 frontend wizard 와 공유 (camelCase) 라서 그대로 유지.
_TEXT_SUGGEST_PROMPTS: dict[str, str] = {
    "targetAudience": (
        "'{biz}' ({ind}) 교회의 타겟 성도/방문자층을 10가지 제안하세요.\n"
        "교회 소개: {desc}\n"
        "예: '30-40대 가정', '청년층', '새가족', '시니어' 등.\n"
        "각각 한 줄(25자 이내), 번호 없이, 줄바꿈 구분."
    ),
    "services": (
        "'{biz}' ({ind}) 교회의 주요 사역과 활동을 10가지 제안하세요.\n"
        "교회 소개: {desc}\n"
        "예: '주일예배', '청년부', '주일학교', '전도사역', '구역모임' 등.\n"
        "각각 한 줄(20자 이내), 번호 없이, 줄바꿈 구분."
    ),
    "brandKeywords": (
        "'{biz}' ({ind}) 교회의 디자인 분위기/무드 키워드를 10가지 제안하세요.\n"
        "교회 소개: {desc}\n"
        "예: '따뜻한', '경건한', '현대적인', '가정적인' 등.\n"
        "각각 한 단어~짧은 구, 번호 없이, 줄바꿈 구분."
    ),
    "businessDescription": (
        "'{biz}' ({ind}) 교회의 소개 문구를 3가지 제안하세요.\n"
        "교회 웹사이트의 메인 또는 비전 페이지에 사용할 2-3문장짜리 소개문.\n"
        "각 제안은 줄바꿈으로 구분, 번호나 라벨 없이."
    ),
}


class TextSuggestAgent(BaseAgent[SuggestInput, TextSuggestOutput]):
    """Returns 10-ish chip-style suggestions for a single field."""

    name = "text_suggest_agent"
    # Flash-Lite — this is the cost-critical agent. Operators click
    # "AI Suggest" multiple times per wizard invocation; an extra Sonnet
    # call here adds dollars across thousands of users for marginal
    # improvement. Flash-Lite's instruction-following is sufficient for
    # "give me 10 short strings".
    model_spec = ModelSpec(
        provider="gemini",
        model=_GEMINI_FLASH_LITE,
        max_tokens=600,  # 10 lines × ~50 tokens + JSON envelope
    )
    output_schema = TextSuggestOutput
    # No retries — the output is so small that a malformed response is
    # almost always a "the model decided to wrap it in code fences"
    # problem that one retry won't fix. Cheaper to fall back via the
    # router's exception handler than to spend more tokens.
    max_schema_retries = 1

    def system_prompt(self) -> str:
        return (
            "You suggest concrete, on-topic options for a Christian church "
            "website wizard. Always return JSON only — no prose, no markdown "
            "fences. Each suggestion is a short string."
        )

    def build_prompt(self, input: SuggestInput) -> str:
        template = _TEXT_SUGGEST_PROMPTS.get(input.field)
        if template is None:
            raise ValueError(
                f"TextSuggestAgent: unsupported field '{input.field}'. "
                f"Allowed: {sorted(_TEXT_SUGGEST_PROMPTS.keys())}"
            )
        ctx = input.context or {}
        body = template.format(
            biz=ctx.get("businessName", "") or "(미정)",
            ind=ctx.get("industry", "") or "(미정)",
            desc=ctx.get("description", "") or "(없음)",
        )
        # JSON-shape directive last — overrides any habit Flash-Lite has
        # of returning bullet-pointed plain text.
        return (
            f"{body}\n\n"
            'Return ONLY this JSON shape:\n'
            '{"suggestions": ["str1", "str2", ...]}'
        )


# ──────────────────────────────────────────────────────────────────
# PageListSuggestAgent — sitemap suggestion (name + slug + parent?)
# ──────────────────────────────────────────────────────────────────


class PageListSuggestAgent(BaseAgent[SuggestInput, PageListSuggestOutput]):
    """Returns 10-20 sitemap suggestions with parent/child hierarchy."""

    name = "page_list_suggest_agent"
    # Flash, not Flash-Lite — the model has to think about category
    # grouping and nested slugs which Flash-Lite tends to flatten. 1500
    # tokens covers ~20 page entries with parent metadata.
    model_spec = ModelSpec(provider="gemini", model=_GEMINI_FLASH, max_tokens=1500)
    output_schema = PageListSuggestOutput
    max_schema_retries = 1

    def system_prompt(self) -> str:
        return (
            "You design website information architecture for Korean churches. "
            "Output ONLY valid JSON. No prose, no markdown fences. "
            "Hierarchy matters — group related pages under shared parents. "
            "Standard church site structure: 홈 / 교회 소개 (비전·연혁·교역자) / "
            "예배·말씀 (설교·주보·칼럼) / 공동체 (사역·행사·갤러리·게시판) / 오시는 길."
        )

    def build_prompt(self, input: SuggestInput) -> str:
        ctx = input.context or {}
        biz = ctx.get("businessName", "") or "(미정)"
        ind = ctx.get("industry", "") or "(미정)"
        desc = ctx.get("description", "") or "(없음)"
        services = ctx.get("services", "") or "(미정)"
        ta = ctx.get("targetAudience", "") or "(미정)"
        return (
            f"'{biz}' ({ind}) 교회 웹사이트의 사이트맵을 제안하세요.\n"
            f"교회 소개: {desc}\n"
            f"사역: {services}\n"
            f"타겟 성도/방문자: {ta}\n"
            "\n"
            "규칙:\n"
            "- 상위 메뉴 slug는 #name (라벨용 메뉴 그룹), 하위 페이지는 "
            "parent 포함\n"
            "- 10-20페이지\n"
            "- 표준 카테고리 우선 적용: 교회 소개 / 예배·말씀 / 공동체 / 오시는 길\n"
            "- 자식은 nested slug 사용 (부모 '/about' → 자식 "
            "'/about/vision')\n"
            "\n"
            "Return ONLY this JSON shape (no markdown fences):\n"
            '{"suggestions": ['
            '{"name": "Home", "slug": "/"},'
            '{"name": "About", "slug": "/about"},'
            '{"name": "Widget A", "slug": "/products/widget-a", '
            '"parent": "/products"}'
            "]}"
        )


# ──────────────────────────────────────────────────────────────────
# Helper for the planner router — picks the right Suggest variant.
# ──────────────────────────────────────────────────────────────────


def parse_text_suggestions(raw_text: str) -> list[str]:
    """Convert the legacy newline-separated suggestion format into the
    structured shape TextSuggestOutput expects. Used by the router when
    falling back to call_llm directly (e.g. legacy clients still hitting
    the old code path during the Phase 2-2 deploy)."""
    suggestions: list[str] = []
    for line in raw_text.strip().split("\n"):
        s = line.strip().lstrip("- ·•").strip()
        if not s:
            continue
        # Strip leading numbering: "1. foo" / "1) foo"
        if s and s[0].isdigit() and ". " in s[:4]:
            s = s[s.index(". ") + 2:]
        suggestions.append(s)
    return suggestions[:10]


# Re-export json for the router's defensive parsing if the agent ever
# returns text the schema-retry policy can't recover.
_json = json
