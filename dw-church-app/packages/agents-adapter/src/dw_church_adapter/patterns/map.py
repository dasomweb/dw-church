"""PATTERN_BLOCK_MAP — Phase 4 canonical mapping.

Each entry maps a planner pattern key to an ordered list of ``PatternBlock``
entries. ``PatternBlock`` mirrors the shape of an ``apps/server`` page_section
row: a block_type plus a JSONB props payload (and, for layout blocks, an
optional list of children).

Patterns prefer purpose-built storefront blocks (``features_grid``,
``stats_counter``, ``team_members``, etc.) over composing primitive blocks
(``row > columns > text_image``). The earlier "row + columns + text_image"
fallback is kept only for layouts that genuinely need bespoke composition.

Placeholder syntax used in ``props_template``:

    {site_name}        - tenant business name (from settings)
    {tagline}          - planner.tagline
    {features_items}   - list[{title, description, iconName?}] for features_grid
    {stats_items}      - list[{value, label, unit?, prefix?}] for stats_counter
    {team_items}       - list[{name, role, photoUrl?, bio?}] for team_members
    {pricing_tiers}    - list[{name, price, period, features[], buttonText, buttonUrl, featured?}]
    {testimonial_items}- list[{quote, author, role?, company?}] for testimonials
    {faq_items}        - list[{question, answer}] for faq_accordion
    {logo_items}       - list[{name, logoUrl, linkUrl?}] for logo_bar
    {check_items}      - list[{text, description?}] for check_list
    {ai_image:hero}    - request hero-variant (1920x1080) image generation
    {ai_image:section} - request section-variant (1280x800) image
    {ai_image:square}  - request square (1024x1024) image
    {ai_images:section[3-6]} - 3 to 6 section images for galleries
    {cta_headline}, {cta_description}, {cta_button}, {cta_url}
    {about_title}, {about_text}
    {video_url}        - YouTube URL for `video` block
    {map_address}, {map_lat}, {map_lng}
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PatternBlock:
    """A single block in a pattern expansion.

    Attributes:
        block_type: True Light block_type (e.g. "hero_banner", "features_grid").
        props_template: dict copied verbatim into page_sections.props (with
            placeholder substitution applied by the expander).
        children: For layout blocks (row, columns, tabs, accordion) only —
            recursive children stored under props.children[] in the final
            page_sections row. Empty for non-layout blocks.
    """

    block_type: str
    props_template: dict[str, Any]
    children: list[PatternBlock] = field(default_factory=list)


# ─── Pattern definitions ────────────────────────────────────────────────

_HERO_SECTION = [
    PatternBlock(
        block_type="hero_banner",
        props_template={
            "variant":            "image-overlay",
            # Eyebrow — 작은 uppercase 카테고리 라벨 (feedback-design-quality-
            # benchmark 의 3-tier 첫 단). 모든 dasomweb 페이지의 hero 섹션이
            # eyebrow 를 갖음. Planner LLM 이 채움.
            "eyebrow":            "{hero_eyebrow}",
            "title":              "{site_name}",
            "subtitle":           "{tagline}",
            "backgroundImageUrl": "{ai_image:hero}",
            # Optional 9:16 portrait variant for mobile viewports. The
            # storefront HeroBannerBlock uses <picture><source media>
            # to swap this in on viewport ≤ 767px. image_service has a
            # `hero_mobile` variant tuned for the aspect ratio.
            "backgroundImageUrlMobile": "{ai_image:hero_mobile}",
            "buttonText":         "{cta_button}",
            "buttonUrl":          "{cta_url}",
            # Palette key — HeroBannerBlock 의 resolveOverlayColor 가
            # var(--accent) 로 풀어서 운영자의 brand 색으로 자동 적용.
            # 이전엔 모든 신규 사이트에 '#000000' 검정 overlay 가 박혔던
            # 자리. See feedback-no-hardcoded-defaults.
            "overlayColor":       "primary",
            "overlayOpacity":     50,
            "height":             "lg",
            "textAlign":          "center",
            "width":              "full-bleed",
        },
    ),
]


# Features grid uses the dedicated `features_grid` block — a single row of
# (title, description, iconName) cards. No layout-block wrapper needed; the
# block handles columns / cardStyle / hover lift internally per
# web-block-patterns-reference §2.4.
_FEATURES_GRID = [
    PatternBlock(
        block_type="features_grid",
        props_template={
            # 3-tier (eyebrow + title + subtitle) per dasomweb 벤치마크.
            "eyebrow":   "{features_eyebrow}",
            "title":     "{features_title}",
            "subtitle":  "{features_subtitle}",
            # 4-column 미니멀 카드 (dasomweb 패턴 3) — 헤드라인 + 1줄 설명,
            # outline 카드 스타일.
            "columns":   "4",
            "cardStyle": "outline",
            "align":     "center",
            "items":     "{features_items}",
        },
    ),
]


# CTA section now uses the dedicated cta_section block (5 variants).
# Default variant is `boxed-card` — the most common end-of-page conversion
# ask. Designer agent can override `variant` to `inline-banner`,
# `split-image`, `stats-strip`, or `contact-info` based on the page's
# purpose. Operator can also swap the variant in the inspector after
# generation without losing any of the populated copy.
_CTA_SECTION = [
    PatternBlock(
        block_type="cta_section",
        props_template={
            # dasomweb 패턴 5 — boxed-card variant + eyebrow (예: "CONTACT US")
            # + 큰 헤드라인 + 서브카피 + pill 라운드 outline 버튼.
            "variant":             "boxed-card",
            "eyebrow":             "{cta_eyebrow}",
            "title":               "{cta_headline}",
            "description":         "{cta_description}",
            "buttonText":          "{cta_button}",
            "buttonUrl":           "{cta_url}",
            "secondaryButtonText": "{cta_secondary_button}",
            "secondaryButtonUrl":  "{cta_secondary_url}",
            "align":               "center",
            "bgMode":              "subtle",
            # Pill shape — dasomweb 의 outline 라운드 버튼 패턴.
            "ctaShape":            "pill",
        },
    ),
]


# Testimonials uses the dedicated block with grid layout + bgMode.
_TESTIMONIALS = [
    PatternBlock(
        block_type="testimonials",
        props_template={
            "eyebrow":  "{testimonials_eyebrow}",
            "title":    "{testimonials_title}",
            "subtitle": "{testimonials_subtitle}",
            "layout":   "grid-3",
            "bgMode":   "subtle",
            "items":    "{testimonial_items}",
        },
    ),
]


_GALLERY_SHOWCASE = [
    PatternBlock(
        block_type="image_gallery",
        props_template={
            "title":  "{gallery_title}",
            "images": "{ai_images:section[3-6]}",
        },
    ),
]


# Pricing uses the dedicated `pricing_table` block — items[] of tier objects.
_PRICING_TABLE = [
    PatternBlock(
        block_type="pricing_table",
        props_template={
            "eyebrow":   "{pricing_eyebrow}",
            "title":     "{pricing_title}",
            "subtitle":  "{pricing_subtitle}",
            "currency":  "{pricing_currency}",
            "items":     "{pricing_tiers}",
        },
    ),
]


_ABOUT_SECTION = [
    PatternBlock(
        block_type="text_image",
        props_template={
            # 좌/우 교대 (dasomweb 패턴 2 — 의도된 비대칭 배치). Planner LLM
            # 이 같은 페이지의 about-section 들의 variant 를 'left' / 'right'
            # 교대로 박음 — 그래야 페이지 위아래로 시선이 지그재그 흐름.
            "variant":  "{about_variant}",
            "eyebrow":  "{about_eyebrow}",
            "title":    "{about_title}",
            "subtitle": "{about_subtitle}",
            "content":  "{about_text}",
            "imageUrl": "{ai_image:section}",
        },
    ),
]


# ─── New patterns ────────────────────────────────────────────────────────

_STATS_COUNTER = [
    PatternBlock(
        block_type="stats_counter",
        props_template={
            "eyebrow":  "{stats_eyebrow}",
            "title":    "{stats_title}",
            "subtitle": "{stats_subtitle}",
            "columns":  "4",
            "align":    "center",
            "bgMode":   "subtle",
            "items":    "{stats_items}",
        },
    ),
]


_TEAM_MEMBERS = [
    PatternBlock(
        block_type="team_members",
        props_template={
            "eyebrow":    "{team_eyebrow}",
            "title":      "{team_title}",
            "subtitle":   "{team_subtitle}",
            "columns":    "3",
            "photoStyle": "circle",
            "items":      "{team_items}",
        },
    ),
]


_FAQ = [
    PatternBlock(
        block_type="faq_accordion",
        props_template={
            "eyebrow":     "{faq_eyebrow}",
            "title":       "{faq_title}",
            "subtitle":    "{faq_subtitle}",
            "columns":     "1",
            "defaultOpen": 0,
            "items":       "{faq_items}",
        },
    ),
]


_CONTACT = [
    PatternBlock(
        block_type="contact_info",
        props_template={
            "title": "{contact_title}",
        },
    ),
]


_LOGO_BAR = [
    PatternBlock(
        block_type="logo_bar",
        props_template={
            "title":     "{logo_title}",
            "grayscale": True,
            "align":     "center",
            "items":     "{logo_items}",
        },
    ),
]


_VIDEO = [
    PatternBlock(
        block_type="video",
        props_template={
            "title":      "{video_title}",
            "youtubeUrl": "{video_url}",
        },
    ),
]


_SUBSCRIBE = [
    PatternBlock(
        block_type="subscribe_form",
        props_template={
            "eyebrow":        "{subscribe_eyebrow}",
            "title":          "{subscribe_title}",
            "subtitle":       "{subscribe_subtitle}",
            "placeholder":    "{subscribe_placeholder}",
            "buttonText":     "{subscribe_button}",
            "successMessage": "{subscribe_success}",
            "bgMode":         "subtle",
        },
    ),
]


_LOCATION = [
    PatternBlock(
        block_type="location_map",
        props_template={
            "title":   "{map_title}",
            "address": "{map_address}",
            "lat":     "{map_lat}",
            "lng":     "{map_lng}",
            "zoom":    15,
        },
    ),
]


_CHECK_LIST = [
    PatternBlock(
        block_type="check_list",
        props_template={
            "title":     "{check_title}",
            "columns":   "2",
            "iconStyle": "check",
            "items":     "{check_items}",
        },
    ),
]


# Product showcase — pulls live products from the tenant's catalog
# rather than from agent-generated content. Variant default is `grid`
# (works for any catalog size); designer agent can override to
# `portfolio` (visual-led, photography-style) or `magazine` (editorial,
# fewer products with longer copy). source=`recent` keeps the block
# evergreen — newest products surface automatically. Operator can swap
# source to `featured` / `category` later in the inspector.
_PRODUCT_SHOWCASE = [
    PatternBlock(
        block_type="products_showcase",
        props_template={
            "title":      "{products_title}",
            "subtitle":   "{products_subtitle}",
            "variant":    "grid",
            "source":     "recent",
            "limit":      6,
            "ctaLabel":   "자세히 보기",
            "bgMode":     "none",
        },
    ),
]


PATTERN_BLOCK_MAP: dict[str, list[PatternBlock]] = {
    # Existing — now using rich blocks.
    "hero-section":     _HERO_SECTION,
    "features-grid":    _FEATURES_GRID,
    "cta-section":      _CTA_SECTION,
    "testimonials":     _TESTIMONIALS,
    "gallery-showcase": _GALLERY_SHOWCASE,
    "pricing-table":    _PRICING_TABLE,
    "about-section":    _ABOUT_SECTION,
    # New — purpose-built blocks the storefront already implements.
    "stats-counter":    _STATS_COUNTER,
    "team-members":     _TEAM_MEMBERS,
    "faq":              _FAQ,
    "contact":          _CONTACT,
    "logo-bar":         _LOGO_BAR,
    "video":            _VIDEO,
    "subscribe":        _SUBSCRIBE,
    "location":         _LOCATION,
    "check-list":       _CHECK_LIST,
    "product-showcase": _PRODUCT_SHOWCASE,
}
"""Read-only pattern -> block expansion table.

Used inside ``DWChurchAdapter.apply_pattern()`` to translate Developer
agent output into ``page_sections`` rows.
"""
