"""Pattern -> Block mapping.

Maps planner patterns (output of PlannerAgent) to compositions of True Light
block types (rendered by apps/web's BlockRenderer).

A planner pattern is a high-level section name like ``hero-section`` or
``features-grid``. Each pattern expands to one or more ``PatternBlock``
entries, which the Developer agent persists as ``page_sections`` rows via
``DWChurchAdapter.create_section()``.

Placeholders in ``props_template`` (e.g. ``{site_name}``, ``{ai_image:hero}``)
are filled in by the Developer agent using:
- planner output (page title, section title, copy, ...),
- Designer output (theme tokens),
- on-demand AI image generation (variant: hero|section|square).
"""

from dw_church_adapter.patterns.expand import (
    ExpandedSection,
    PatternExpansionError,
    expand_pattern,
)
from dw_church_adapter.patterns.map import PATTERN_BLOCK_MAP, PatternBlock

__all__ = [
    "ExpandedSection",
    "PATTERN_BLOCK_MAP",
    "PatternBlock",
    "PatternExpansionError",
    "expand_pattern",
]
