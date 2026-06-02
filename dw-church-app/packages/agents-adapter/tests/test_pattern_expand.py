"""Tests for the pattern expander."""

from __future__ import annotations

import pytest

from dw_church_adapter import (
    ExpandedSection,
    PatternExpansionError,
    expand_pattern,
)


# ── basic happy paths ────────────────────────────────────────


def test_unknown_pattern_raises() -> None:
    with pytest.raises(PatternExpansionError):
        expand_pattern("nope", {})


def test_hero_section_substitutes_simple_placeholders() -> None:
    [section] = expand_pattern(
        "hero-section",
        {"site_name": "Acme Co.", "tagline": "Best tools."},
    )
    assert isinstance(section, ExpandedSection)
    assert section.block_type == "hero_banner"
    assert section.props["title"] == "Acme Co."
    assert section.props["subtitle"] == "Best tools."
    # Hero banner now declares its variant explicitly so storefront picks
    # the right renderer (image-overlay vs split-image vs text-only).
    assert section.props["variant"] == "image-overlay"


def test_unknown_placeholder_left_verbatim() -> None:
    [section] = expand_pattern("hero-section", {})
    # site_name not provided -> placeholder remains
    assert section.props["title"] == "{site_name}"


def test_ai_image_placeholder_passed_through() -> None:
    """{ai_image:hero} must be left verbatim for Developer agent to resolve."""
    [section] = expand_pattern("hero-section", {"site_name": "X", "tagline": "Y"})
    assert section.props["backgroundImageUrl"] == "{ai_image:hero}"


def test_ai_images_array_placeholder_passed_through() -> None:
    [section] = expand_pattern("gallery-showcase", {})
    assert section.props["images"] == "{ai_images:section[3-6]}"


# ── rich-block patterns: list[] preserved as-is ──────────────


def test_features_grid_uses_dedicated_block_with_items_list() -> None:
    """Phase 4: features-grid emits a single features_grid block (not row+cols)."""
    [section] = expand_pattern(
        "features-grid",
        {
            "features_title": "Why us",
            "features_subtitle": "Built for scale",
            "features_items": [
                {"title": "Fast", "description": "Sub-second loads."},
                {"title": "Secure", "description": "End-to-end encryption."},
                {"title": "Scalable", "description": "From 0 to 1M users."},
            ],
        },
    )
    assert section.block_type == "features_grid"
    assert section.props["title"] == "Why us"
    assert section.props["subtitle"] == "Built for scale"
    # Items list preserved as a list (whole-string placeholder rule).
    items = section.props["items"]
    assert isinstance(items, list) and len(items) == 3
    assert items[0]["title"] == "Fast"


def test_testimonials_uses_dedicated_block() -> None:
    [section] = expand_pattern(
        "testimonials",
        {
            "testimonials_title": "Customers love us",
            "testimonial_items": [
                {"quote": "Great!", "author": "Jane", "company": "Acme"},
                {"quote": "Excellent!", "author": "John", "company": "Beta"},
            ],
        },
    )
    assert section.block_type == "testimonials"
    items = section.props["items"]
    assert len(items) == 2
    assert items[0]["author"] == "Jane"


def test_pricing_table_uses_dedicated_block() -> None:
    [section] = expand_pattern(
        "pricing-table",
        {
            "pricing_currency": "$",
            "pricing_tiers": [
                {
                    "name": "Pro",
                    "price": "29",
                    "period": "/mo",
                    "features": ["Unlimited pages", "Custom domain"],
                    "buttonText": "Choose Pro",
                    "buttonUrl": "/checkout/pro",
                    "featured": True,
                },
            ],
        },
    )
    assert section.block_type == "pricing_table"
    assert section.props["currency"] == "$"
    tiers = section.props["items"]
    assert tiers[0]["features"] == ["Unlimited pages", "Custom domain"]
    assert tiers[0]["featured"] is True


def test_cta_section_uses_dedicated_cta_block_with_buttons() -> None:
    [section] = expand_pattern(
        "cta-section",
        {
            "cta_headline": "Ready to start?",
            "cta_description": "Join 1,000+ teams.",
            "cta_button": "Sign up",
            "cta_url": "/signup",
        },
    )
    assert section.block_type == "cta_section"
    assert section.props["variant"] == "boxed-card"
    assert section.props["title"] == "Ready to start?"
    assert section.props["description"] == "Join 1,000+ teams."
    assert section.props["buttonText"] == "Sign up"
    assert section.props["buttonUrl"] == "/signup"


# ── new patterns ─────────────────────────────────────────────


def test_stats_counter_pattern() -> None:
    [section] = expand_pattern(
        "stats-counter",
        {
            "stats_title": "By the numbers",
            "stats_items": [
                {"value": "1000", "label": "Customers", "unit": "+"},
                {"value": "99.9", "label": "Uptime", "unit": "%"},
            ],
        },
    )
    assert section.block_type == "stats_counter"
    assert section.props["items"][0]["unit"] == "+"


def test_team_members_pattern() -> None:
    [section] = expand_pattern(
        "team-members",
        {
            "team_items": [
                {"name": "Jane", "role": "CEO"},
                {"name": "John", "role": "CTO"},
            ],
        },
    )
    assert section.block_type == "team_members"
    assert section.props["columns"] == "3"
    assert len(section.props["items"]) == 2


def test_faq_pattern() -> None:
    [section] = expand_pattern(
        "faq",
        {
            "faq_items": [
                {"question": "What is it?", "answer": "A SaaS."},
                {"question": "How much?", "answer": "$29/mo."},
            ],
        },
    )
    assert section.block_type == "faq_accordion"
    assert len(section.props["items"]) == 2


def test_contact_pattern() -> None:
    [section] = expand_pattern("contact", {"contact_title": "Get in touch"})
    assert section.block_type == "contact_info"
    assert section.props["title"] == "Get in touch"


def test_logo_bar_pattern() -> None:
    [section] = expand_pattern(
        "logo-bar",
        {
            "logo_items": [
                {"name": "Acme", "logoUrl": "/logos/acme.svg"},
            ],
        },
    )
    assert section.block_type == "logo_bar"
    assert section.props["grayscale"] is True


def test_video_pattern() -> None:
    [section] = expand_pattern(
        "video",
        {"video_title": "Watch demo", "video_url": "https://youtu.be/abc123"},
    )
    assert section.block_type == "video"
    assert section.props["youtubeUrl"] == "https://youtu.be/abc123"


def test_product_showcase_pattern_pulls_live_catalog() -> None:
    [section] = expand_pattern(
        "product-showcase",
        {
            "products_title": "Our Products",
            "products_subtitle": "Premium B2B catalog",
        },
    )
    # Block_type is the live-data block; the operator's catalog (not
    # agent context) populates the rendered cards.
    assert section.block_type == "products_showcase"
    assert section.props["title"] == "Our Products"
    assert section.props["variant"] == "grid"
    assert section.props["source"] == "recent"
    assert section.props["limit"] == 6


# ── all patterns expand cleanly ──────────────────────────────


@pytest.mark.parametrize(
    "pattern,ctx",
    [
        ("hero-section", {"site_name": "Acme", "tagline": "T"}),
        ("features-grid", {"features_items": [{"title": "F", "description": "D"}]}),
        ("cta-section", {
            "cta_headline": "H", "cta_description": "D", "cta_button": "Go",
            "cta_url": "/x",
        }),
        ("testimonials", {"testimonial_items": [{"quote": "Q", "author": "N"}]}),
        ("gallery-showcase", {}),
        ("pricing-table", {
            "pricing_tiers": [{
                "name": "Pro", "price": "29", "period": "/mo",
                "features": ["a", "b"], "buttonText": "Go", "buttonUrl": "/p",
            }],
        }),
        ("about-section", {"about_text": "About us..."}),
        ("stats-counter", {"stats_items": [{"value": "100", "label": "L"}]}),
        ("team-members", {"team_items": [{"name": "N", "role": "R"}]}),
        ("faq", {"faq_items": [{"question": "Q", "answer": "A"}]}),
        ("contact", {"contact_title": "Contact"}),
        ("logo-bar", {"logo_items": [{"name": "N", "logoUrl": "/l.svg"}]}),
        ("video", {"video_url": "https://x"}),
        ("subscribe", {"subscribe_title": "Sub"}),
        ("location", {"map_address": "Seoul"}),
        ("check-list", {"check_items": [{"text": "Item"}]}),
        ("product-showcase", {"products_title": "Catalog"}),
    ],
)
def test_pattern_expands_to_at_least_one_section(
    pattern: str, ctx: dict[str, object],
) -> None:
    sections = expand_pattern(pattern, ctx)
    assert len(sections) >= 1
    for s in sections:
        assert isinstance(s, ExpandedSection)
        assert s.block_type
        assert isinstance(s.props, dict)


# ── purity: input map not mutated ────────────────────────────


def test_expansion_does_not_mutate_pattern_map() -> None:
    """Repeat expansions must not see prior results — deepcopy guarantee."""
    s1 = expand_pattern("hero-section", {"site_name": "First", "tagline": "T1"})
    s2 = expand_pattern("hero-section", {"site_name": "Second", "tagline": "T2"})
    assert s1[0].props["title"] == "First"
    assert s2[0].props["title"] == "Second"
    # The unsubstituted call still sees the placeholder, proving the map is intact
    s3 = expand_pattern("hero-section", {})
    assert s3[0].props["title"] == "{site_name}"


def test_jsonable_output() -> None:
    """Expanded props must be JSON-serializable (will be sent over HTTP)."""
    import json
    sections = expand_pattern("features-grid", {
        "features_items": [{"title": "F", "description": "D"}],
    })
    for s in sections:
        json.dumps({"block_type": s.block_type, "props": s.props})
