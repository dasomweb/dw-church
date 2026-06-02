"""Planner Agent - Site structure and content strategy.

Responsibilities:
- Generate sitemap from business description
- Plan page structure (which patterns to use, in what order)
- Define SEO keyword strategy
- Output: Updated ProjectContext with pages and structure
"""

import json

from app.agents.base import (
    AgentBase,
    AgentResult,
    AgentRole,
    AgentStatus,
    ProjectContext,
)

PLANNER_SYSTEM_PROMPT = """You are a web strategist and information architect.
Given a business description, create a website structure plan.

Output a JSON object with:
{
  "site_name": "<business name>",
  "pages": [
    {
      "page_id": "p01",
      "title": "<page title>",
      "slug": "<url slug>",
      "purpose": "<one-line purpose>",
      "sections": [
        {
          "pattern": "hero-section",
          "purpose": "<purpose of this section>",
          "context": {"hero_eyebrow": "<eyebrow>", "cta_button": "<button label>", "cta_url": "<target url>"}
        },
        {
          "pattern": "logo-bar",
          "purpose": "<social proof — trusted-by client logos>",
          "context": {
            "logo_title": "<title>",
            "logo_items": [{"name": "<client name>", "logoUrl": ""}]
          }
        },
        {
          "pattern": "about-section",
          "purpose": "<who we are story>",
          "context": {
            "about_eyebrow": "<eyebrow>",
            "about_title": "<title>",
            "about_text": "<short paragraph>",
            "about_variant": "right"
          }
        },
        {
          "pattern": "features-grid",
          "purpose": "<what we do — services>",
          "context": {
            "features_eyebrow": "<eyebrow>",
            "features_title": "<grid title>",
            "features_subtitle": "<grid subtitle>",
            "features_items": [
              {"title": "<feature title>", "description": "<feature desc>", "iconName": "<lucide icon name>"}
            ]
          }
        },
        {
          "pattern": "stats-counter",
          "purpose": "<by the numbers — quantifiable proof>",
          "context": {
            "stats_eyebrow": "<eyebrow>",
            "stats_items": [{"value": "<N>", "label": "<label>", "unit": "<%/+/etc>"}]
          }
        },
        {
          "pattern": "testimonials",
          "purpose": "<customer quotes — social proof>",
          "context": {
            "testimonials_eyebrow": "<eyebrow>",
            "testimonials_title": "<title>",
            "testimonial_items": [{"quote": "<quote>", "author": "<name>", "role": "<role>", "company": "<company>"}]
          }
        },
        {
          "pattern": "cta-section",
          "purpose": "<final conversion ramp — REQUIRED last section>",
          "context": {
            "cta_eyebrow": "<eyebrow>",
            "cta_headline": "<short headline>",
            "cta_description": "<one-line desc>",
            "cta_button": "<primary action label>",
            "cta_url": "<target>",
            "cta_secondary_button": "<optional secondary>",
            "cta_secondary_url": "<optional>"
          }
        }
      ],
      "seo_focus": "<primary keyword>"
    }
  ],
  "seo_keywords": ["<kw1>", "<kw2>"],
  "brand_tone": "<professional/friendly/modern/etc>"
}

EXAMPLE ABOVE shows the diversity the planner SHOULD aim for — 7 different
patterns in a single page (hero / logo-bar / about / features / stats /
testimonials / cta). Do NOT shrink this back to "hero + features-grid + cta"
— that's the lazy default the operator has explicitly rejected. Mix at
LEAST 4 distinct patterns per page from the Available patterns list,
choosing whichever pattern best tells each section's purpose. Same pattern
must never appear twice in a row.

NOTE on copy: every "<...>" placeholder above MUST be filled with copy
that matches the LANGUAGE of the operator's business description (input
language). Do NOT default to English or Korean — follow the operator's
input language. NEVER copy the placeholder text or English example
phrases like "Get started" / "What we do" into the output verbatim.

Available patterns (pick the right one for each section's purpose):
  Heros & CTA
    hero-section       — full-bleed image hero with overlay (use for the first section of every page)
    cta-section        — text-only CTA banner with primary + secondary buttons (use for end-of-page conversion)
  Content
    features-grid      — 3-card feature row (use for "what we do" / "why us" sections)
    stats-counter      — animated number counters (use for "by the numbers" / social proof)
    pricing-table      — pricing tiers with feature lists (use for pricing pages)
    testimonials       — customer quotes (use for social proof)
    team-members       — team photo grid (use for "about" / "team" pages)
    faq                — collapsible Q&A list (use for FAQ section / pricing page bottom)
    about-section      — image + paragraph layout (use for "our story")
    check-list         — bulleted feature/benefit list (use as supplement to about/services)
    gallery-showcase   — image gallery (use for portfolio / case studies)
    logo-bar           — customer/partner logo strip (use after hero for trust signal)
    video              — embedded YouTube video (use for product demos)
  Conversion
    subscribe          — newsletter sign-up form (use mid-page for lead capture)
    contact            — contact info card pulling from site settings (use on Contact page)
    location           — embedded map (use on Contact page below `contact`)
  Catalog
    product-showcase   — pulls live products from the tenant catalog
                         (variant=grid: uniform cards, =portfolio: visual-led
                         varied sizes, =magazine: editorial alternating).
                         Use for product/solutions pages, or anywhere the
                         site needs to feature its catalog. Source defaults
                         to `recent` so it stays evergreen.

Each section MUST include a `context` object populated with the data needed
to render it. Look up the pattern name and produce concrete content — DO NOT
leave placeholder strings like "Feature 1" / "Lorem ipsum" in production
plans.

**Eyebrow 필드는 모든 섹션에 필수** (dasomweb.com 벤치마크 — AI 빌더가 도달해야
할 최소 디자인 품질 기준선): 모든 섹션이 작은 uppercase 카테고리 라벨 + 큰
헤드라인 + 서브카피의 3-tier 구조를 갖는다. 예시 eyebrow: "REAL RESULTS,
BEAUTIFULLY DELIVERED" / "OUR PROCESS" / "CONTACT US" / "왜 우리인가" /
"이런 분에게 추천합니다". eyebrow 없이 헤드라인이 갑자기 나오면 엉성한 평균치
템플릿처럼 보임 — 반드시 채울 것 (한국어 또는 영문 uppercase, 2-5단어).

Required `context` keys per pattern:

  hero-section:    {hero_eyebrow, cta_button, cta_url}
  cta-section:     {cta_eyebrow, cta_headline, cta_description, cta_button, cta_url,
                    cta_secondary_button?, cta_secondary_url?}
  features-grid:   {features_eyebrow, features_title, features_subtitle,
                    features_items: [{title, description, iconName?}]}
  stats-counter:   {stats_eyebrow, stats_title?, stats_subtitle?, stats_items: [{value, label, unit?, prefix?}]}
  pricing-table:   {pricing_eyebrow, pricing_title?, pricing_subtitle?, pricing_currency,
                    pricing_tiers: [{name, price, period, features:[…], buttonText, buttonUrl, featured?}]}
  testimonials:    {testimonials_eyebrow, testimonials_title?, testimonials_subtitle?,
                    testimonial_items: [{quote, author, role?, company?}]}
  team-members:    {team_eyebrow, team_title?, team_subtitle?, team_items: [{name, role, photoUrl?, bio?}]}
  faq:             {faq_eyebrow, faq_title?, faq_subtitle?, faq_items: [{question, answer}]}
  about-section:   {about_eyebrow, about_title, about_subtitle?, about_text,
                    about_variant}
                    about_variant: 'left' | 'right' — 같은 페이지에 about-section 이
                    여러 개 있을 때 반드시 'left' / 'right' 교대로 박을 것 (지그재그
                    비대칭 배치 = dasomweb 패턴 2). 페이지 첫 about 은 'right'.
  check-list:      {check_title?, check_items: [{text, description?}]}
  gallery-showcase:{gallery_title?}
  logo-bar:        {logo_title?, logo_items: [{name, logoUrl, linkUrl?}]}
  video:           {video_title?, video_url}
  subscribe:       {subscribe_eyebrow, subscribe_title?, subscribe_subtitle?, subscribe_placeholder?, subscribe_button?, subscribe_success?}
  contact:         {contact_title}
  location:        {map_title?, map_address, map_lat?, map_lng?}
  product-showcase:{products_title?, products_subtitle?}
                    (variant + source defaults handled by adapter; the
                     catalog itself is operator-managed, not agent-generated)

Image fields (`backgroundImageUrl`, `imageUrl`, `photoUrl`, `logoUrl`) should
be omitted from `context` — the image generation step fills them via the
`{ai_image:hero}` / `{ai_image:section}` / `{ai_image:square}` placeholders.

Rules:
1. Always include a Home page (p01)
2. Choose patterns that match each section's purpose; do not default to
   features-grid for everything — a stats-counter row, a logo-bar, a faq
   section, etc. each tell a different story.
3. Each page should have 3-7 sections.
4. Provide between 3-6 items in `items` arrays (features_items, stats_items,
   testimonial_items, etc.) — empty arrays render as empty sections.
5. Plan for SEO with targeted keywords per page.
6. Support Korean language input — produce Korean copy when the input is Korean.
7. **EVERY page's LAST section MUST be `cta-section`** — no exceptions.
   Home, About, product detail, category, contact, every single page closes
   with a cta-section that ramps the visitor to the next action (contact,
   quote, subscribe, etc.). A page that ends with features-grid /
   testimonials / faq / any other pattern is INVALID.
8. **EVERY page's FIRST section MUST be `hero-section`** — every page opens
   with a full-bleed image hero so visitors see brand + intent immediately.

**Design quality benchmark — dasomweb.com 6 패턴 (반드시 충족)**:

9. **3-tier 구조 (eyebrow + 헤드라인 + 서브카피)** — 위 context required keys
   에 명시된 `*_eyebrow` 필드를 모든 섹션에 채움. 짧고 강한 카테고리 라벨
   (2-5단어, 한국어 또는 영문 uppercase). 예: "REAL RESULTS, BEAUTIFULLY
   DELIVERED" / "OUR PROCESS" / "왜 우리인가" / "이런 분에게 추천합니다".
10. **비대칭 image/text 배치** — about-section 을 한 페이지에 여러 개 쓸 때
    `about_variant` 를 'left' / 'right' 교대로 박아 지그재그 비주얼 흐름 만듦.
11. **4-column 미니멀 카드** — features-grid 의 items 는 4개 권장 (헤드라인 +
    1줄 description, iconName 은 정말 의미 있을 때만). 카드에 emoji 과다 사용 X.
12. **풍부한 vertical spacing 의도** — 한 페이지에 3-5개 섹션의 다양한
    pattern 을 섞어서 (hero → features → stats → about → testimonials → cta)
    페이지 위아래로 시각 호흡 있는 흐름 구성. 같은 패턴 연속 반복 금지.
13. **마지막 boxed-card CTA** — cta-section 의 eyebrow (예: "CONTACT US"
    / "지금 시작하세요") + 큰 cta_headline + cta_description 1줄 + 명확한
    cta_button 라벨. variant 는 boxed-card (adapter default, 변경 불필요).
14. **타이포그래피 강한 위계** — 헤드라인은 짧고 굵게 (5-10단어), description
    은 1-2 문장으로 간결. 같은 너비 / 같은 align 반복 금지 (center 만 반복 X).

**안 되는 패턴** (즉시 reject 사유):
- features-grid 만 반복해서 페이지 채움
- eyebrow 누락
- CTA 없이 페이지 끝
- "Lorem ipsum" / "Feature 1" / 영문 placeholder copy 남김
- 모든 섹션이 같은 align/너비

15. Return ONLY the JSON object, no markdown or explanation."""


_REQUIRED_CTA_KEYS = ("cta_headline", "cta_description", "cta_button", "cta_url")


def _validate_plan_cta(pages: list[dict]) -> list[str]:
    """Return a list of human-readable violations of the CTA contract.

    The Planner LLM is instructed (Rules 7-8) that every page MUST end
    with a cta-section whose `context` is fully populated by the LLM
    itself. No code-level default fills are allowed — see
    feedback-no-hardcoded-defaults. A non-empty return list is reported
    as AgentResult.errors so the orchestrator / operator decides what to
    do (retry the Planner call, regenerate, etc.) — silent code-level
    defaults would defeat the whole point.
    """
    violations: list[str] = []
    for idx, page in enumerate(pages):
        ident = page.get("slug") or page.get("page_id") or f"page#{idx}"
        sections = page.get("sections") or []
        if not isinstance(sections, list) or not sections:
            violations.append(f"{ident}: no sections")
            continue
        last = sections[-1]
        if not isinstance(last, dict) or last.get("pattern") != "cta-section":
            violations.append(
                f"{ident}: last section pattern is "
                f"{last.get('pattern') if isinstance(last, dict) else type(last).__name__!r}, "
                "must be 'cta-section'"
            )
            continue
        ctx = last.get("context") or {}
        if not isinstance(ctx, dict):
            violations.append(f"{ident}: cta-section.context must be an object")
            continue
        missing = [k for k in _REQUIRED_CTA_KEYS if not str(ctx.get(k) or "").strip()]
        if missing:
            violations.append(
                f"{ident}: cta-section.context missing required keys "
                f"{missing} — LLM must populate, no code-level defaults"
            )
    return violations


class PlannerAgent(AgentBase):
    """Plans website structure and content strategy."""

    role = AgentRole.PLANNER

    async def execute(self, context: ProjectContext) -> AgentResult:
        """Generate site plan from business description."""
        if not context.business_description:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=["No business description provided"],
            )

        if not self._ai_service:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=[
                    "PlannerAgent has no AI service configured. "
                    "Code-level _default_plan fixtures are not used in any "
                    "production path — they shipped template content "
                    "disguised as AI output. Provide a real ai_service or "
                    "fail explicitly. See feedback-no-hardcoded-defaults."
                ],
            )

        prompt = self.get_prompt(context)
        try:
            client = self._ai_service._get_client()
            response = await client.messages.create(
                model="claude-opus-4-7",
                max_tokens=4096,
                system=PLANNER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            plan = self._parse_plan(raw)
        except Exception as e:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=[f"AI generation failed: {e}"],
            )

        pages = plan.get("pages", [])

        # Hard-fail on CTA contract violations. The LLM is instructed
        # (Rules 7-8) that every page ends with a populated cta-section;
        # if it dropped that, we surface the error instead of papering
        # over with code defaults — see feedback-no-hardcoded-defaults.
        violations = _validate_plan_cta(pages)
        if violations:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                output=plan,
                errors=[
                    "Planner violated CTA contract — LLM must populate "
                    "every page's last section (cta-section) with full "
                    "context. No code-level defaults are filled here.",
                    *violations,
                ],
            )

        # Update context
        context.site_name = plan.get("site_name", context.site_name)
        context.pages = pages
        context.seo_keywords = plan.get("seo_keywords", [])

        return AgentResult(
            role=self.role,
            status=AgentStatus.AWAITING_APPROVAL,
            output=plan,
            summary=f"Planned {len(context.pages)} pages: {', '.join(p['title'] for p in context.pages)}",
        )

    def get_prompt(self, context: ProjectContext) -> str:
        return f"Create a website plan for: {context.business_description}"

    @staticmethod
    def _parse_plan(raw: str) -> dict:
        """Parse AI response into plan dict."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            import re
            cleaned = re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned).strip()
        return json.loads(cleaned)

    # `_default_plan` was removed. It used to be the `else` branch of the
    # `if self._ai_service` check at the top of `execute`, meaning a
    # misconfigured tenant would silently receive a fixture plan disguised
    # as AI output. The fixture contained real-looking English copy
    # ("Home", "Main headline", "Key features", "Call to action") that
    # operators would mistake for AI-generated content. Tests must inject
    # a mocked ai_service rather than relying on a code-level fixture.
    # See feedback-no-hardcoded-defaults.
