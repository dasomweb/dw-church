"""Authoritative church-website content reference (Dr. John Kwak, Church
Planting LCCM 3354), loaded from the bundled markdown next to this module.

CHURCH_VOICE (church_voice.py) only carries the §13 do/don't + 7-point ship
checklist. That is the *finishing* guide. The actual theological / ministry
substance a church page should draw on lives in §1–§12 of this canon (biblical
basis, the NT church models, the four Kingdom competencies, grace+truth,
Ridley's marks, contextualization, assimilation models, small-group process,
F.A.T. teams, support, location, public-worship elements, master plan).

Inject CHURCH_CONTENT_REFERENCE into the content-generation system prompt so
the AI builder grounds copy in this canon instead of staying at the level of
generic summaries. It's large (~the full doc); keep it in the CACHED system
block (cache_system=True) so repeated page generations read it cheaply.
"""

from pathlib import Path

_REF_PATH = Path(__file__).with_name("church_content_reference.md")

try:
    CHURCH_CONTENT_REFERENCE = _REF_PATH.read_text(encoding="utf-8")
except FileNotFoundError:  # pragma: no cover - md is bundled by the Dockerfile
    CHURCH_CONTENT_REFERENCE = ""
