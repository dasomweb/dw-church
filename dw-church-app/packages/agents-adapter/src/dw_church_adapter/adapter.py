"""DWChurchAdapter — concrete BlockAdapter for True Light.

Phase 4 implementation. Delegates persistence to ``InternalApiClient`` and
provides a high-level ``apply_pattern`` helper that uses ``expand_pattern``
to translate a planner pattern into one or more ``page_sections`` rows.

The Developer agent uses this adapter via duck typing — apps/agents
imports ``BlockAdapter`` (abstract base) for type hints, but does not
require this concrete class to inherit from it (cross-package import
boundary). Method shapes match ``apps/agents/app/adapters/base.py``.

The legacy name ``DWChurchAdapter`` is preserved as a backward-compat
alias at module export so older imports continue to work during the
True Light retarget.
"""

from __future__ import annotations

from typing import Any

from dw_church_adapter.internal_api import InternalApiClient
from dw_church_adapter.patterns import expand_pattern


class DWChurchAdapter:
    """Persists Planner -> Designer -> Developer agent output into True Light.

    All writes go through ``InternalApiClient`` -> apps/server (Fastify) ->
    PostgreSQL tenant schema. The adapter never touches the DB directly.
    """

    def __init__(self, api: InternalApiClient) -> None:
        self._api = api

    @property
    def tenant_id(self) -> str:
        return self._api.tenant_id

    # ── Page lifecycle ──────────────────────────────────────────

    async def create_page(
        self,
        *,
        title: str,
        slug: str,
        is_home: bool = False,
        status: str = "published",
        sort_order: int = 0,
    ) -> str:
        """Create a page. Returns the new page UUID."""
        page = await self._api.create_page(
            title=title,
            slug=slug,
            is_home=is_home,
            status=status,
            sort_order=sort_order,
        )
        page_id = page.get("id")
        if not page_id:
            raise RuntimeError(
                f"InternalApiClient.create_page returned no id: {page!r}"
            )
        return str(page_id)

    async def get_page(self, page_id: str) -> dict[str, Any]:
        """List pages and return the one matching ``page_id``."""
        for p in await self._api.list_pages():
            if str(p.get("id")) == page_id:
                return p
        raise LookupError(f"Page {page_id!r} not found")

    async def list_pages(self) -> list[dict[str, Any]]:
        return await self._api.list_pages()

    async def delete_page(self, page_id: str) -> None:
        await self._api.delete_page(page_id)

    # ── Section / block lifecycle ───────────────────────────────

    async def create_section(
        self,
        *,
        page_id: str,
        block_type: str,
        props: dict[str, Any],
        sort_order: int,
        is_visible: bool = True,
    ) -> str:
        """Create a single page_section. Returns the new section UUID."""
        section = await self._api.create_section(
            page_id=page_id,
            block_type=block_type,
            props=props,
            sort_order=sort_order,
            is_visible=is_visible,
        )
        section_id = section.get("id")
        if not section_id:
            raise RuntimeError(
                f"InternalApiClient.create_section returned no id: {section!r}"
            )
        return str(section_id)

    async def get_sections(self, page_id: str) -> list[dict[str, Any]]:
        return await self._api.list_sections(page_id)

    async def update_section(self, section_id: str, **patch: Any) -> dict[str, Any]:
        return await self._api.update_section(section_id, **patch)

    async def delete_section(self, section_id: str) -> None:
        await self._api.delete_section(section_id)

    # ── Pattern expansion (high-level developer helper) ─────────

    async def apply_pattern(
        self,
        *,
        page_id: str,
        pattern_name: str,
        context: dict[str, Any] | None = None,
        starting_sort_order: int = 0,
    ) -> list[str]:
        """Expand a planner pattern + create the resulting sections.

        Returns the list of new section UUIDs in insertion order.

        ``context`` keys substitute placeholders in ``props_template`` (see
        docs/block-mapping.md for the placeholder syntax). ``ai_image:*``
        placeholders pass through unchanged — the Developer agent must
        resolve them via ``upload_image`` before calling this method, OR
        leave them in for the renderer to handle on a future pass.
        """
        sections = expand_pattern(pattern_name, context or {})
        new_ids: list[str] = []
        for index, section in enumerate(sections):
            section_id = await self.create_section(
                page_id=page_id,
                block_type=section.block_type,
                props=section.props,
                sort_order=starting_sort_order + index,
            )
            new_ids.append(section_id)
        return new_ids

    # ── Theme ───────────────────────────────────────────────────

    async def apply_design_system(self, theme_config: dict[str, Any]) -> None:
        """Persist Designer agent output to the tenant's theme."""
        await self._api.apply_theme(theme_config)

    # ── Files ───────────────────────────────────────────────────

    async def upload_image(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        mime_type: str = "image/png",
        alt: str = "",  # accepted for interface parity; not yet stored
    ) -> str:
        """Upload an AI-generated image to R2. Returns the public URL."""
        del alt  # currently unused — kept for forward compat with BlockAdapter
        result = await self._api.upload_image(
            image_bytes=image_bytes,
            filename=filename,
            mime_type=mime_type,
        )
        url = result.get("url")
        if not url:
            raise RuntimeError(
                f"InternalApiClient.upload_image returned no url: {result!r}"
            )
        return str(url)


# Backward-compatible alias. Older code imports DWChurchAdapter; new code
# should use DWChurchAdapter. Both refer to the same class.
DWChurchAdapter = DWChurchAdapter
