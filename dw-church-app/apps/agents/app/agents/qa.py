"""QA Agent - Validation against the persisted True Light pages.

Checks:
  1. Every planned page actually got created (count + slug match)
  2. Each created page has at least one section
  3. Section block_types are non-empty strings (sanity)
  4. Designer theme_config was non-empty (catches a missing Designer step)
"""

from __future__ import annotations

from app.adapters.base import BlockAdapter
from app.agents.base import (
    AgentBase,
    AgentResult,
    AgentRole,
    AgentStatus,
    ProjectContext,
)


class QAAgent(AgentBase):
    role = AgentRole.QA

    def __init__(self, adapter: BlockAdapter, ai_service: object = None) -> None:
        super().__init__(ai_service)
        self._adapter = adapter

    async def execute(self, context: ProjectContext) -> AgentResult:
        checks_passed: list[str] = []
        warnings: list[str] = []
        errors: list[str] = []

        try:
            pages = await self._adapter.list_pages()
        except Exception as e:  # noqa: BLE001
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=[f"Failed to list pages: {e}"],
            )

        # ── 1. Page count + slug coverage ──
        planned_slugs = {p["slug"] for p in context.pages if "slug" in p}
        created_slugs = {p.get("slug") for p in pages if p.get("slug")}
        missing = planned_slugs - created_slugs
        if missing:
            errors.append(f"Planned pages missing in DB: {sorted(missing)}")
        else:
            checks_passed.append(
                f"All {len(planned_slugs)} planned page slugs present in DB",
            )

        # ── 2. Each page has at least one section + block_type sanity ──
        for page in pages:
            if page.get("slug") not in planned_slugs:
                continue
            try:
                sections = await self._adapter.get_sections(str(page.get("id")))
            except Exception as e:  # noqa: BLE001
                errors.append(
                    f"Failed to fetch sections for page {page.get('slug')!r}: {e}",
                )
                continue

            if not sections:
                warnings.append(
                    f"Page {page.get('slug')!r} has no sections — Developer "
                    f"agent likely failed silently for this page.",
                )
                continue

            empty_block_type = False
            for s in sections:
                bt = s.get("block_type") or s.get("blockType")
                if not isinstance(bt, str) or not bt:
                    errors.append(
                        f"Page {page.get('slug')!r} has a section with "
                        f"empty block_type",
                    )
                    empty_block_type = True
                    break
            if not empty_block_type:
                checks_passed.append(
                    f"Page {page.get('slug')!r} has {len(sections)} valid sections",
                )

            # Hard contract: last section must be cta_section. See
            # feedback-last-section-must-be-cta — user-blocking requirement.
            last_bt = sections[-1].get("block_type") or sections[-1].get("blockType")
            if last_bt != "cta_section":
                errors.append(
                    f"Page {page.get('slug')!r} last section is "
                    f"{last_bt!r}, must be 'cta_section'.",
                )

        # ── 3. Designer ran ──
        if not context.theme_config:
            warnings.append(
                "theme_config is empty — Designer agent did not run or "
                "produced no output.",
            )
        else:
            checks_passed.append("Designer theme_config present")

        status = AgentStatus.COMPLETED if not errors else AgentStatus.AWAITING_APPROVAL
        return AgentResult(
            role=self.role,
            status=status,
            output={
                "checks_passed": checks_passed,
                "warnings": warnings,
                "errors": errors,
            },
            summary=(
                f"QA: {len(checks_passed)} passed, "
                f"{len(warnings)} warnings, {len(errors)} errors"
            ),
            warnings=warnings,
            errors=errors,
        )

    def get_prompt(self, context: ProjectContext) -> str:
        return ""
