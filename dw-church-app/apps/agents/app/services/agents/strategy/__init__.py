"""StrategyAgent — B2B marketing strategy + insight generation.

Owns two endpoints in the planner pipeline:
  - autoStrategy        — structured 7-field marketing posture decision
  - marketingInsight    — long-form 8-section local marketing analysis

Key design choices:
  - LLM: Claude Sonnet 4.x. Strategy quality directly affects what the
    operator can use; cheaper models hallucinate B2B framework names
    and produce shallow analyses. Sonnet > Opus here because the
    benefit is reasoning quality not raw creativity, and Sonnet is 5×
    cheaper.
  - Census API integration: every prompt receives the real US Census
    ACS 5-year snapshot for the business location. The system prompt
    instructs the agent to treat census data as ground truth and never
    hallucinate demographic numbers — this is the data-trust bar the
    user explicitly flagged.
"""

from app.services.agents.strategy.domain import (
    CensusSnapshot,
    InsightInput,
    MarketingInsight,
    StrategyDecision,
    StrategyInput,
)
from app.services.agents.strategy.strategy_agent import (
    InsightAgent,
    StrategyAgent,
)

__all__ = [
    "CensusSnapshot",
    "InsightAgent",
    "InsightInput",
    "MarketingInsight",
    "StrategyAgent",
    "StrategyDecision",
    "StrategyInput",
]
