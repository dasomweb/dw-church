"""LLM client — uniform call shape across Anthropic Claude and Google Gemini.

Why this layer instead of using the existing call_claude / call_gemini
directly:

  - Per-agent model selection. Each agent declares ModelSpec describing
    the provider + model + max_tokens, so a single agent can A/B between
    Claude Sonnet and Gemini Flash by changing one constant.
  - Cost / latency observability via app.services.agents.shared.
    observability — every complete() call goes through record_call.
  - Single retry path (network-level retries already live in
    app.services.planner.llm_service; this client just delegates and
    layers schema-level retries on top — see retry.py).

This client wraps but does not replace app.services.planner.llm_service
yet. Existing planner.py routers continue to call call_claude/call_gemini
directly. Phase 2 specialized agents will use LLMClient instead.
"""

from __future__ import annotations

import dataclasses
from typing import Literal

from app.services.agents.shared.observability import add_tokens, record_call
from app.services.planner import llm_service

Provider = Literal["claude", "gemini"]


@dataclasses.dataclass(frozen=True)
class ModelSpec:
    """Declarative LLM choice for one agent. Frozen so an agent can't
    accidentally mutate the global default at runtime."""

    provider: Provider
    model: str = ""
    max_tokens: int = 4000
    # When True, Anthropic prompt caching is applied to the system
    # prompt — sends cache_control: {type: 'ephemeral'} on the system
    # block. Cache writes cost 1.25×, reads cost 0.1× — so for stable
    # system prompts reused across multiple calls within ~5 minutes
    # (Strategy + Insight on one wizard run), this saves ~90% of the
    # system-prompt tokens. Only applies to provider='claude'; Gemini
    # has its own caching API not yet integrated. Off by default
    # because caching a varying system prompt costs more than it saves.
    cache_system: bool = False

    def label(self) -> str:
        """Short identifier used in observability log lines."""
        suffix = "+cached" if self.cache_system else ""
        return f"{self.provider}:{self.model or 'default'}{suffix}"


@dataclasses.dataclass
class LLMRequest:
    """Input for one LLM call. Kept simple; agents that need messages /
    multi-turn can extend later — single-prompt is the only shape every
    current planner endpoint uses."""

    prompt: str
    system: str = ""
    spec: ModelSpec = dataclasses.field(
        default_factory=lambda: ModelSpec(provider="claude")
    )


@dataclasses.dataclass
class LLMResponse:
    """Raw text output. Token counts are best-effort — only filled for
    Claude (Anthropic returns usage); Gemini's usage payload is parsed
    when present and zero otherwise. Higher-level retry / parsing logic
    works on the .text only."""

    text: str
    input_tokens: int = 0
    output_tokens: int = 0


class LLMClient:
    """Single shared client. Agents inject this in their constructor so
    tests can swap in a fake (see tests/test_llm_client.py)."""

    def __init__(self) -> None:
        # Stateless — kept as a class so callers can swap the
        # implementation in tests without monkey-patching the module.
        pass

    async def complete(
        self,
        request: LLMRequest,
        *,
        agent: str,
    ) -> LLMResponse:
        """Run one LLM call. `agent` is the metric label (e.g.
        'strategy_agent') — used purely for observability.

        Network-level retries (429 / 5xx) happen inside llm_service.
        Schema-level retries (output failed pydantic validation) belong
        in retry.py and wrap this method.
        """

        with record_call(agent, model=request.spec.label()):
            if request.spec.provider == "claude":
                text = await llm_service.call_claude(
                    request.prompt,
                    system=request.system,
                    max_tokens=request.spec.max_tokens,
                    cache_system=request.spec.cache_system,
                )
            elif request.spec.provider == "gemini":
                text = await llm_service.call_gemini(
                    request.prompt,
                    max_tokens=request.spec.max_tokens,
                    model=request.spec.model or "gemini-2.5-flash",
                )
            else:
                # Unreachable once Provider literal narrows — defensive
                # for future hand-edited request objects.
                raise ValueError(f"Unknown LLM provider: {request.spec.provider}")

            # Token counts not yet plumbed through llm_service. When
            # call_claude/call_gemini start returning usage we'll forward
            # it; for now log a 0 so latency / call counts still record.
            add_tokens(input_tokens=0, output_tokens=0)
            return LLMResponse(text=text, input_tokens=0, output_tokens=0)
