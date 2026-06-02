"""Pydantic schemas for ArchitectAgent (sitemap endpoint).

Reuses PageSuggestion from the business package — both endpoints
return the same {name, slug, parent?} shape, just for different
purposes (suggest is one-of-N picker; sitemap is the committed plan).
Keeping the row type shared means the wizard's downstream consumers
(SitemapStep, ContentMap) handle either output identically.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.services.agents.business.domain import PageSuggestion


class SitemapInput(BaseModel):
    """Inputs the wizard funnels into the sitemap call. Marketing
    strategy is included so the architect respects the funnel
    coverage / segmentation choices the operator already made on
    Step 3."""

    business_name: str = Field(default="", alias="businessName")
    industry: str = ""
    description: str = ""
    services: str = ""
    target_audience: str = Field(default="", alias="targetAudience")
    # Stringified JSON of the operator-edited MarketingStrategy. Kept
    # as a string for backwards compat with the existing SitemapRequest
    # schema (the SPA already JSON.stringifies the strategy before send).
    # The agent's prompt embeds it verbatim — Gemini Pro is good at
    # parsing nested context out of stringified JSON.
    marketing_strategy: str = Field(default="", alias="marketingStrategy")
    # Output language — default English. Same OutputLanguage Literal
    # as the strategy domain; redeclared locally to avoid the cross-
    # package import.
    language: Literal["en", "ko"] = "en"
    # Operator hard-requirement channel — see StrategyInput for full doc.
    # required_pages 는 sitemap 단계에서 가장 강하게 적용 — 운영자가
    # "Pricing / Contact 페이지 반드시" 라고 명시하면 LLM 이 누락 못 함.
    must_haves: str = Field(default="", alias="mustHaves")
    required_pages: list[str] = Field(default_factory=list, alias="requiredPages")
    required_key_messages: list[str] = Field(default_factory=list, alias="requiredKeyMessages")
    required_stats: list[str] = Field(default_factory=list, alias="requiredStats")

    model_config = {"populate_by_name": True}


class SitemapDecision(BaseModel):
    """Sitemap output — list of pages with parent/child structure.

    Bounds 5-30 pages. Below 5 the wizard ends up with a single-page
    site that doesn't justify the AI workflow; above 30 the operator
    has to manually trim a wall of chips. The prompt asks for 10-20.
    """

    pages: list[PageSuggestion] = Field(min_length=5, max_length=30)
