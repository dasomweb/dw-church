"""Abstract base class for specialized agents.

A specialized agent in this codebase is a class that:
  1. Declares Pydantic input + output models (typed contract).
  2. Builds a prompt from input.
  3. Picks a ModelSpec (LLM provider + model + token budget).
  4. Calls LLMClient through SchemaRetryPolicy for automatic
     JSON-shape recovery.
  5. Reports through observability (latency / tokens / success rate).

Phase 2 will add concrete subclasses (StrategyAgent, DesignAgent,
ArchitectAgent, CopywriterAgent, BusinessAgent). Phase 1 just lands
the abstract scaffold so those can be added one at a time without
each reinventing this loop.

Example concrete agent (illustrative — actual ones come in Phase 2):

    class StrategyAgent(BaseAgent[StrategyInput, StrategyOutput]):
        name = "strategy_agent"
        model_spec = ModelSpec(provider="claude", model="...", max_tokens=3000)
        output_schema = StrategyOutput

        def system_prompt(self) -> str:
            return "You are a B2B marketing strategist..."

        def build_prompt(self, input: StrategyInput) -> str:
            return f"Business: {input.business_name}..."
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from pydantic import BaseModel

from app.services.agents.shared.llm_client import (
    LLMClient,
    LLMRequest,
    ModelSpec,
)
from app.services.agents.shared.retry import SchemaRetryPolicy

InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)


class BaseAgent(ABC, Generic[InputT, OutputT]):
    """Abstract specialized agent. Subclasses fill in name, model_spec,
    output_schema, system_prompt, and build_prompt. Everything else
    (retry, observability, LLM dispatch) is inherited.
    """

    # Subclass-set ---------------------------------------------------

    #: Identifier used in observability log lines (e.g. "strategy_agent").
    name: str = ""

    #: Provider + model + token budget for this agent's LLM calls.
    model_spec: ModelSpec

    #: Pydantic model for the structured output. SchemaRetryPolicy uses
    #: this to validate every LLM response.
    output_schema: type[OutputT]  # type: ignore[assignment]

    #: Schema-retry budget. 0 = no retry. 2 = up to 3 LLM calls per
    #: input. Defaults to 2 — token cost is bounded and silent JSON
    #: failures are the bug we're trying to prevent.
    max_schema_retries: int = 2

    # Subclass-implemented ------------------------------------------

    @abstractmethod
    def system_prompt(self) -> str:
        """Return the system-message text for this agent. Should be a
        domain-specific role (B2B strategist / brand designer / IA
        architect / copywriter / business analyst)."""

    @abstractmethod
    def build_prompt(self, input: InputT) -> str:
        """Compose the user prompt from typed input. Should embed every
        field the LLM needs and end with explicit JSON-shape guidance."""

    # Inherited ------------------------------------------------------

    def __init__(self, llm_client: LLMClient | None = None) -> None:
        # llm_client argument is optional so production code can call
        # AgentName() with no args and get a default client. Tests pass
        # a fake LLMClient so no network is touched.
        self.llm_client = llm_client or LLMClient()
        # Sanity check that the subclass filled in the required fields.
        if not self.name:
            raise TypeError(f"{type(self).__name__} must set `name`")
        if not hasattr(self, "model_spec"):
            raise TypeError(f"{type(self).__name__} must set `model_spec`")
        if not hasattr(self, "output_schema"):
            raise TypeError(f"{type(self).__name__} must set `output_schema`")

    async def run(self, input: InputT) -> OutputT:
        """Public entry point. Validates input is the declared schema
        type, builds the prompt, dispatches to the LLM with schema
        retries, and returns the validated output."""

        policy = SchemaRetryPolicy(max_retries=self.max_schema_retries)
        base_prompt = self.build_prompt(input)
        system = self.system_prompt()

        async def _call(extra_hint: str):
            return await self.llm_client.complete(
                LLMRequest(
                    prompt=base_prompt + extra_hint,
                    system=system,
                    spec=self.model_spec,
                ),
                agent=self.name,
            )

        return await policy.run(output_schema=self.output_schema, call=_call)
