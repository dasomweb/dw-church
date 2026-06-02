"""Pydantic schemas for StrategyAgent inputs / outputs.

CensusSnapshot mirrors the dict shape that
app.services.planner.census_service.fetch_census_data returns. We
re-declare it here as a Pydantic model so:
  - the agent receives a typed ground-truth fact source instead of a
    loose dict the LLM might fabricate against
  - the prompt builder can safely access fields with autocomplete /
    type checks
  - tests can construct a CensusSnapshot fixture without hitting the
    Census API

The mapping is done inside the router that wires census_service →
StrategyAgent (see planner.py migration). census_service stays exactly
as it is — the user's "기존 잘 개발되어있는 장점들 그대로 사용" rule.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────────
# Census fact source — wrapped from census_service output
# ──────────────────────────────────────────────────────────────────


class CensusGender(BaseModel):
    male: int
    female: int
    male_pct: str = Field(alias="malePct")
    female_pct: str = Field(alias="femalePct")

    model_config = {"populate_by_name": True}


class CensusRace(BaseModel):
    white: str
    black: str
    asian: str
    hispanic: str
    other: str


class CensusEducation(BaseModel):
    college_plus_pct: str = Field(alias="collegePlusPct")

    model_config = {"populate_by_name": True}


class CensusSnapshot(BaseModel):
    """Real US Census ACS 5-year data for one ZIP code. Treated as
    ground truth by every agent that receives it — agents must NOT
    hallucinate alternative figures."""

    zip_code: str = Field(alias="zipCode")
    total_population: int = Field(alias="totalPopulation")
    median_age: float = Field(alias="medianAge")
    median_income: int = Field(alias="medianIncome")
    households: int
    gender: CensusGender
    race: CensusRace
    education: CensusEducation
    summary: str

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────────────────────────
# Strategy decision — the autoStrategy endpoint
# ──────────────────────────────────────────────────────────────────


# Delivery scope drives downstream analysis posture more than any other
# field — InsightAgent uses it to decide whether the report should be
# census-centric (local), state-level (regional), or audience-/intent-
# centric (online). Same three values the MarketingCore UI exposes.
DeliveryModel = Literal["local", "regional", "online"]
TransactionType = Literal["b2c", "b2b", "b2g", "mixed"]
RevenueModel = Literal["one-time", "repeat", "subscription", "high-ticket"]
SegmentAxis = Literal["demographic", "geographic", "behavioral", "psychographic", "firmographic"]
InvolvementLevel = Literal["low", "medium", "high"]
PurchaseBlocker = Literal["awareness", "search", "evaluation", "decision", "post"]
MixFocus = Literal["4p", "7p"]
# 4P → product/price/place/promotion. 7P adds people/process/evidence
# (services-marketing extension). The UI gates the extra three behind
# mixFocus=="7p"; we accept the union here and let the agent's prompt
# enforce the dependency.
KeyP = Literal["product", "price", "place", "promotion", "people", "process", "evidence"]
# Funnel uses the loyalty/advocacy split that MarketingCore offers, so
# the AI picks subsets the UI can render without remapping. The legacy
# "retention" term is kept as an accepted alias just so older LLM
# outputs validate; new prompts ask for the loyalty/advocacy split.
FunnelStage = Literal["awareness", "interest", "consideration", "purchase", "loyalty", "advocacy", "retention"]
PrimaryCTA = Literal["buy", "contact", "book", "subscribe", "call", "quote", "trial", "consult"]


OutputLanguage = Literal["en", "ko"]
"""Output language for every agent that writes narrative copy.

Policy (user-set, see CLAUDE.md/memory):
  - Default is always English. Operators can ship to a global / US /
    international audience without thinking about language.
  - Korean is opt-in: the wizard exposes a toggle, which sets
    language='ko' on every downstream agent call. We do NOT auto-
    detect Korean from input text — that produced surprising Korean
    output for US businesses with no Korean inputs.

Every BaseModel input that drives a narrative-producing agent
(Strategy, Insight, Copywriter, Architect) carries this field so the
agent can branch on it without inferring."""


class StrategyInput(BaseModel):
    """Input for the autoStrategy endpoint. Includes the optional
    census snapshot — when present the agent uses it as fact source.

    must_haves / required_pages / required_key_messages / required_stats
    are the operator's hard-requirement channel — text the operator
    explicitly typed that the LLM MUST reflect (not just consider). The
    prompt builder injects these at the top of the agent's user message
    as 'OPERATOR MUST-HAVE REQUIREMENTS' so they win over the agent's
    own inference. See feedback-no-hardcoded-defaults — the operator
    needs a way to force specific copy / pages / numbers into the build."""

    business_name: str = Field(alias="businessName")
    industry: str
    description: str = ""
    location: str = ""
    target_audience: str = Field(default="", alias="targetAudience")
    census: CensusSnapshot | None = None
    language: OutputLanguage = "en"
    must_haves: str = Field(default="", alias="mustHaves")
    required_pages: list[str] = Field(default_factory=list, alias="requiredPages")
    required_key_messages: list[str] = Field(default_factory=list, alias="requiredKeyMessages")
    required_stats: list[str] = Field(default_factory=list, alias="requiredStats")

    model_config = {"populate_by_name": True}


class StrategyDecision(BaseModel):
    """Structured marketing posture. Mirrors the 11-field shape of the
    admin-app's MarketingCore panel so the wizard can prefill every
    chip from this output (see PlannerWizard.aiStrategyToMarketingStrategy).

    Field order mirrors the UI top-to-bottom so a screenshot of
    MarketingCore reads as a checklist against this schema:
      1 deliveryModel · 2 transactionType · 3 revenueModel
      4 segmentAxis · 5 positioning · 6 involvementLevel
      7 purchaseBlocker · 8 mixFocus · 8b keyP
      9 funnelCoverage · 10 primaryCTA
    """

    delivery_model: DeliveryModel = Field(alias="deliveryModel")
    transaction_type: TransactionType = Field(alias="transactionType")
    revenue_model: RevenueModel = Field(alias="revenueModel")
    segment_axis: list[SegmentAxis] = Field(alias="segmentAxis")
    positioning: str
    involvement_level: InvolvementLevel = Field(alias="involvementLevel")
    purchase_blocker: PurchaseBlocker = Field(alias="purchaseBlocker")
    mix_focus: MixFocus = Field(alias="mixFocus")
    key_p: KeyP = Field(alias="keyP")
    funnel_coverage: list[FunnelStage] = Field(alias="funnelCoverage")
    primary_cta: PrimaryCTA = Field(alias="primaryCTA")

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────────────────────────
# Marketing insight — the marketingInsight endpoint
# ──────────────────────────────────────────────────────────────────


class InsightInput(BaseModel):
    """Input for the marketingInsight endpoint. Census is optional but
    strongly recommended — without it the LLM has no demographic
    grounding and tends to invent population figures.

    Strategy is also optional but strongly recommended: when present,
    the agent uses (deliveryModel × transactionType) to pick the
    analysis frame instead of always defaulting to ZIP-centric
    consumer demographics. This is what makes the report correct for
    wholesale, online, B2B, and international-trade businesses where
    local US Census is mostly irrelevant."""

    business_name: str = Field(alias="businessName")
    industry: str
    description: str = ""
    target_location: str = Field(default="", alias="targetLocation")
    targeting: str = ""  # operator-supplied target description
    census: CensusSnapshot | None = None
    strategy: StrategyDecision | None = None
    language: OutputLanguage = "en"

    model_config = {"populate_by_name": True}


class MarketingInsight(BaseModel):
    """Long-form marketing analysis. The 8 sections are returned as
    one markdown string rather than separate fields because operators
    consume it as rendered markdown in the wizard's Insight tab. The
    model just guarantees the field is present and non-empty."""

    insight: str = Field(min_length=200)
