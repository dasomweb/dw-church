"""True Light agents adapter — bridges DW-AI agents to apps/server."""

from dw_church_adapter.adapter import DWChurchAdapter, DWChurchAdapter
from dw_church_adapter.block_registry import (
    BLOCK_GROUPS,
    BLOCK_REGISTRY,
    BLOCK_TYPES,
    PALETTE_BLOCKS,
    get_ai_hint,
    get_canonical,
    get_default_props,
    is_known_block_type,
)
from dw_church_adapter.internal_api import InternalApiClient
from dw_church_adapter.patterns import (
    ExpandedSection,
    PATTERN_BLOCK_MAP,
    PatternBlock,
    PatternExpansionError,
    expand_pattern,
)

__all__ = [
    "DWChurchAdapter",
    "BLOCK_GROUPS",
    "BLOCK_REGISTRY",
    "BLOCK_TYPES",
    "DWChurchAdapter",  # backward-compat alias for DWChurchAdapter
    "ExpandedSection",
    "InternalApiClient",
    "PALETTE_BLOCKS",
    "PATTERN_BLOCK_MAP",
    "PatternBlock",
    "PatternExpansionError",
    "expand_pattern",
    "get_ai_hint",
    "get_canonical",
    "get_default_props",
    "is_known_block_type",
]

__version__ = "0.1.0"
