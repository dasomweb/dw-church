"""CopywriterAgent — page-content generation for the per-section AI
button + the wizard's per-page builder path.

Stays on Sonnet 4.x. Cost rationale:
  - This is the agent that writes the actual website copy operators
    ship. Switching to a smaller model risks the kind of bland /
    generic output that erases the value of the whole pipeline; user
    feedback already established that quality matters most here.
  - cache_system=True: the static section-type guide + items shape
    examples (~1.5KB of stable text) live in the system prompt so
    Anthropic's ephemeral cache covers them. The per-section AI button
    fires multiple times per builder session, so cache hits compound:
    first call writes (1.25× input cost), every subsequent call reads
    (0.1× input cost) within the 5-minute window.

The output schema (PageContentDecision wrapping list[PageSection]) is
typed so the schema-retry policy catches Sonnet's rare "wraps the
list in a {sections: ...} envelope" or "drops a required sectionType
field" misses — the previous extract_json path silently dropped those.

NOTE: the bulk /content-map endpoint (Phase A + Phase B + parallel
batches) is a separate refactor — its prompt is bigger, the parallel
batching is delicate, and Phase A (Gemini Flash) doesn't need the
same migration. We leave content-map on the existing call_llm path
and migrate page-content alone here. Phase 2-5b can pick up the bulk
path once this proves out.
"""

from __future__ import annotations

import json

from app.services.agents.copywriter.block_catalog import build_block_catalog
from app.services.agents.copywriter.domain import (
    PageContentDecision,
    PageContentInput,
)
from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.church_voice import CHURCH_VOICE
from app.services.agents.shared.church_content_reference import CHURCH_CONTENT_REFERENCE
from app.services.agents.shared.llm_client import ModelSpec
from app.services.agents.shared.must_haves import format_must_haves

_SONNET = "claude-sonnet-4-6"


# Static portion of the prompt — moved here so it lives in the cached
# system block. Section type guide + items examples don't change
# between calls; only the per-page (business / page name / sections /
# design system / marketing context / mode) inputs vary.
#
# The BLOCK CATALOG (description + tags + useCases per block) is
# generated dynamically from registry.json so a new block / tag ships
# to the LLM automatically — no second copy to keep in sync. It still
# lives inside the cached system block; the catalog string is stable
# across calls within a process, so Anthropic's ephemeral cache
# covers it just like the rest of the rules text.
_BLOCK_CATALOG = build_block_catalog()


_COPYWRITER_RULES = (
    "[BLOCK CATALOG — pick sectionType by intent]\n"
    "Each entry is `block_type [tags] — description (예: use cases)`.\n"
    "Match the page's content to the most specific block — use tags to\n"
    "resolve intent (above-fold hero, social proof, end-of-page CTA,\n"
    "etc.). The `sectionType` you emit will be mapped to one of these\n"
    "block_types by the storefront pattern map; picking the closest\n"
    "intent here improves block selection downstream.\n"
    "\n"
    f"{_BLOCK_CATALOG}\n"
    "\n"
    "[SECTION TYPE GUIDE]\n"
    "Each section emits a `sectionType` that the storefront's pattern\n"
    "map renders. Pick the section type that best fits the content the\n"
    "operator asked for. Common types and the items shape they expect:\n"
    "\n"
    "  - hero / hero-split / hero-text / page-hero — page lead\n"
    "  - features — items: [{title, description, imagePrompt?, caption?}]\n"
    "  - pricing — items: [{name, price, period?, features:[], buttonText, featured:bool}]\n"
    "  - team — items: [{name, role, photoUrl?, bio?}]\n"
    "  - faq — items: [{question, answer}]\n"
    "  - testimonials — items: [{quote, author, company?}]\n"
    "  - stats — items: [{value, label, unit?, prefix?}] (e.g. value=12,400 / 99.9% / $5M)\n"
    "  - logo-bar — items: [{name, logoUrl}]\n"
    "  - subscribe — newsletter form, no items\n"
    "  - cta — title + subtitle + buttonText, no items\n"
    "  - text-image / image-text — title + description + imagePrompt, no items\n"
    "  - text / text-split / text-cta / text-quote / text-list — text-only sections\n"
    "  - gallery — items: [{imagePrompt, caption?}]\n"
    "  - steps / process / how-we-work — items: [{title, description, iconName?}]\n"
    "  - category-tabs — items: [{tabId, tabLabel, cards:[{title, description, imagePrompt?, buttonText?}]}]\n"
    "  - contact / address — title + description, no items\n"
    "\n"
    "[OUTPUT FIELDS]\n"
    "Each section is a JSON object. Required fields:\n"
    "  - sectionType: one of the types above (string)\n"
    "Common optional fields:\n"
    "  - title, subtitle, description: strings\n"
    "  - buttonText, buttonLink: strings (omit when irrelevant)\n"
    "  - items: array of objects (shape per sectionType — see guide above)\n"
    "  - imagePrompt: short English photo description for AI image generation\n"
    "  - eyebrow: optional kicker text above title\n"
    "  - bgMode: 'none' | 'subtle' | 'dark' | 'accent' (visual rhythm cue)\n"
    "  - variant: section-specific layout variant (when meaningful)\n"
    "  - ctaShape: 'pill' | 'rounded' | 'square' (button style)\n"
    "\n"
    "[QUALITY BAR]\n"
    "Write copy operators can ship without rewriting. Specific to THIS\n"
    "business — name actual products, services, processes. No generic\n"
    "filler ('our cutting-edge solutions ...'). Korean by default;\n"
    "switch to English when the business context is English-only.\n"
    "\n"
    "[LAYOUT RULES]\n"
    "Return the sections in the order they should render top-to-bottom:\n"
    "  - Hero variants (hero / hero-split / hero-text / page-hero /\n"
    "    banner-slider) MUST be the FIRST section. Every page leads\n"
    "    with the hero — never mid-page.\n"
    "  - CTA variants (cta / call-to-action / subscribe / newsletter-\n"
    "    signup) MUST be the LAST section. Pages close with the\n"
    "    action; CTAs never appear before content sections.\n"
    "  - Everything else preserves the order in the request.\n"
    "If the request list has hero in the middle or cta at the front,\n"
    "still emit them in the correct top-to-bottom order. The router\n"
    "enforces this with a post-reorder pass, but emitting the right\n"
    "order from the start makes the section pairings (hero + immediate\n"
    "subsection, cta + preceding social proof) read more naturally."
)


class PageContentAgent(BaseAgent[PageContentInput, PageContentDecision]):
    """Generates page-content sections for a single page. Used by the
    per-section AI button in the builder + the wizard's per-page path.

    Sonnet 4 with cache_system=True — the section-type guide /
    items-shape examples live in the cached system block, per-page
    inputs in the user prompt."""

    name = "page_content_agent"
    # max_tokens=4000 — fits a 5-section page comfortably (~700 tokens
    # per section after JSON envelope + boilerplate). The earlier
    # call_llm path used the same budget; not increasing here so the
    # per-call cost ceiling stays the same.
    model_spec = ModelSpec(
        provider="claude", model=_SONNET, max_tokens=4000, cache_system=True,
    )
    output_schema = PageContentDecision
    # 1 retry — schema is moderately tolerant (most fields optional)
    # so a single retry recovers from the "wrapped the list in
    # {sections: ...}" or "dropped sectionType on one row" misses
    # without spending 3× tokens on outright bad output.
    max_schema_retries = 1

    def system_prompt(self) -> str:
        return (
            "You are a senior web copywriter who writes ready-to-ship "
            "page content for Christian church websites. You think in "
            "section archetypes (hero, pastor-message, worship-schedule, "
            "sermons, newcomer, ...) and pick the section type that best "
            "matches the content. You write concrete, heartfelt copy in a "
            "warm pastoral voice — never marketing-speak or the vague "
            "stock-photo-language a worse copywriter would produce. The "
            "output language is set per-call via "
            "the `Output language` directive in the user prompt — write "
            "EVERY piece of copy in that language without mixing. "
            "Output ONLY a valid JSON object in the requested shape — "
            "no prose, no markdown fences. Wrap the section list under "
            "the `sections` key.\n"
            "\n"
            "Below is the AUTHORITATIVE church content reference (Dr. John Kwak, "
            "Church Planting LCCM 3354). Use §1–§12 as the theological and ministry "
            "source for what each page should actually say (biblical basis, the NT "
            "church models, the four Kingdom competencies, grace+truth, "
            "contextualization, assimilation, small groups, teams, stewardship, "
            "public worship), and apply §13's Do/Don't plus the §13.5 seven-point "
            "self-check before finalizing. Draw concrete, specific substance from "
            "it — never settle for generic church-sounding filler.\n"
            "\n"
            "===== CHURCH CONTENT REFERENCE (canon) =====\n"
            f"{CHURCH_CONTENT_REFERENCE}\n"
            "===== END REFERENCE =====\n"
            "\n"
            f"{CHURCH_VOICE}\n"
            "\n"
            f"{_COPYWRITER_RULES}"
        )

    def build_prompt(self, input: PageContentInput) -> str:
        # Per-page inputs. Order is stable so the cache fingerprint
        # stays consistent across runs (only the values inside the
        # ordered template change).
        is_ko = input.language == "ko"
        # Operator must-haves come FIRST. Copywriter is where
        # required_key_messages / required_stats land most strongly —
        # the agent writes the actual page copy, so verbatim inclusion
        # of operator messages is most enforceable here.
        must_have_block = format_must_haves(
            must_haves=input.must_haves,
            required_key_messages=input.required_key_messages,
            required_stats=input.required_stats,
            is_ko=is_ko,
        )
        sections_str = (
            ", ".join(input.sections_to_make)
            if input.sections_to_make
            else "hero, features, about, cta"
        )
        marketing = input.marketing_context or ("(없음)" if is_ko else "(none)")
        design_text = (
            json.dumps(input.design_system, ensure_ascii=False)
            if input.design_system
            else ("기본" if is_ko else "default")
        )

        if is_ko:
            empty = "(미정)"
            if input.mode == "append":
                mode_instruction = (
                    "기존 섹션의 톤과 어조를 유지하면서, 위 '생성할 섹션' 목록만 "
                    "새로 작성하세요. 기존 섹션과 내용/문구가 겹치지 않게 하세요."
                )
            else:
                mode_instruction = (
                    "페이지 전체를 처음부터 새로 작성하세요. 기존 섹션이 있다면 "
                    "그 톤과 메시지를 참고하되 동일 문구를 그대로 쓰지는 마세요."
                )
            header = (
                f"'{input.business_name or empty}' "
                f"({input.industry or empty}) 웹사이트의 "
                f"'{input.page_name or empty}' 페이지 콘텐츠를 생성하세요.\n"
                "\n"
                f"생성할 섹션: {sections_str}\n"
                f"마케팅 컨텍스트: {marketing}\n"
                f"디자인 시스템: {design_text}"
            )
            lang_directive = (
                "Output language: ko — 모든 title / subtitle / description / "
                "버튼 라벨 / items를 한국어로 작성하세요. 영어 문장 섞지 마세요 "
                "(고유명사 제외)."
            )
            task_directive = (
                "각 섹션에 대해 실제 웹사이트에 바로 사용할 수 있는 한국어 콘텐츠를 "
                "생성하세요. 섹션 타입과 items 형식은 system instructions의 "
                "SECTION TYPE GUIDE를 따르세요."
            )
        else:
            empty = "(not specified)"
            if input.mode == "append":
                mode_instruction = (
                    "Keep the tone and voice of the existing sections, and "
                    "write ONLY the sections listed under 'Sections to make'. "
                    "Do not repeat the wording of any existing section."
                )
            else:
                mode_instruction = (
                    "Write the entire page from scratch. If existing sections "
                    "are listed, reference their tone and message but do not "
                    "reuse the exact wording."
                )
            header = (
                f"Generate page content for the '{input.page_name or empty}' "
                f"page of '{input.business_name or empty}' "
                f"({input.industry or empty}).\n"
                "\n"
                f"Sections to make: {sections_str}\n"
                f"Marketing context: {marketing}\n"
                f"Design system: {design_text}"
            )
            lang_directive = (
                "Output language: en — write every title / subtitle / "
                "description / button label / items field in English. No "
                "Korean or other-language phrases (proper nouns excepted)."
            )
            task_directive = (
                "For each section, write copy that is ready to publish on a "
                "real website. Follow the SECTION TYPE GUIDE in the system "
                "instructions for sectionType + items shape."
            )

        existing_block = (
            f"\n{input.existing_summary}\n" if input.existing_summary else ""
        )

        return (
            f"{must_have_block}"
            f"{header}"
            f"{existing_block}\n"
            f"{mode_instruction}\n"
            "\n"
            f"[OUTPUT LANGUAGE]\n{lang_directive}\n"
            "\n"
            f"{task_directive}\n"
            "\n"
            "Return ONLY this JSON shape (no markdown fences). The text\n"
            "values shown below are placeholders that illustrate the\n"
            "fields; replace them with copy in the language specified by\n"
            "[OUTPUT LANGUAGE] above.\n"
            "{\n"
            '  "sections": [\n'
            "    {\n"
            '      "sectionType": "hero",\n'
            '      "title": "<headline copy>",\n'
            '      "subtitle": "<subtitle copy>",\n'
            '      "description": "<description copy>",\n'
            '      "buttonText": "<CTA button label>",\n'
            '      "buttonLink": "#",\n'
            '      "items": []\n'
            "    }\n"
            "  ]\n"
            "}"
        )
