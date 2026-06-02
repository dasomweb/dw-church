"""Thin wrapper around the Anthropic SDK.

The agent classes (Planner, Designer) call ``self._ai_service._get_client()``
to obtain an ``AsyncAnthropic`` instance and then ``client.messages.create(...)``.
This module is the only place the SDK is imported, so swapping providers later
or stubbing the call in tests stays a one-file change.

Construction is lazy — the client is built on first use so an unset
ANTHROPIC_API_KEY does not crash module import (matters for tests and for
the FastAPI startup probe).
"""

from __future__ import annotations

import os
from typing import Any


class AIServiceConfigError(RuntimeError):
    """Raised when ANTHROPIC_API_KEY is missing at first use."""


class AIService:
    """Single-provider Anthropic Claude wrapper.

    Usage:
        svc = AIService()
        client = svc._get_client()
        await client.messages.create(...)
    """

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        if not self._api_key:
            raise AIServiceConfigError(
                "ANTHROPIC_API_KEY is not set — AI agents cannot run.",
            )
        # Imported lazily so the SDK is not pulled in for unit tests that
        # never call _get_client().
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=self._api_key)
        return self._client


def build_ai_service() -> AIService | None:
    """Return an AIService if ANTHROPIC_API_KEY is set, else None.

    The orchestrator treats ``None`` as "no AI" and the agents fall back
    to deterministic default outputs (PlannerAgent._default_plan,
    DesignerAgent._default_design). That keeps local dev and CI green
    without an API key.
    """
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    return AIService()
