"""CopywriterAgent — page-content generation on Sonnet with prompt
caching. Used by the per-section AI button in the builder and the
wizard's per-page path.

See copywriter_agent.py for the cost / model / cache rationale.

Phase 2-5b (the bulk /content-map path with Phase A + Phase B parallel
batching) is intentionally NOT migrated here — content-map's prompt
is bigger, the asyncio.gather batching is delicate, and Phase A runs
on Gemini Flash which doesn't share infrastructure. Migrating it is a
separate exercise that builds on this PageContentAgent baseline.
"""

from app.services.agents.copywriter.copywriter_agent import PageContentAgent
from app.services.agents.copywriter.domain import (
    PageContentDecision,
    PageContentInput,
    PageContentMode,
    PageSection,
)

__all__ = [
    "PageContentAgent",
    "PageContentDecision",
    "PageContentInput",
    "PageContentMode",
    "PageSection",
]
