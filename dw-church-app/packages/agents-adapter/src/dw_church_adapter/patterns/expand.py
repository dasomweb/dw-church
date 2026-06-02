"""Pattern expansion — turns PatternBlock trees into concrete Section payloads.

Given a planner pattern name and a context dict, ``expand_pattern`` walks the
PATTERN_BLOCK_MAP entry, substitutes placeholders in props_template, and
returns a list of (block_type, props) pairs ready to be persisted as
``page_sections`` rows by the Developer agent.

Layout blocks are emitted at the top level with their children flattened
into ``props.children`` (an array of nested ``{block_type, props, children?}``
objects, matching the runtime expectations of LayoutBlock.tsx).
"""

from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from typing import Any

from dw_church_adapter.patterns.map import PATTERN_BLOCK_MAP, PatternBlock


# Block kinds — must match docs/block-mapping.md
LAYOUT_BLOCK_TYPES = frozenset(
    {"row", "columns", "tabs", "accordion",
     "layout_row", "layout_columns", "layout_section",
     "two_columns", "three_columns"}
)


_PLACEHOLDER_RE = re.compile(r"\{([^{}]+)\}")


@dataclass
class ExpandedSection:
    """A single top-level section ready for ``page_sections`` insert.

    For layout blocks, ``props`` contains a ``children`` key holding a
    flattened list of nested block dicts.
    """

    block_type: str
    props: dict[str, Any]


class PatternExpansionError(ValueError):
    """Raised on missing pattern, missing context variable, or invalid shape."""


def _substitute_string(value: str, context: dict[str, Any]) -> Any:
    """Replace {placeholder} occurrences in ``value`` using ``context``.

    - ``"{name}"`` (whole string is a single placeholder): return the raw
      context value (preserving its type — string, number, list, etc.).
    - ``"hello {name}"`` (mixed): return a string with text substitution.
    - Unknown placeholders are left as-is (Developer agent may fill later,
      e.g. ``{ai_image:hero}`` is resolved by the image generation step).

    AI image placeholders (``{ai_image:VARIANT}``, ``{ai_images:VARIANT[N-M]}``)
    are passed through unchanged — they are sentinel markers consumed by the
    Developer agent's image generation step before persistence.
    """
    # Whole-string placeholder?
    match = re.fullmatch(r"\{([^{}]+)\}", value)
    if match is not None:
        key = match.group(1)
        if key.startswith(("ai_image:", "ai_images:")):
            return value  # leave for Developer agent
        if key in context:
            return context[key]
        return value  # unknown — leave verbatim

    # Mixed string with embedded placeholders
    def replace(m: re.Match[str]) -> str:
        key = m.group(1)
        if key.startswith(("ai_image:", "ai_images:")):
            return m.group(0)  # leave verbatim
        if key in context:
            return str(context[key])
        return m.group(0)

    return _PLACEHOLDER_RE.sub(replace, value)


def _resolve(value: Any, context: dict[str, Any]) -> Any:
    """Recursively walk a value, substituting placeholders in strings."""
    if isinstance(value, str):
        return _substitute_string(value, context)
    if isinstance(value, dict):
        return {k: _resolve(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve(item, context) for item in value]
    return value


def _block_to_dict(block: PatternBlock, context: dict[str, Any]) -> dict[str, Any]:
    """Recursively convert a PatternBlock to the dict shape used in props.children."""
    props = _resolve(copy.deepcopy(block.props_template), context)
    out: dict[str, Any] = {
        "block_type": block.block_type,
        "props": props,
    }
    if block.children:
        if block.block_type not in LAYOUT_BLOCK_TYPES:
            raise PatternExpansionError(
                f"Non-layout block {block.block_type!r} has children — only layout "
                f"blocks may have children. See docs/block-mapping.md."
            )
        out["children"] = [_block_to_dict(c, context) for c in block.children]
    return out


def expand_pattern(
    pattern_name: str,
    context: dict[str, Any] | None = None,
) -> list[ExpandedSection]:
    """Expand a planner pattern into one or more page_sections payloads.

    Args:
        pattern_name: Key into PATTERN_BLOCK_MAP. e.g. ``"hero-section"``.
        context:      Variables for placeholder substitution (e.g.
                      ``{"site_name": "Acme", "tagline": "..."}``).

    Returns:
        A list of ExpandedSection — one per top-level PatternBlock entry.
        For layout blocks, children are flattened into ``props.children``.

    Raises:
        PatternExpansionError: unknown pattern_name or invalid shape.
    """
    if pattern_name not in PATTERN_BLOCK_MAP:
        raise PatternExpansionError(
            f"Unknown pattern {pattern_name!r}. "
            f"Known patterns: {sorted(PATTERN_BLOCK_MAP.keys())}"
        )

    ctx = context or {}
    sections: list[ExpandedSection] = []

    for block in PATTERN_BLOCK_MAP[pattern_name]:
        props = _resolve(copy.deepcopy(block.props_template), ctx)
        if block.children:
            if block.block_type not in LAYOUT_BLOCK_TYPES:
                raise PatternExpansionError(
                    f"Pattern {pattern_name!r} top-level block "
                    f"{block.block_type!r} has children but is not a layout block."
                )
            props["children"] = [_block_to_dict(c, ctx) for c in block.children]
        sections.append(ExpandedSection(block_type=block.block_type, props=props))

    return sections


__all__ = ["ExpandedSection", "PatternExpansionError", "expand_pattern"]
