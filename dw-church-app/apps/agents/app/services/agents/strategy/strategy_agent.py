"""StrategyAgent — autoStrategy endpoint.
InsightAgent — marketingInsight endpoint.

Both run Claude Sonnet 4.x. Sonnet (not Opus, not Haiku) because:
  - Opus is over-spec for structured B2B analysis (5× more expensive,
    little quality gain on this task class)
  - Haiku tends to skip B2B framework names (4P / JTBD / segment axes)
    and produce shallow positioning statements; downstream agents
    (Architect, Copywriter) then receive weaker context

Both agents inject the optional CensusSnapshot as the FIRST element of
the prompt. Crucially, they DON'T treat census-only as the analysis
center — for B2B / wholesale / online businesses the relevant geography
is wider than the business's ZIP code, so the prompts teach the LLM to
choose the analysis frame from the (deliveryModel × transactionType)
matrix and reduce census to a sidebar fact when appropriate.
"""

from __future__ import annotations

import re

from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import LLMRequest, ModelSpec
from app.services.planner.llm_service import extract_json
from app.services.agents.shared.must_haves import format_must_haves
from app.services.agents.strategy.domain import (
    CensusSnapshot,
    InsightInput,
    MarketingInsight,
    StrategyDecision,
    StrategyInput,
)

# Shared model picked for both agents. Sonnet 4.6 (claude-sonnet-4-6)
# replaced Sonnet 4 (claude-sonnet-4-20250514) after Anthropic's June
# 2026 retirement of Sonnet 4 on the API. Same price, higher quality.
# Token budgets are tuned per agent.
_SONNET = "claude-sonnet-4-6"


def _format_census_for_prompt(census: CensusSnapshot | None) -> str:
    """Render the census snapshot as a fact block the LLM can quote.
    Returns "" when no census data is available so the prompt collapses
    cleanly. Wording explicitly tells the model to treat figures as
    facts — this is the anti-hallucination guard."""
    if census is None:
        return (
            "[CENSUS DATA — UNAVAILABLE]\n"
            "No US Census data is available for this location. Do NOT invent\n"
            "population, income, or ethnicity statistics. If a demographic\n"
            "claim would normally cite a number, write \"census data unavailable\"\n"
            "instead of guessing.\n"
        )
    return (
        f"[CENSUS DATA — TREAT AS GROUND TRUTH, DO NOT MODIFY]\n"
        f"Source: US Census ACS 5-year (2022), ZIP {census.zip_code}\n"
        f"  Total population: {census.total_population:,}\n"
        f"  Median age: {census.median_age}\n"
        f"  Median household income: ${census.median_income:,}\n"
        f"  Households: {census.households:,}\n"
        f"  Race/ethnicity: white {census.race.white}, black {census.race.black}, "
        f"asian {census.race.asian}, hispanic {census.race.hispanic}, "
        f"other {census.race.other}\n"
        f"  Gender: male {census.gender.male_pct}, female {census.gender.female_pct}\n"
        f"  Education (25+): bachelor's degree or higher "
        f"{census.education.college_plus_pct}\n"
        f"\n"
        f"NOTE: This describes the population at the BUSINESS'S ZIP only.\n"
        f"For local-B2C businesses (restaurant, salon, clinic) this IS the\n"
        f"customer base — anchor demographics here. For B2B / wholesale /\n"
        f"regional / online businesses, the actual customer geography is\n"
        f"wider; treat this block as a sidebar fact about HQ location, not\n"
        f"as the audience definition.\n"
        f"Use these figures verbatim when citing demographics. Never alter\n"
        f"them. If a claim needs a number not in this block, write \"census\n"
        f"data unavailable\" rather than estimating.\n"
    )


# ──────────────────────────────────────────────────────────────────
# StrategyAgent — structured posture decision (autoStrategy)
# ──────────────────────────────────────────────────────────────────


_STRATEGY_FIELD_GUIDANCE = (
    "FIELD GUIDANCE — read carefully, these affect downstream analysis:\n"
    "\n"
    "  deliveryModel — where service happens:\n"
    "    \"local\"    customer comes to us (restaurant, salon, clinic, retail)\n"
    "    \"regional\" we travel to customer OR we serve a region\n"
    "               (contractor, wholesale distribution, on-site service)\n"
    "    \"online\"   no travel, served via internet (SaaS, e-commerce,\n"
    "               consulting calls, digital products)\n"
    "\n"
    "  transactionType — who buys:\n"
    "    \"b2c\"   end consumers buy directly\n"
    "    \"b2b\"   businesses buy (wholesale, services to companies, SaaS)\n"
    "    \"b2g\"   government / public sector buys (procurement, contracts)\n"
    "    \"mixed\" both b2c and b2b are real revenue streams\n"
    "\n"
    "  revenueModel — purchase pattern:\n"
    "    \"one-time\"     single transaction, low repurchase rate\n"
    "    \"repeat\"       customer comes back regularly (restaurant, supplies)\n"
    "    \"subscription\" recurring billing (SaaS, membership)\n"
    "    \"high-ticket\"  large single purchase, long sales cycle\n"
    "\n"
    "  segmentAxis (multi) — which axes actually segment THIS market:\n"
    "    geographic / demographic / psychographic / behavioral / firmographic\n"
    "    NOTE: \"firmographic\" only makes sense for b2b/b2g/mixed. Pick\n"
    "    2-4 axes; don't pick all five.\n"
    "\n"
    "  positioning — one-line statement, ~80 chars max. Include the\n"
    "    target customer + the unique value. Language follows the\n"
    "    explicit `language` input field (en / ko); default is English.\n"
    "\n"
    "  involvementLevel — how much research the customer does:\n"
    "    \"low\"    impulse / habitual (snack, daily restaurant)\n"
    "    \"medium\" comparison shopping (electronics, salon)\n"
    "    \"high\"   research-heavy (B2B contracts, high-ticket, medical)\n"
    "\n"
    "  purchaseBlocker — single biggest funnel blocker right now:\n"
    "    \"awareness\" customers don't know we exist\n"
    "    \"search\" they search but can't find/recognize us\n"
    "    \"evaluation\" they compare us with competitors and we lose\n"
    "    \"decision\" they're convinced but don't pull the trigger\n"
    "    \"post\" no repeat / no referral after first purchase\n"
    "\n"
    "  mixFocus — \"4p\" for product businesses, \"7p\" for service\n"
    "    businesses (services-marketing extension adds people/process/\n"
    "    physical evidence).\n"
    "\n"
    "  keyP — the SINGLE most critical lever for this business:\n"
    "    if mixFocus==\"4p\" pick from: product, price, place, promotion\n"
    "    if mixFocus==\"7p\" pick from: product, price, place, promotion,\n"
    "                                    people, process, evidence\n"
    "\n"
    "  funnelCoverage (multi, in order) — which funnel stages we should\n"
    "    actively support on the website. Subset of:\n"
    "    awareness, interest, consideration, purchase, loyalty, advocacy\n"
    "    Pick 3-5 stages; almost always include awareness + purchase.\n"
    "\n"
    "  primaryCTA — the single dominant call-to-action across the site."
)


class StrategyAgent(BaseAgent[StrategyInput, StrategyDecision]):
    """Determines an 11-field B2B marketing posture from business profile
    + census facts. Output schema mirrors the admin-app MarketingCore
    UI shape so the wizard can prefill it on completion."""

    name = "strategy_agent"
    # Sonnet 4.x — see file-level docstring for the model rationale.
    # max_tokens=2500 covers the 11-field JSON envelope plus whatever
    # short reasoning Sonnet emits before the JSON; bumped from 2000
    # alongside the 4-field schema extension (deliveryModel,
    # transactionType, revenueModel, keyP) so the JSON doesn't truncate
    # mid-output on dense decisions.
    #
    # cache_system=True: the system prompt embeds the entire field-
    # guidance taxonomy (~2KB static text). Anthropic ephemeral cache
    # makes that 90% cheaper on the second+ call within a 5-minute
    # window — typical wizard runs fire StrategyAgent + InsightAgent
    # back-to-back, hitting the read-cache path on Insight.
    model_spec = ModelSpec(
        provider="claude", model=_SONNET, max_tokens=2500, cache_system=True,
    )
    output_schema = StrategyDecision

    def system_prompt(self) -> str:
        # Static role + field guidance — both go in the cached portion.
        # Keep them concatenated as one string (the cache marker covers
        # the whole system block); LLMClient handles the API shape.
        return (
            "You are a senior church-growth and church-planting strategist who "
            "thinks ecclesiologically, not as a marketer. Ground every decision "
            "in the church's God-given mission — worship, the faithful preaching "
            "of the Word, fellowship, discipleship, and mission/evangelism (the "
            "Great Commission and the Great Commandment) — in the spirit of Mark "
            "Dever (9Marks), Tim Keller, John Stott, and Martyn Lloyd-Jones. "
            "Frame 'positioning' as the church's God-given identity and calling "
            "within its community, never as a sales funnel or consumer pitch. "
            "Treat people as souls God calls and a body to disciple — never as "
            "'customers' or a 'market'. The strategy fields below are written in "
            "generic business language; interpret EACH through a church lens "
            "(e.g. 'audience' = the people and community the church is called to "
            "reach and disciple; 'CTA' = an invitation to worship, visit, or be "
            "discipled — not a purchase). Use the census data only as a sidebar "
            "on the surrounding community's needs — never invent a number. Be "
            "decisive: when asked for one best choice, pick one.\n"
            "\n"
            f"{_STRATEGY_FIELD_GUIDANCE}"
        )

    def build_prompt(self, input: StrategyInput) -> str:
        # Field guidance lives in system_prompt (cached). Per-input
        # context here keeps the cached portion stable across calls so
        # the second+ call hits the read-cache path. Order matters —
        # changing it would invalidate the cache fingerprint.
        # Operator must-haves come FIRST so the LLM sees them before
        # any inference-driving context. Strategy uses must_haves +
        # required_key_messages most (positioning copy reflects them);
        # required_pages / required_stats are downstream concerns but
        # still injected for context coherence.
        must_have_block = format_must_haves(
            must_haves=input.must_haves,
            required_pages=input.required_pages,
            required_key_messages=input.required_key_messages,
            required_stats=input.required_stats,
            is_ko=input.language == "ko",
        )
        census_block = _format_census_for_prompt(input.census)
        lang_directive = (
            "Write the `positioning` value in Korean (한국어)."
            if input.language == "ko"
            else "Write the `positioning` value in English."
        )
        positioning_example = (
            '"한 줄 한국어 포지셔닝, ~80자"'
            if input.language == "ko"
            else '"one-sentence English positioning, ~80 chars"'
        )
        return (
            f"{must_have_block}"
            f"{census_block}\n"
            f"[BUSINESS]\n"
            f"  Name: {input.business_name}\n"
            f"  Industry: {input.industry}\n"
            f"  Location: {input.location or '(not specified)'}\n"
            f"  Description: {input.description or '(not specified)'}\n"
            f"  Target audience (operator-supplied): "
            f"{input.target_audience or '(not specified)'}\n"
            f"  Output language: {input.language} — {lang_directive}\n"
            f"\n"
            f"[TASK]\n"
            f"Decide the 11-field marketing posture and return ONLY this JSON\n"
            f"object (no prose, no markdown fences). Pick decisively.\n"
            f"Refer to the FIELD GUIDANCE in your system instructions when\n"
            f"making each choice — every field there has explicit option\n"
            f"definitions you must respect.\n"
            f"\n"
            f"[OUTPUT JSON SHAPE]\n"
            f"{{\n"
            f'  "deliveryModel": "local" | "regional" | "online",\n'
            f'  "transactionType": "b2c" | "b2b" | "b2g" | "mixed",\n'
            f'  "revenueModel": "one-time" | "repeat" | "subscription" | "high-ticket",\n'
            f'  "segmentAxis": ["geographic" | "demographic" | "behavioral" | '
            f'"psychographic" | "firmographic", ...],\n'
            f'  "positioning": {positioning_example},\n'
            f'  "involvementLevel": "low" | "medium" | "high",\n'
            f'  "purchaseBlocker": "awareness" | "search" | "evaluation" | '
            f'"decision" | "post",\n'
            f'  "mixFocus": "4p" | "7p",\n'
            f'  "keyP": "product" | "price" | "place" | "promotion" | '
            f'"people" | "process" | "evidence",\n'
            f'  "funnelCoverage": ["awareness", "interest", "consideration", '
            f'"purchase", "loyalty", "advocacy"] (subset, in order),\n'
            f'  "primaryCTA": "buy" | "contact" | "book" | "subscribe" | '
            f'"call" | "quote" | "trial" | "consult"\n'
            f"}}\n"
        )


# ──────────────────────────────────────────────────────────────────
# InsightAgent — long-form analysis (marketingInsight)
# ──────────────────────────────────────────────────────────────────


def _strategy_block(strategy: StrategyDecision | None) -> str:
    """Render the upstream StrategyDecision as a directive block. The
    InsightAgent uses this to pick an analysis frame instead of always
    defaulting to local-Census-centric reporting — without it the
    report skews toward consumer demographics even when the actual
    business is, say, regional B2B wholesale."""
    if strategy is None:
        return (
            "[STRATEGY — UNAVAILABLE]\n"
            "No upstream strategy decision was provided. Default to a balanced\n"
            "analysis but DO NOT assume the business is purely local-B2C; check\n"
            "the business description for cues (wholesale/distribution/SaaS/\n"
            "online imply wider geography than the HQ ZIP).\n"
        )
    seg_axis = ", ".join(strategy.segment_axis) or "(none)"
    funnel = " > ".join(strategy.funnel_coverage) or "(none)"
    return (
        "[STRATEGY — USE THIS TO PICK THE ANALYSIS FRAME]\n"
        f"  deliveryModel:   {strategy.delivery_model}\n"
        f"  transactionType: {strategy.transaction_type}\n"
        f"  revenueModel:    {strategy.revenue_model}\n"
        f"  segmentAxis:     {seg_axis}\n"
        f'  positioning:     "{strategy.positioning}"\n'
        f"  involvementLvl:  {strategy.involvement_level}\n"
        f"  purchaseBlocker: {strategy.purchase_blocker}\n"
        f"  mixFocus:        {strategy.mix_focus} (key P: {strategy.key_p})\n"
        f"  funnelCoverage:  {funnel}\n"
        f"  primaryCTA:      {strategy.primary_cta}\n"
    )


_FRAME_MATRIX = """[ANALYSIS FRAME — FIRST DECIDE THESE TWO QUESTIONS]

Q1. WHO is the customer?  (drives audience definition)
    - End consumers (b2c) — individuals
    - Businesses (b2b) — companies, defined by ICP / firmographics
    - Public sector (b2g) — agencies, defined by procurement category
    - Mixed — both b2c and b2b are real revenue streams

Q2. WHERE are the customers physically?  (drives geographic scope)
    - Single ZIP / city (a restaurant, salon, clinic)
    - Region / state / multi-state (wholesale distributor, regional service)
    - National — the entire US is the addressable market
    - International — target country / countries are NOT the US

The combination determines the analysis frame. ZIP-level US Census data
is the right anchor ONLY when the audience is "consumers in this ZIP".
For every other combination it shrinks to a sidebar fact about HQ
location and the analysis pivots to whatever defines the actual audience.

[SAMPLE FRAMES — THESE ARE EXAMPLES, NOT AN EXHAUSTIVE LIST]

The full space of (Q1 × Q2 × industry) is enormous. The samples below
are common cases — when the business doesn't match exactly, infer
the principle from the closest sample and adapt.

  Local-B2C
  (single-ZIP consumer)
  e.g., 동네 식당, 미용실, 한의원
    → ZIP-level US Census IS the customer base. Cite demographics
      verbatim. Channels: Google Business Profile, local SEO, reviews.

  Regional-B2C
  (state or metro service)
  e.g., 출장 시공업체, 지역 학원 체인
    → State/metro demographics + service-radius analysis. Census ZIP
      = HQ anchor only; describe the SERVICE AREA explicitly.

  Regional-B2B / Wholesale
  e.g., 식자재 도매, 유통, 트럭 배송 가능 거리 한정
    → Audience is BUSINESSES across a state or multi-state region.
      Skip consumer demographics. Instead: target customer industries
      (restaurants, retailers), regional industry density, logistics
      radius, B2B trade channels (trade shows, directories, LinkedIn).

  National-B2C (online)
  e.g., 온라인 의류, D2C e-commerce, 식품 배송
    → The entire US is the market. ZIP Census = irrelevant.
      Use NATIONAL-level demographics (age cohorts, race/ethnicity
      distributions, income tiers, education) when discussing audience.
      You may cite well-known US population figures from general
      knowledge (e.g., "~14% of the US population is Black" — but mark
      these as approximate when not from the supplied census block).
      Heavy emphasis on psychographic/behavioral segmentation: style
      preference, purchase intent, channel behavior. Channels: SEO,
      content marketing, paid social, influencer, marketplace listings.

  National-B2B / SaaS / Industrial
  e.g., SaaS, B2B 산업재, 전국 컨설팅
    → Frame around ICP (ideal customer profile): industry, company
      size, role, use case, tech stack. Firmographics, not
      demographics. Census = irrelevant. Channels: SEO, LinkedIn,
      industry publications, partnerships, ABM.

  International / Trade / Export
  e.g., 무역 (수출입), 해외 셀링, 글로벌 SaaS
    → TARGET COUNTRY/REGION is the analysis subject — the US Census
      is completely irrelevant unless the US itself is one of the
      target markets. Discuss: target country market size, buying
      power, regulations (import duties, certifications, FDA/CE),
      cultural fit, distribution channels in that country, language
      localization. If multiple target countries, devote at least one
      paragraph each to the top 2-3.

  B2G (any geography)
  e.g., 공공조달, GSA, 지자체 입찰
    → Public-sector procurement frame. Discuss agency portfolio,
      certifications (SAM.gov, GSA Schedule, 8(a), HUBZone, set-
      asides), capability statements, past-performance citations.
      Demographics are not the audience.

  Mixed
    → Acknowledge BOTH revenue streams. Devote roughly proportional
      space to each. Use the strongest revenue stream as the primary
      frame and the smaller one as a "secondary audience" section.

[INFERENCE CUES]

When the strategy block doesn't fully nail it down, scan the business
description for cues (these can override the strategy block if the
description clearly contradicts it):

  "wholesale", "distributor", "도매", "유통"      → Regional-B2B / Wholesale
  "SaaS", "platform", "API"                      → National-B2B
  "온라인 쇼핑몰", "e-commerce", "D2C"             → National-B2C (online)
  "무역", "수출", "import", "export"              → International
  "공공", "조달", "지자체", "정부"                  → B2G
  "동네", "근처", "local"                         → Local-B2C
  Specific country names (Japan, Vietnam, etc.) → International (those countries)

The combination determines the analysis frame more than any single
field. Pick decisively, state the chosen frame at the top of the
report, and write every section consistently with it.
"""


_SECTION_GUIDANCE = """[SECTION CONTENT GUIDANCE — adapt to the chosen frame]

  1. 타겟 고객 프로필
     - Local-B2C: ZIP-level census (cite figures verbatim)
     - Regional-B2C: state/metro demographics + service-radius
     - Regional-B2B / Wholesale: target customer INDUSTRIES + buyer
       roles (e.g., "restaurant owners 30-100 seats", "independent
       grocers in metro Atlanta + adjacent counties"). Skip consumer
       demographics; ZIP census becomes 1-2 lines about HQ.
     - National-B2C online: NATIONAL-level demographic distributions —
       age cohorts, race/ethnicity, income tiers, education. ZIP
       census becomes a 1-line HQ note. Heavy psychographic +
       behavioral framing.
     - National-B2B / SaaS: ICP table — industry, company size, role,
       use case, tech context. Skip demographics entirely.
     - International / Trade: target country audience profile —
       buying power, cultural context, language. US Census omitted.
     - B2G: agency portfolio + procurement vehicles, not demographics.

  2. 다국어/다문화 전략
     - Local-B2C: highly relevant — language mix of the ZIP
     - National-B2C: relevant if targeting specific ethnic segments
       (e.g., 한인 마켓, 라티노 시장)
     - International: PRIMARY LANGUAGE = target country language;
       discuss localization (translation quality, RTL, currency,
       date formats), not bilingual signage
     - B2B / SaaS: usually 1 short paragraph; English-default unless
       ICP includes specific non-English markets

  3. 지역 / 산업 인프라
     - Local-B2C: physical infrastructure (학군, 교통, 주차, 인접 상권)
     - Regional-B2B / Wholesale: trade clusters, logistics hubs,
       industry events, distribution corridors in the region
     - National-B2C online: e-commerce/fulfillment infrastructure —
       3PL coverage, return logistics, marketplace presence
     - SaaS / National-B2B: platform integrations, ecosystem, API
       partners, marketplace presence
     - International: target country distribution channels, customs
       process, local fulfillment partners

  4. 가격 / 단위경제 기반 포지셔닝
     - B2C local: price tier vs median household income (cite census)
     - B2C national: price tier vs national income distribution +
       category benchmarks
     - B2B / Wholesale: unit price, MOQ, contract size, payment
       terms, margin band relative to typical customer budgets
     - SaaS: pricing tier strategy (per-seat vs flat vs usage),
       free/trial conversion, expansion revenue
     - International: pricing in target country currency, parity
       with local competitors, import duty pass-through

  5. 웹사이트 디자인 방향
     - Always relevant. Reflect involvementLevel, primaryCTA,
       transactionType:
       - B2C = visual + social proof + emotional headlines
       - B2B = trust signals, case studies, credentials, ROI numbers
       - High-involvement = detailed product info, comparison tables
       - Low-involvement = visual impact, fast checkout

  6. 경쟁 우위 & 차별화
     - Always relevant. Anchor on positioning + keyP from strategy.
     - International / Trade: include "왜 미국에서 (또는 한국에서)
       사야 하는가" 관점

  7. SEO & 디지털 마케팅 채널
     - Local-B2C: Google Business Profile, local SEO, review velocity,
       Naver Place (한인 시장 시), 지역 커뮤니티
     - Regional/Wholesale (B2B): B2B directories, trade pubs,
       LinkedIn, industry-specific platforms — NOT just local SEO
     - National-B2C online: SEO + paid social + influencer +
       marketplace (Amazon, eBay, Coupang); local SEO irrelevant
     - SaaS / National-B2B: content SEO, LinkedIn ABM, partnerships,
       industry community
     - International: target country search engines (Naver, Baidu,
       Yandex if applicable), country-specific channels (Line, WeChat)
     - B2G: SAM.gov, GSA Advantage, agency-specific portals

  8. 콘텐츠 & CTA 전략
     - Match funnelCoverage stages from strategy. Each piece of
       content should map to a stage and the chosen primaryCTA.
     - B2B / High-involvement: gated whitepapers, case studies, ROI
       calculators, demo bookings
     - B2C / Low-involvement: short-form social, lookbooks, UGC,
       direct-buy CTAs
     - International: content strategy MUST include localized
       versions, not just translations
"""


class InsightAgent(BaseAgent[InsightInput, MarketingInsight]):
    """Generates a long-form 8-section marketing analysis. Receives the
    upstream StrategyDecision so it can pick the analysis frame from
    the (deliveryModel × transactionType) matrix instead of always
    defaulting to ZIP-centric local marketing reporting."""

    name = "insight_agent"
    # max_tokens=6000 to fit the 8-section markdown report; the
    # earlier route used 4000 and occasionally truncated section 8.
    #
    # cache_system=True: the system prompt now embeds the full
    # _FRAME_MATRIX (~2KB) + _SECTION_GUIDANCE (~2KB) static blocks,
    # which were previously interpolated into every user prompt.
    # That ~4KB of static text is the single largest caching opportunity
    # in the pipeline — InsightAgent fires right after StrategyAgent in
    # the wizard's analysis step, so the cache is fresh and the read
    # path saves ~90% of those tokens on every wizard run.
    model_spec = ModelSpec(
        provider="claude", model=_SONNET, max_tokens=6000, cache_system=True,
    )
    output_schema = MarketingInsight
    # max_schema_retries=1 because the schema is just `{insight: str}`
    # — there's almost nothing to validate beyond min_length, so
    # retries here are mostly wasted tokens.
    max_schema_retries = 1

    async def run(self, input: InsightInput) -> MarketingInsight:  # type: ignore[override]
        """Lenient override of BaseAgent.run — the insight is ONE long
        free-text markdown report, not structured data.

        The base run() forces the output through SchemaRetryPolicy, which
        requires valid JSON. Asking the LLM to JSON-encode a multi-thousand-word
        markdown string (`{"insight": "...report..."}`) is fragile: unescaped
        newlines/quotes make json.loads fail, so the retry re-ran the whole
        6000-token generation. That doubled latency past Cloudflare's 100s proxy
        limit on api.truelight.app — the wizard's Analysis step died with
        "Failed to fetch" — and still 502'd in the end.

        Here we make ONE LLM call and take its text as the report directly:
        strip any ```fence, and (for back-compat with the old JSON-envelope
        prompt) unwrap a `{"insight": "..."}` object when the model still emits
        clean JSON. No JSON dependency, no second call.
        """
        response = await self.llm_client.complete(
            LLMRequest(
                prompt=self.build_prompt(input),
                system=self.system_prompt(),
                spec=self.model_spec,
            ),
            agent=self.name,
        )
        text = (response.text if hasattr(response, "text") else str(response)).strip()
        # Strip a leading ```/```json fence and trailing ``` if the model added one.
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text).strip()
        # Back-compat: a model that still returns a valid {"insight": "..."}
        # envelope is unwrapped so we never show JSON scaffolding in the report.
        parsed = extract_json(text)
        if (
            isinstance(parsed, dict)
            and isinstance(parsed.get("insight"), str)
            and len(parsed["insight"].strip()) >= 200
        ):
            text = parsed["insight"].strip()
        return MarketingInsight(insight=text)

    def system_prompt(self) -> str:
        # Static role + frame matrix + section guidance — all cached.
        # Previously frame matrix and section guidance lived in the
        # user prompt (build_prompt); moving them here lets Anthropic
        # ephemeral caching cover ~4KB of stable text that's identical
        # across every wizard run within the 5-minute cache window.
        #
        # Language: the user prompt carries the explicit `language`
        # field. The system prompt stays language-neutral — the prior
        # "Korean by default" wording was hard-coded here and surprised
        # operators of US/English businesses (and bloated output token
        # counts → 180s timeouts). Language directive moved into
        # build_prompt where the per-call value lives.
        return (
            "You are a senior church-growth consultant and pastoral strategist "
            "who writes a practical guidance report helping a local church "
            "understand the community it is called to reach and how to serve "
            "and disciple it faithfully — in the spirit of Mark Dever (9Marks), "
            "Tim Keller, John Stott, and Martyn Lloyd-Jones. This is ecclesiology "
            "and mission, not consumer marketing: treat people as souls and "
            "neighbors God calls, never as a 'market' or 'customers'. The frame "
            "matrix and section guide below use generic business language — "
            "interpret them through a church lens and recast or skip any section "
            "that does not fit a church (e.g. pricing / unit economics → "
            "stewardship and resourcing; SEO / paid ads → the digital "
            "accessibility of the gospel, sermons, and worship; competitive "
            "advantage → the church's spiritual identity and theological "
            "convictions). Use supplied US Census data only as a sidebar on the "
            "surrounding community's needs — never invent a number. Language to "
            "write in is supplied per-call via the `Output language` directive "
            "in the user prompt — write the entire report (headings + body) "
            "in that single language, no mixing.\n"
            "\n"
            f"{_FRAME_MATRIX}\n"
            f"{_SECTION_GUIDANCE}"
        )

    def build_prompt(self, input: InsightInput) -> str:
        # Frame matrix + section guidance moved to system_prompt
        # (cached). User prompt only carries per-run input — census,
        # strategy, business — so the cache fingerprint stays stable.
        census_block = _format_census_for_prompt(input.census)
        strategy = _strategy_block(input.strategy)
        is_ko = input.language == "ko"
        if is_ko:
            section_list = (
                "  1. 타겟 고객 프로필\n"
                "  2. 다국어/다문화 전략\n"
                "  3. 지역/산업 인프라\n"
                "  4. 가격 / 단위경제 기반 포지셔닝\n"
                "  5. 웹사이트 디자인 방향\n"
                "  6. 경쟁 우위 & 차별화\n"
                "  7. SEO & 디지털 마케팅 채널\n"
                "  8. 콘텐츠 & CTA 전략"
            )
            opening_line = "  > 분석 프레임: {frame} — {한 줄 요약}"
            lang_directive = (
                "Output language: ko — write EVERY heading and EVERY "
                "section body in Korean (한국어). Do not mix in English "
                "sentences except for proper nouns / brand names."
            )
        else:
            section_list = (
                "  1. Target Customer Profile\n"
                "  2. Multilingual / Multicultural Strategy\n"
                "  3. Regional / Industry Infrastructure\n"
                "  4. Pricing & Unit-Economics-Based Positioning\n"
                "  5. Website Design Direction\n"
                "  6. Competitive Advantage & Differentiation\n"
                "  7. SEO & Digital Marketing Channels\n"
                "  8. Content & CTA Strategy"
            )
            opening_line = "  > Analysis frame: {frame} — {one-line summary}"
            lang_directive = (
                "Output language: en — write EVERY heading and EVERY "
                "section body in English. Do not switch to another "
                "language for any part of the report."
            )
        return (
            f"{census_block}\n"
            f"{strategy}\n"
            f"[BUSINESS]\n"
            f"  Name: {input.business_name}\n"
            f"  Industry: {input.industry}\n"
            f"  Description: {input.description or '(not specified)'}\n"
            f"  Target location: {input.target_location or '(not specified)'}\n"
            f"  Operator-supplied targeting notes: "
            f"{input.targeting or '(none)'}\n"
            f"\n"
            f"[OUTPUT LANGUAGE]\n"
            f"{lang_directive}\n"
            f"\n"
            f"[TASK]\n"
            f"Write a comprehensive 8-section marketing strategy report in\n"
            f"markdown. FIRST decide the analysis frame from the strategy\n"
            f"block + matrix above (state the chosen frame in one sentence at\n"
            f"the very top of the report). Then write each section using the\n"
            f"section guidance — replace census-centric framing with the\n"
            f"appropriate substitute when the frame is B2B / wholesale /\n"
            f"online / b2g. Section headings:\n"
            f"{section_list}\n"
            f"\n"
            f"Open the report with a single line:\n"
            f"{opening_line}\n"
            f"\n"
            f"Return ONLY the markdown report itself — NO JSON wrapper, NO code\n"
            f"fences, no preamble or closing remarks. Start directly with the\n"
            f"opening line above. (Wrapping a multi-thousand-word report in a\n"
            f"JSON string forces fragile escaping that breaks parsing.)\n"
        )
