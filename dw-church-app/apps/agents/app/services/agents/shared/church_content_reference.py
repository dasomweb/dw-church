"""Authoritative church content canon (Dr. John Kwak, Church Planting LCCM 3354),
loaded from the two bundled markdown files next to this module:

  - church_planting_lectures.md   — the FULL lecture text (Part 1–…): the detailed
    theological / ministry source (calling, character [grace & truth], competency,
    biblical basis, NT church models, contextualization, assimilation, small groups,
    teams, stewardship, public worship, master plan, with Scripture exposition).
  - church_content_reference.md    — the consolidated reference + §13 web-content
    guide (Do/Don't + the §13.5 seven-point ship checklist) and appendices.

CHURCH_VOICE (church_voice.py) carries the §13 finishing rules + 7-point checklist.
This module exposes the full substance so the AI builder grounds copy in the actual
theology/ministry, not generic summaries.

Injected into the CACHED system block (cache_system=True) so repeated page
generations read it cheaply. It is large (~36K tokens combined) — that is the
cost of grounding every page in the full canon.
"""

from pathlib import Path


def _load(name: str) -> str:
    try:
        return (Path(__file__).with_name(name)).read_text(encoding="utf-8")
    except FileNotFoundError:  # pragma: no cover - md is bundled by the Dockerfile
        return ""


CHURCH_PLANTING_LECTURES = _load("church_planting_lectures.md")
CHURCH_CONTENT_REFERENCE = _load("church_content_reference.md")
# Send Network (SBC NAMB) church-planting models + core values + 9 essentials —
# the lens for tailoring strategy/content to the applicant church's planting
# type (standard / co-vocational / multi-site / multi-ethnic / replant / micro)
# and its priority ministry values.
CHURCH_SEND_NETWORK = _load("church_send_network.md")

# Combined canon injected into content-generation prompts.
CHURCH_CANON = (
    "########## CHURCH PLANTING LECTURES — FULL (theology & ministry source) "
    "##########\n"
    f"{CHURCH_PLANTING_LECTURES}\n\n"
    "########## CHURCH WEBSITE CONTENT REFERENCE (consolidated + §13 web guide & "
    "7-point ship checklist) ##########\n"
    f"{CHURCH_CONTENT_REFERENCE}\n\n"
    "########## SEND NETWORK — PLANTING MODELS, CORE VALUES, 9 ESSENTIALS "
    "(tailor by church type & priority values) ##########\n"
    f"{CHURCH_SEND_NETWORK}"
)
