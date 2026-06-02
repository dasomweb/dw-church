"""Dynamic BLOCK CATALOG builder for the copywriter prompt.

The copywriter agent emits sections with a ``sectionType`` (planner
pattern name) — pattern_map.py then maps that to a real ``block_type``.
We inject the registry's description/tags/useCases for every
non-hidden, non-alias block into the cached system prompt so the LLM
can pick the right sectionType by *intent* (tags) rather than by
guessing from the name alone.

Why this lives here and not inline in copywriter_agent.py:
  - keeps the agent's prompt assembly readable (one constant + one
    function call instead of a 200-line inline catalog)
  - dedicates one place to tune catalog formatting / size for cache
    cost-benefit
  - lets tests pin the exact catalog format without instantiating the
    agent

Cache implications:
  ``CopywriterAgent.model_spec.cache_system=True``. The catalog is
  built from BLOCK_REGISTRY which is loaded from registry.json at
  import time, so the catalog string is stable across calls in a
  single process. Anthropic's ephemeral cache covers ~5 minutes; the
  catalog only invalidates when the JSON file changes (deploy time),
  not per-call.
"""

from __future__ import annotations

from collections.abc import Iterable

from dw_church_adapter.block_registry import (
    BLOCK_GROUPS,
    BLOCK_REGISTRY,
    get_description,
    get_tags,
    get_use_cases,
)

# ──────────────────────────────────────────────────────────────────
# Catalog formatting
# ──────────────────────────────────────────────────────────────────

# Stable group order. Mirrors the palette order in the admin app so
# the LLM sees blocks in the same conceptual sequence operators do.
_GROUP_ORDER = ("hero", "content", "media", "data", "conversion", "layout")

# Layout blocks (row / columns / accordion containers) are an
# implementation detail of the canvas, not a sectionType the
# copywriter should ever emit. Skipping them keeps the catalog
# focused on user-facing content blocks.
_SKIP_GROUPS = frozenset({"layout"})


def _ordered_block_types() -> Iterable[str]:
    """Yield non-hidden, non-alias block_types grouped by canonical
    order. Within a group, preserves registry.json insertion order
    (which is hand-curated to put canonical names before historical
    aliases) so the LLM's mental model matches the operator's."""
    for group in _GROUP_ORDER:
        if group in _SKIP_GROUPS:
            continue
        for block_type, definition in BLOCK_REGISTRY.items():
            if definition.get("group") != group:
                continue
            flags = definition.get("flags", {})
            if flags.get("isHidden") or flags.get("isAlias"):
                continue
            yield block_type


def _format_entry(block_type: str) -> str:
    """One catalog row: ``- block_type [tags] — description (예: usecases)``.

    Compact single-line format optimised for prompt density. Tags in
    brackets are English/kebab-case so the LLM can fuzzy-match an
    intent like "above-fold hero" or "social proof" without depending
    on the Korean description being exact.
    """
    tags = get_tags(block_type)
    description = (get_description(block_type) or "").strip()
    use_cases = get_use_cases(block_type)

    tag_str = f" [{', '.join(tags)}]" if tags else ""
    usecase_str = f" (예: {', '.join(use_cases)})" if use_cases else ""

    return f"- {block_type}{tag_str} — {description}{usecase_str}"


def build_block_catalog() -> str:
    """Build the full BLOCK CATALOG section for the copywriter system
    prompt. Groups blocks under their category header so the LLM can
    scan for "hero" / "conversion" / etc. when picking a sectionType.

    Returns the catalog as a single string (no leading/trailing
    newlines) ready to splice into the prompt.
    """
    lines: list[str] = []
    for group in _GROUP_ORDER:
        if group in _SKIP_GROUPS:
            continue
        # Filter group's blocks via _ordered_block_types so the same
        # skip rules (hidden/alias) apply consistently.
        block_types = [
            bt
            for bt in _ordered_block_types()
            if BLOCK_REGISTRY[bt].get("group") == group
        ]
        if not block_types:
            continue
        group_label = BLOCK_GROUPS.get(group, group)
        lines.append(f"## {group_label} ({group})")
        for bt in block_types:
            lines.append(_format_entry(bt))
        lines.append("")  # blank line between groups

    # Trim trailing blank line.
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


__all__ = ["build_block_catalog"]
