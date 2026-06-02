"""Shared infrastructure used by every specialized agent.

  llm_client     — Anthropic / Gemini client, per-call model selection
  retry          — JSON-shape retry layer on top of network retry
  observability  — per-agent latency / token / outcome counters
  base_agent     — abstract BaseAgent[InputT, OutputT] with run()

Specialized agents (Phase 2) compose these — they don't reimplement any
of it. The classic planner.py handlers can also adopt them piece-by-
piece without a full rewrite (e.g. wrap an existing call_llm site with
LLMClient.complete to gain observability).
"""

from app.services.agents.shared.base_agent import BaseAgent
from app.services.agents.shared.llm_client import (
    LLMClient,
    LLMRequest,
    LLMResponse,
    ModelSpec,
)
from app.services.agents.shared.observability import (
    AgentMetrics,
    record_call,
)
from app.services.agents.shared.retry import (
    SchemaRetryPolicy,
    SchemaValidationError,
)

__all__ = [
    "AgentMetrics",
    "BaseAgent",
    "LLMClient",
    "LLMRequest",
    "LLMResponse",
    "ModelSpec",
    "SchemaRetryPolicy",
    "SchemaValidationError",
    "record_call",
]
