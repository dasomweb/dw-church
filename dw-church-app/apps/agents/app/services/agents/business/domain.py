"""Pydantic schemas for BusinessAgent (parseBusiness) + SuggestAgent
(field-by-field AI suggestions).

The two endpoints are first-touch on the wizard (Prompt → parsed
business info, then per-field suggestions on the Business step), so
they fire on every wizard invocation. The model choice for these is
the highest-leverage cost knob in the entire pipeline — Sonnet here
costs about as much as the rest of the pipeline combined.

Schemas split rather than unified because the two output shapes are
genuinely different:
  - BusinessParseOutput is a single record with 8 string fields
  - SuggestOutput is a list of 10 short strings
  - PageListSuggestOutput is a list of {name, slug, parent?} objects
A unified "AnyOutput" union would force every caller to narrow at
runtime; keeping them separate lets the typed call sites compile-check
which agent they're talking to.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────────
# parse-business
# ──────────────────────────────────────────────────────────────────


class BusinessParseInput(BaseModel):
    """Input for the parseBusiness endpoint.

    `prompt` is whatever the operator typed in the Prompt step — could
    be 1 sentence ("a Korean BBQ restaurant in Apopka") or an entire
    page of context including reference site URLs. The agent does the
    extraction; we don't pre-process the input."""

    prompt: str


class BusinessParseOutput(BaseModel):
    """Structured business profile extracted from free text. Mirrors the
    BusinessInfo shape the admin-app's PlannerWizard already consumes —
    same field names so the wizard sets state directly from this dump.
    Every field defaults to "" so a partial extraction (the LLM didn't
    find a location, etc.) doesn't fail validation."""

    business_name: str = Field(default="", alias="businessName")
    industry: str = ""
    description: str = ""
    services: str = ""
    target_audience: str = Field(default="", alias="targetAudience")
    brand_keywords: str = Field(default="", alias="brandKeywords")
    location: str = ""
    # Newline-separated URLs the LLM extracted from the prompt. Empty
    # when the operator didn't mention competitor / reference sites.
    reference_urls: str = Field(default="", alias="referenceUrls")

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────────────────────────
# suggest (field-by-field)
# ──────────────────────────────────────────────────────────────────

# Fields that return 10 short strings (chip-style suggestions in the UI).
TEXT_SUGGEST_FIELDS = (
    "targetAudience",
    "services",
    "brandKeywords",
    "businessDescription",
)
# pageList is the only "suggest" path that returns structured objects.
PAGE_LIST_FIELD = "pageList"


class SuggestInput(BaseModel):
    """Input for any suggest call — the field name determines the
    prompt template AND the output schema (see TextSuggestAgent vs
    PageListSuggestAgent). Context is the partial BusinessInfo the
    user has filled so far; it's referenced in the prompt to keep
    suggestions on-topic for THIS business."""

    field: str
    # Loose dict of business-info fields collected so far. Keys aren't
    # enforced because the wizard sometimes calls suggest very early
    # (only businessName + industry filled) and other times late
    # (everything but services). The agent reads what's there.
    context: dict = Field(default_factory=dict)


class TextSuggestOutput(BaseModel):
    """List of 10 short suggestion strings. The LLM is asked for 10
    explicitly; we accept fewer when the model hallucinates an early
    end-of-list marker, but truncate at 10 if it goes over. Soft
    bounds — schema-level we just require non-empty."""

    suggestions: list[str] = Field(min_length=1, max_length=20)


class PageSuggestion(BaseModel):
    """One row of a sitemap suggestion."""

    name: str
    slug: str
    parent: str | None = None


class PageListSuggestOutput(BaseModel):
    """Sitemap suggestion shape — name + slug, optional parent for
    nested pages. The wizard's Sitemap step renders these as chips
    the operator can include/exclude."""

    suggestions: list[PageSuggestion] = Field(min_length=1, max_length=30)
