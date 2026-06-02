"""Tests for PATTERN_BLOCK_MAP — verify shape and coverage."""

from __future__ import annotations

import json
import pathlib

import pytest

from dw_church_adapter import PATTERN_BLOCK_MAP, PatternBlock


# Block taxonomy is derived from packages/blocks/src/registry.json — the
# single source of truth for block_type metadata across both TypeScript
# (server, admin, storefront) and Python (this package). When that file
# changes, this test set re-syncs automatically.
#
#   Static blocks  - leaves; admin-editable directly on the page
#   Data blocks    - leaves; pull from a Content Module table
#   Layout blocks  - have children[]; row | columns | tabs | accordion
LAYOUT_BLOCKS = {"row", "columns", "tabs", "accordion"}

_REGISTRY_PATH = (
    pathlib.Path(__file__).resolve().parents[3]
    / "packages"
    / "blocks"
    / "src"
    / "registry.json"
)
with _REGISTRY_PATH.open(encoding="utf-8") as _f:
    _REGISTRY = json.load(_f)

# Includes hidden + alias block_types — the planner doesn't have to use
# them, but the adapter is allowed to map a pattern onto them, so the
# coverage check has to know about them.
KNOWN_BLOCK_TYPES = set(_REGISTRY["blocks"].keys()) | LAYOUT_BLOCKS


# Required = patterns the Planner LLM may emit. Keep this a *minimum*
# expectation — Phase 4 added new pattern keys (stats-counter, team-members,
# faq, contact, logo-bar, video, subscribe, location, check-list); they are
# allowed extras (no upper bound on PATTERN_BLOCK_MAP keys).
REQUIRED_PATTERNS = {
    "hero-section",
    "features-grid",
    "cta-section",
    "testimonials",
    "gallery-showcase",
    "pricing-table",
    "about-section",
}


def test_all_required_patterns_present() -> None:
    """Every Planner pattern from CLAUDE.md must have a mapping entry."""
    missing = REQUIRED_PATTERNS - set(PATTERN_BLOCK_MAP.keys())
    assert not missing, f"Patterns missing from PATTERN_BLOCK_MAP: {missing}"


@pytest.mark.parametrize("pattern_name", sorted(PATTERN_BLOCK_MAP.keys()))
def test_pattern_expansion_is_non_empty(pattern_name: str) -> None:
    """A pattern must expand to at least one block."""
    blocks = PATTERN_BLOCK_MAP[pattern_name]
    assert len(blocks) > 0, f"Pattern {pattern_name!r} expanded to nothing"
    assert all(isinstance(b, PatternBlock) for b in blocks)


def _walk(blocks: list[PatternBlock]):
    for b in blocks:
        yield b
        yield from _walk(b.children)


@pytest.mark.parametrize("pattern_name", sorted(PATTERN_BLOCK_MAP.keys()))
def test_pattern_only_uses_known_block_types(pattern_name: str) -> None:
    """Catch typos in block_type by checking against the canonical set."""
    blocks = PATTERN_BLOCK_MAP[pattern_name]
    unknown: list[str] = []
    for b in _walk(blocks):
        if b.block_type not in KNOWN_BLOCK_TYPES:
            unknown.append(b.block_type)
    assert not unknown, (
        f"Pattern {pattern_name!r} uses unknown block_type(s): {unknown}. "
        "Either add them to BlockRenderer.tsx + BLOCK_DEFS, or fix the typo."
    )


@pytest.mark.parametrize("pattern_name", sorted(PATTERN_BLOCK_MAP.keys()))
def test_only_layout_blocks_have_children(pattern_name: str) -> None:
    """Static and data blocks must not have children; only layout blocks can."""
    blocks = PATTERN_BLOCK_MAP[pattern_name]
    for b in _walk(blocks):
        if b.children and b.block_type not in LAYOUT_BLOCKS:
            pytest.fail(
                f"Pattern {pattern_name!r}: non-layout block "
                f"{b.block_type!r} has children — only layout blocks may have children."
            )


@pytest.mark.parametrize("pattern_name", sorted(PATTERN_BLOCK_MAP.keys()))
def test_props_template_is_jsonable(pattern_name: str) -> None:
    """Every props_template must serialize to JSON without custom encoders."""
    import json
    blocks = PATTERN_BLOCK_MAP[pattern_name]
    for b in _walk(blocks):
        try:
            json.dumps(b.props_template)
        except (TypeError, ValueError) as e:
            pytest.fail(
                f"Pattern {pattern_name!r} block {b.block_type!r} "
                f"props_template not JSON-serializable: {e}"
            )
