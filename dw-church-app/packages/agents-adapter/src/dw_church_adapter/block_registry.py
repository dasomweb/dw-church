"""Block registry loader — Python view of packages/blocks/src/registry.json.

The registry is the single source of truth for True Light's block_type
taxonomy. Both TypeScript (server / admin / storefront) and Python
(this package) read from the same JSON file so adding a block in one
place can't drift the other.

This module exposes:
    BLOCK_REGISTRY  - the raw dict (block_type -> metadata)
    BLOCK_TYPES     - set of every registered block_type
    PALETTE_BLOCKS  - block_types that should appear in the builder
                      palette (excludes isHidden + isAlias)

Public consumers should prefer the helpers (`is_known_block_type`,
`get_default_props`, `get_ai_hint`) over poking BLOCK_REGISTRY
directly so changes to the JSON shape are absorbed in one place.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

# Resolve the registry JSON across both layouts the package runs in:
#
#   1. Bundled (production / pip-installed):
#      site-packages/dw_church_adapter/registry.json
#      The wheel build copies packages/blocks/src/registry.json next
#      to this module so the installed package is self-contained — no
#      runtime dependency on the monorepo layout. Apps that pip-install
#      this adapter (e.g. apps/agents in its Docker container) hit this
#      path.
#
#   2. Dev (editable / monorepo source):
#      packages/agents-adapter/src/dw_church_adapter/block_registry.py
#      reaches up four parents to find the repo root, then descends
#      into packages/blocks/src/registry.json. Pytest in this package
#      and `pip install -e ../agents-adapter` from a sibling app both
#      land here.
#
# When neither path exists we fail loudly with both candidates in the
# message — silent degradation would let a stale taxonomy ship.
_THIS_FILE = pathlib.Path(__file__).resolve()
_BUNDLED_PATH = _THIS_FILE.parent / "registry.json"
_DEV_PATH = _THIS_FILE.parents[4] / "packages" / "blocks" / "src" / "registry.json" \
    if len(_THIS_FILE.parents) >= 5 else None


def _resolve_registry_path() -> pathlib.Path:
    if _BUNDLED_PATH.exists():
        return _BUNDLED_PATH
    if _DEV_PATH is not None and _DEV_PATH.exists():
        return _DEV_PATH
    candidates = [str(_BUNDLED_PATH)]
    if _DEV_PATH is not None:
        candidates.append(str(_DEV_PATH))
    raise FileNotFoundError(
        "Block registry JSON not found. Tried: " + ", ".join(candidates)
        + ". The wheel build is expected to copy packages/blocks/src/"
        + "registry.json next to this module; check pyproject.toml's "
        + "force-include section."
    )


def _load_registry() -> dict[str, Any]:
    path = _resolve_registry_path()
    with path.open(encoding="utf-8") as f:
        return json.load(f)


_RAW = _load_registry()

BLOCK_REGISTRY: dict[str, dict[str, Any]] = _RAW["blocks"]
BLOCK_GROUPS: dict[str, str] = _RAW["groups"]
BLOCK_TYPES: set[str] = set(BLOCK_REGISTRY.keys())

# Block_types the operator can reach via the builder palette. Mirrors
# packages/blocks/src/registry.ts::getPaletteBlocks().
PALETTE_BLOCKS: list[str] = [
    block_type
    for block_type, definition in BLOCK_REGISTRY.items()
    if not definition.get("flags", {}).get("isHidden")
    and not definition.get("flags", {}).get("isAlias")
]


def is_known_block_type(block_type: str) -> bool:
    """True if `block_type` is a registered block_type."""
    return block_type in BLOCK_REGISTRY


def get_default_props(block_type: str) -> dict[str, Any]:
    """Default props for a new instance of `block_type`. Empty if unknown."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return {}
    return dict(definition.get("defaultProps", {}))


def get_ai_hint(block_type: str) -> str | None:
    """One-line hint for the LLM prompt, if registered."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return None
    return definition.get("aiHint")


def get_description(block_type: str) -> str | None:
    """Korean prose explanation of when/where to use this block, if any."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return None
    return definition.get("description")


def get_tags(block_type: str) -> list[str]:
    """Intent keywords for fuzzy matching. Empty list if unset."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return []
    raw = definition.get("tags")
    if not isinstance(raw, list):
        return []
    return [str(t) for t in raw if isinstance(t, str)]


def get_use_cases(block_type: str) -> list[str]:
    """Concrete Korean use-case examples. Empty list if unset."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return []
    raw = definition.get("useCases")
    if not isinstance(raw, list):
        return []
    return [str(c) for c in raw if isinstance(c, str)]


def get_canonical(block_type: str) -> str:
    """Resolve aliases to their canonical block_type. Returns the input
    unchanged if it's not an alias (or unknown)."""
    definition = BLOCK_REGISTRY.get(block_type)
    if definition is None:
        return block_type
    if definition.get("flags", {}).get("isAlias") and definition.get("aliasOf"):
        return definition["aliasOf"]
    return block_type


__all__ = [
    "BLOCK_REGISTRY",
    "BLOCK_GROUPS",
    "BLOCK_TYPES",
    "PALETTE_BLOCKS",
    "is_known_block_type",
    "get_default_props",
    "get_ai_hint",
    "get_description",
    "get_tags",
    "get_use_cases",
    "get_canonical",
]
