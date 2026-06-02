"""Specialized agent layer for the AI Website Planner.

Currently exposes the shared infrastructure (LLM client, retry policy,
observability, base agent class). Phase 2 will add domain-specific
agents (strategy, design, architect, copywriter) that build on this
foundation.

Existing planner endpoints in app/routers/planner.py continue to use
app/services/planner/llm_service.py directly; the new infrastructure
is additive and does NOT change behavior until a router is migrated
to use a specialized agent.
"""
