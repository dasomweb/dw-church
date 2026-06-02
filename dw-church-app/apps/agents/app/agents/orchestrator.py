"""Agent Orchestrator - Manages the Planner→Designer→Developer→QA pipeline.

Execution flow:
1. Planner generates site structure → User approves/modifies
2. Designer generates theme + CSS → User approves/modifies
3. Developer assembles WP pages → User approves/modifies
4. QA validates everything → User reviews report

Human-in-the-Loop: Each agent produces a result with status AWAITING_APPROVAL.
The orchestrator pauses and waits for user approval before proceeding.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.adapters.base import BlockAdapter
from app.agents.base import AgentResult, AgentRole, AgentStatus, ProjectContext
from app.agents.designer import DesignerAgent
from app.agents.developer import DeveloperAgent
from app.agents.planner import PlannerAgent
from app.agents.qa import QAAgent


class PipelineStage(str, Enum):
    NOT_STARTED = "not_started"
    PLANNING = "planning"
    DESIGNING = "designing"
    DEVELOPING = "developing"
    QA_TESTING = "qa_testing"
    COMPLETED = "completed"


@dataclass
class PipelineState:
    """Current state of the agent pipeline."""

    stage: PipelineStage = PipelineStage.NOT_STARTED
    context: ProjectContext = field(default_factory=ProjectContext)
    current_result: AgentResult | None = None
    history: list[AgentResult] = field(default_factory=list)


class AgentOrchestrator:
    """Orchestrates the 4-agent pipeline with human-in-the-loop."""

    def __init__(self, adapter: BlockAdapter, ai_service: Any = None) -> None:
        self._adapter = adapter
        self._ai_service = ai_service
        self._state = PipelineState()

        # Initialize agents
        self._agents = {
            AgentRole.PLANNER: PlannerAgent(ai_service),
            AgentRole.DESIGNER: DesignerAgent(ai_service),
            AgentRole.DEVELOPER: DeveloperAgent(adapter, ai_service),
            AgentRole.QA: QAAgent(adapter, ai_service),
        }

        self._stage_to_role = {
            PipelineStage.PLANNING: AgentRole.PLANNER,
            PipelineStage.DESIGNING: AgentRole.DESIGNER,
            PipelineStage.DEVELOPING: AgentRole.DEVELOPER,
            PipelineStage.QA_TESTING: AgentRole.QA,
        }

        self._stage_order = [
            PipelineStage.PLANNING,
            PipelineStage.DESIGNING,
            PipelineStage.DEVELOPING,
            PipelineStage.QA_TESTING,
        ]

    @property
    def state(self) -> PipelineState:
        return self._state

    @property
    def stage(self) -> PipelineStage:
        return self._state.stage

    async def start(self, business_description: str, site_name: str = "") -> AgentResult:
        """Start the pipeline with a business description.

        Args:
            business_description: What the business does.
            site_name: Optional site name.

        Returns:
            PlannerAgent result (awaiting approval).
        """
        self._state = PipelineState()
        self._state.context.business_description = business_description
        self._state.context.site_name = site_name
        self._state.stage = PipelineStage.PLANNING

        return await self._run_current_stage()

    async def approve_and_advance(self, modifications: dict | None = None) -> AgentResult | None:
        """Approve current stage result and advance to next stage.

        Args:
            modifications: Optional changes to apply before advancing.

        Returns:
            Next agent's result, or None if pipeline is complete.
        """
        if self._state.current_result is None:
            raise ValueError("No result to approve")

        # Apply modifications if provided
        if modifications:
            self._apply_modifications(modifications)

        # Mark current result as approved
        self._state.current_result.status = AgentStatus.APPROVED
        self._state.context.agent_results[self._state.current_result.role.value] = self._state.current_result
        self._state.history.append(self._state.current_result)

        # Advance to next stage
        current_idx = self._stage_order.index(self._state.stage)
        if current_idx + 1 >= len(self._stage_order):
            self._state.stage = PipelineStage.COMPLETED
            return None

        self._state.stage = self._stage_order[current_idx + 1]
        return await self._run_current_stage()

    async def reject_and_retry(self, feedback: str = "") -> AgentResult:
        """Reject current result and re-run the current agent.

        Args:
            feedback: Optional feedback for the agent.

        Returns:
            New result from the re-run agent.
        """
        if self._state.current_result:
            self._state.current_result.status = AgentStatus.REJECTED

        if feedback:
            self._state.context.business_description += f"\n\nAdditional feedback: {feedback}"

        return await self._run_current_stage()

    async def _run_current_stage(self) -> AgentResult:
        """Run the agent for the current pipeline stage."""
        role = self._stage_to_role.get(self._state.stage)
        if role is None:
            raise ValueError(f"No agent for stage: {self._state.stage}")

        agent = self._agents[role]
        result = await agent.execute(self._state.context)
        self._state.current_result = result
        return result

    def _apply_modifications(self, modifications: dict) -> None:
        """Apply user modifications to the context."""
        if "pages" in modifications:
            self._state.context.pages = modifications["pages"]
        if "theme_config" in modifications:
            self._state.context.theme_config = modifications["theme_config"]
        # `css_map` modification removed — ProjectContext no longer carries it.
        if "seo_keywords" in modifications:
            self._state.context.seo_keywords = modifications["seo_keywords"]

    def get_status(self) -> dict:
        """Get current pipeline status for the UI."""
        return {
            "stage": self._state.stage.value,
            "current_result": {
                "role": self._state.current_result.role.value,
                "status": self._state.current_result.status.value,
                "summary": self._state.current_result.summary,
                "output": self._state.current_result.output,
                "errors": self._state.current_result.errors,
                "warnings": self._state.current_result.warnings,
            } if self._state.current_result else None,
            "history": [
                {
                    "role": r.role.value,
                    "status": r.status.value,
                    "summary": r.summary,
                }
                for r in self._state.history
            ],
        }
