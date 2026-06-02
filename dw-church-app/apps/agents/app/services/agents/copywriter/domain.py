"""Pydantic schemas for CopywriterAgent (page-content endpoint).

The output is consumed by the page builder to populate sections, so
field names mirror the existing JSON contract verbatim — renaming any
of them silently breaks the storefront's pattern-map lookup.

items is intentionally `list[dict]` rather than a typed union: the
shape varies by sectionType (features, pricing, team, faq,
testimonials, stats, etc.), and the existing pattern-map handles the
per-type rendering by reading specific keys. Forcing a typed union
here would mean adding/removing models every time a new sectionType
ships, which is exactly the maintenance burden we're trying to avoid.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────────
# Input
# ──────────────────────────────────────────────────────────────────


PageContentMode = Literal["replace", "append"]
OutputLanguage = Literal["en", "ko"]


class PageContentInput(BaseModel):
    """Inputs the wizard / per-section AI button funnels into the
    page-content call."""

    business_name: str = Field(default="", alias="businessName")
    industry: str = ""
    page_name: str = Field(default="", alias="pageName")
    page_slug: str = Field(default="", alias="pageSlug")
    # Sections to generate. The router pre-fills this from
    # _guess_sections_for_page when empty AND merges currentSections
    # context for append mode, so by the time PageContentInput is
    # built it's already the final list.
    sections_to_make: list[str] = Field(default_factory=list, alias="sectionsToMake")
    # Compact bullet summary of sections already on the page; used in
    # append mode to keep tone consistent without shipping the full
    # props blob.
    existing_summary: str = Field(default="", alias="existingSummary")
    # 'replace' or 'append'. Drives the mode-instruction sentence in
    # the user prompt.
    mode: PageContentMode = "replace"
    marketing_context: str = Field(default="", alias="marketingContext")
    design_system: dict = Field(default_factory=dict, alias="designSystem")
    # Output language — default English (global / US-friendly default).
    # Operator opts into Korean via the wizard's language toggle.
    language: OutputLanguage = "en"
    # Operator hard-requirement channel. See StrategyInput for full doc.
    # required_key_messages 는 copywriter 에 가장 강하게 적용 — 운영자가
    # '헤드라인에 20년 경력 반드시' 라고 명시하면 LLM 이 그 문구를
    # 페이지의 가장 prominent 위치에 verbatim 포함.
    must_haves: str = Field(default="", alias="mustHaves")
    required_key_messages: list[str] = Field(default_factory=list, alias="requiredKeyMessages")
    required_stats: list[str] = Field(default_factory=list, alias="requiredStats")

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────────────────────────
# Output
# ──────────────────────────────────────────────────────────────────


class PageSection(BaseModel):
    """One section of generated page content. Matches the pattern-map's
    expected shape — the storefront's section→pattern lookup keys on
    sectionType, and most patterns read title/subtitle/description/
    buttonText/items directly."""

    section_type: str = Field(alias="sectionType")
    title: str = ""
    subtitle: str = ""
    description: str = ""
    button_text: str = Field(default="", alias="buttonText")
    button_link: str = Field(default="", alias="buttonLink")
    # See module docstring for why this stays untyped. Items vary by
    # sectionType (features, pricing, team, faq, testimonials, stats,
    # logo-bar, ...) and the storefront's pattern files handle the
    # per-type rendering.
    items: list[dict] = Field(default_factory=list)
    # Optional design / styling fields. None unless the model emits
    # them — the storefront treats absence as "use defaults".
    image_prompt: str = Field(default="", alias="imagePrompt")
    eyebrow: str = ""
    bg_mode: str = Field(default="", alias="bgMode")
    variant: str = ""
    cta_shape: str = Field(default="", alias="ctaShape")

    model_config = {"populate_by_name": True}


class PageContentDecision(BaseModel):
    """Page-content output. Pydantic wraps the section list so the
    schema-retry policy can run; the router unwraps to a bare list
    for the existing JSON contract.

    Bounds 1-15 — below 1 means the model produced nothing usable
    (retry should fire); above 15 the result page is unwieldy and
    almost always means the model misunderstood and tried to enumerate
    every block type rather than generating a focused page."""

    sections: list[PageSection] = Field(min_length=1, max_length=15)
