"""Base agent class for the AI pipeline.

Each agent has a specific role in the website building process:
- Planner: Site structure and content strategy
- Designer: Visual design (theme.json + CSS)
- Developer: Block assembly (Gutenberg markup)
- QA: Validation and testing

Agents communicate through a shared project context (project.json + block-map.json).
Human-in-the-Loop: Each agent's output is presented to the user for approval before
the next agent starts.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AgentRole(str, Enum):
    PLANNER = "planner"
    DESIGNER = "designer"
    DEVELOPER = "developer"
    QA = "qa"


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentResult:
    """Result of an agent's work."""

    role: AgentRole
    status: AgentStatus
    output: dict[str, Any] = field(default_factory=dict)
    summary: str = ""
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class ProjectContext:
    """Shared context passed between agents."""

    business_description: str = ""
    site_name: str = ""
    pages: list[dict[str, Any]] = field(default_factory=list)
    theme_config: dict[str, Any] = field(default_factory=dict)
    block_map: dict[str, Any] = field(default_factory=dict)
    # `css_map` field removed (2026-05-22) — Designer used to ship per-block
    # CSS strings here but no downstream consumer applied them. Block code
    # is hardcode-free and pulls all visual specs from --brand-* tokens
    # emitted from theme_config; per-element overrides live in section
    # props (elementStyles / elementTags / elementVariants).
    seo_keywords: list[str] = field(default_factory=list)
    agent_results: dict[str, AgentResult] = field(default_factory=dict)


class AgentBase(ABC):
    """Abstract base class for all agents."""

    role: AgentRole

    def __init__(self, ai_service: Any = None) -> None:
        self._ai_service = ai_service

    @abstractmethod
    async def execute(self, context: ProjectContext) -> AgentResult:
        """Execute the agent's task.

        Args:
            context: Shared project context.

        Returns:
            AgentResult with the agent's output.
        """
        ...

    @abstractmethod
    def get_prompt(self, context: ProjectContext) -> str:
        """Build the AI prompt for this agent.

        Args:
            context: Shared project context.

        Returns:
            System prompt string for Claude API.
        """
        ...
