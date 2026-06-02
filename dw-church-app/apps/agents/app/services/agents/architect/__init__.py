"""ArchitectAgent — designs the wizard's site IA / sitemap on Gemini Pro.

Single most-leverage call in the post-Strategy pipeline: every
downstream agent (Copywriter, Build) regenerates from ArchitectAgent's
page list. A bad sitemap cascades into 10+ bad pages.

See architect_agent.py for the cost / model rationale.
"""

from app.services.agents.architect.architect_agent import ArchitectAgent
from app.services.agents.architect.domain import (
    SitemapDecision,
    SitemapInput,
)

__all__ = [
    "ArchitectAgent",
    "SitemapDecision",
    "SitemapInput",
]
