"""DesignAgent — generates the wizard's design-system menu (9 color
palettes + 6 font pairings + size/spacing/radius tokens) on Gemini
Flash. Output mirrors the storefront's theme.json contract.

See design_agent.py for the cost / model rationale.
"""

from app.services.agents.design.design_agent import DesignAgent
from app.services.agents.design.domain import (
    BorderRadius,
    ColorOption,
    ColorPalette,
    DesignDecision,
    DesignInput,
    FontOption,
    FontSizes,
    FontSizesPair,
    Spacing,
)

__all__ = [
    "BorderRadius",
    "ColorOption",
    "ColorPalette",
    "DesignAgent",
    "DesignDecision",
    "DesignInput",
    "FontOption",
    "FontSizes",
    "FontSizesPair",
    "Spacing",
]
