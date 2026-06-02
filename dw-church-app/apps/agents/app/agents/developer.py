"""Developer Agent - True Light page assembly.

Takes Planner output (sitemap + sections per page) and persists it through
the BlockAdapter Protocol. Each section uses a planner pattern key from
dw_church_adapter.PATTERN_BLOCK_MAP (hero-section, features-grid, ...) which
is expanded by the adapter into one or more concrete block_type rows.
"""

from __future__ import annotations

from typing import Any

from app.adapters.base import BlockAdapter
from app.agents.base import (
    AgentBase,
    AgentResult,
    AgentRole,
    AgentStatus,
    ProjectContext,
)


class DeveloperAgent(AgentBase):
    """Persists Planner output into True Light's tenant schema."""

    role = AgentRole.DEVELOPER

    def __init__(self, adapter: BlockAdapter, ai_service: object = None) -> None:
        super().__init__(ai_service)
        self._adapter = adapter

    async def execute(self, context: ProjectContext) -> AgentResult:
        if not context.pages:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=["No pages in plan. Run Planner first."],
            )

        created_pages: list[str] = []
        created_sections: list[str] = []
        errors: list[str] = []

        # 1. Apply theme tokens FIRST so storefront renders the new
        # pages with the operator's intended palette / fonts on the
        # very first request after Designer ran. Without this, the
        # Designer agent's theme_config sat in ProjectContext but no
        # downstream consumer ever wrote it to the tenant's theme —
        # blocks rendered against the tenant's previous (or default)
        # tokens. See feedback-no-hardcoded-defaults: the tokens are
        # the single source of truth, so they must reach the tenant.
        if context.theme_config:
            try:
                await self._adapter.apply_design_system(context.theme_config)
            except Exception as e:  # noqa: BLE001
                # Don't abort the whole build — page assembly is still
                # useful even if theme apply fails. Operator can re-apply
                # via the theme panel afterwards. Surface the failure in
                # errors[] so QA / orchestrator see it.
                errors.append(f"Failed to apply theme tokens: {e}")

        site_context = self._build_site_context(context)

        for page_index, page_spec in enumerate(context.pages):
            try:
                page_id = await self._adapter.create_page(
                    title=page_spec["title"],
                    slug=page_spec["slug"],
                    is_home=(page_index == 0 or page_spec.get("is_home", False)),
                    status="published",
                    sort_order=page_index,
                )
                created_pages.append(page_id)
            except Exception as e:  # noqa: BLE001
                errors.append(
                    f"Failed to create page {page_spec.get('title', '?')}: {e}",
                )
                continue

            sort_order = 0
            for section_spec in page_spec.get("sections", []):
                pattern = section_spec.get("pattern") or "features-grid"

                # Per-section context = site context + section-level overrides.
                # Planner output is expected to populate keys like
                # ``feature_title``, ``cta_headline`` etc. at the section level.
                section_context: dict[str, Any] = {
                    **site_context,
                    **section_spec.get("context", {}),
                }

                try:
                    new_ids = await self._adapter.apply_pattern(
                        page_id=page_id,
                        pattern_name=pattern,
                        context=section_context,
                        starting_sort_order=sort_order,
                    )
                    created_sections.extend(new_ids)
                    sort_order += len(new_ids)
                except Exception as e:  # noqa: BLE001
                    errors.append(
                        f"Failed to apply pattern {pattern!r} on "
                        f"page {page_spec.get('title', '?')}: {e}",
                    )

        if errors and not created_pages:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                output={"created_pages": created_pages, "created_sections": created_sections},
                errors=errors,
            )

        summary = (
            f"Created {len(created_pages)} pages, {len(created_sections)} sections"
            + (f" ({len(errors)} errors)" if errors else "")
        )
        return AgentResult(
            role=self.role,
            status=AgentStatus.AWAITING_APPROVAL,
            output={
                "created_pages": created_pages,
                "created_sections": created_sections,
            },
            summary=summary,
            errors=errors,
        )

    def get_prompt(self, context: ProjectContext) -> str:
        return ""  # Developer agent does not call the LLM directly.

    @staticmethod
    def _build_site_context(context: ProjectContext) -> dict[str, Any]:
        """Pull top-level context vars from the shared ProjectContext."""
        return {
            "site_name": context.site_name,
            "tagline": (
                context.theme_config.get("tagline")
                or (context.seo_keywords[0] if context.seo_keywords else "")
            ),
        }
