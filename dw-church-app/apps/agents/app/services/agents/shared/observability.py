"""Per-agent observability — counters + latency for every LLM call.

Logs each call as a structured line so Railway log search can filter by
agent name. Also keeps an in-memory counter for `/internal/agent-metrics`
to expose. Counters reset on container restart (acceptable — Railway
captures the structured logs).

Usage:
    with record_call("strategy_agent", model="claude-sonnet-4-6"):
        out = await llm_client.complete(...)

The context manager records latency_ms, marks success/failure, and
on exit emits one structured log line. Token counts (when the LLM
returns them in the response payload) are recorded via .add_tokens()
on the active record.
"""

from __future__ import annotations

import contextlib
import dataclasses
import logging
import time
from collections import defaultdict
from collections.abc import Iterator
from contextvars import ContextVar

logger = logging.getLogger(__name__)


@dataclasses.dataclass
class AgentMetrics:
    """Aggregate counters for one agent. Read by /internal/agent-metrics
    endpoints if exposed. Reset to zero on process start."""

    agent: str
    calls: int = 0
    successes: int = 0
    failures: int = 0
    total_latency_ms: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0

    @property
    def avg_latency_ms(self) -> float:
        return self.total_latency_ms / self.calls if self.calls else 0.0

    @property
    def success_rate(self) -> float:
        return self.successes / self.calls if self.calls else 0.0


_metrics: dict[str, AgentMetrics] = defaultdict(lambda: AgentMetrics(agent="?"))


def get_metrics(agent: str) -> AgentMetrics:
    """Return (and lazily create) the metrics record for `agent`."""
    if agent not in _metrics:
        _metrics[agent] = AgentMetrics(agent=agent)
    return _metrics[agent]


def all_metrics() -> dict[str, AgentMetrics]:
    """Snapshot of every agent's counters. Suitable for JSON-serializing
    via dataclasses.asdict in an /internal/agent-metrics handler."""
    return dict(_metrics)


@dataclasses.dataclass
class _CallRecord:
    """Mutable record for one in-flight call. Updated through the context
    var so the LLM client can attach token counts without threading them
    through every caller."""

    agent: str
    model: str
    started_at: float
    input_tokens: int = 0
    output_tokens: int = 0
    note: str = ""


_active: ContextVar[_CallRecord | None] = ContextVar("agent_call_record", default=None)


def add_tokens(input_tokens: int = 0, output_tokens: int = 0) -> None:
    """Attach token counts to the current call. No-op if no record is
    active (e.g. agent code called outside record_call)."""
    rec = _active.get()
    if rec is None:
        return
    rec.input_tokens += input_tokens
    rec.output_tokens += output_tokens


def add_note(note: str) -> None:
    """Attach a short freeform note to the current call's log line."""
    rec = _active.get()
    if rec is None:
        return
    rec.note = (rec.note + " | " + note).strip(" |") if rec.note else note


@contextlib.contextmanager
def record_call(agent: str, *, model: str = "") -> Iterator[_CallRecord]:
    """Context manager that times one LLM call and updates AgentMetrics.

    Emits one log line per call; successful calls log at INFO, failures at
    ERROR. Failure path still updates the metric (calls + failures) before
    re-raising so the caller's try/except logic doesn't double-record.
    """

    rec = _CallRecord(agent=agent, model=model, started_at=time.monotonic())
    token = _active.set(rec)
    metrics = get_metrics(agent)
    metrics.calls += 1
    success = False
    try:
        yield rec
        success = True
    finally:
        latency_ms = int((time.monotonic() - rec.started_at) * 1000)
        metrics.total_latency_ms += latency_ms
        metrics.total_input_tokens += rec.input_tokens
        metrics.total_output_tokens += rec.output_tokens
        if success:
            metrics.successes += 1
            logger.info(
                "agent_call agent=%s model=%s latency_ms=%d in_tokens=%d out_tokens=%d %s",
                agent,
                model,
                latency_ms,
                rec.input_tokens,
                rec.output_tokens,
                rec.note,
            )
        else:
            metrics.failures += 1
            logger.error(
                "agent_call_failed agent=%s model=%s latency_ms=%d %s",
                agent,
                model,
                latency_ms,
                rec.note,
            )
        _active.reset(token)
