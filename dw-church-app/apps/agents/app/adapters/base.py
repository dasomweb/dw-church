"""BlockAdapter — Protocol-typed interface used by Planner -> Developer -> QA.

The concrete implementation lives in packages/agents-adapter
(``dw_church_adapter.DWChurchAdapter``). Agents accept any object matching
this Protocol via duck typing — they do not import the concrete adapter
class, so the agents pipeline stays deployable independently of the
adapter wiring.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class BlockAdapter(Protocol):
    """Surface that Planner/Developer/QA agents rely on.

    All persistence calls go through this Protocol. Concrete implementations
    are responsible for:
      - Multi-tenant isolation (tenant_id baked in at construction)
      - Persisting page/section rows to the operational backend
      - Uploading AI-generated images to file storage
      - Applying Designer-produced theme tokens

    Method shape mirrors dw_church_adapter.DWChurchAdapter.
    """

    @property
    def tenant_id(self) -> str: ...

    # ── Pages ──
    async def create_page(
        self,
        *,
        title: str,
        slug: str,
        is_home: bool = False,
        status: str = "published",
        sort_order: int = 0,
    ) -> str: ...

    async def get_page(self, page_id: str) -> dict[str, Any]: ...

    async def list_pages(self) -> list[dict[str, Any]]: ...

    async def delete_page(self, page_id: str) -> None: ...

    # ── Sections ──
    async def create_section(
        self,
        *,
        page_id: str,
        block_type: str,
        props: dict[str, Any],
        sort_order: int,
        is_visible: bool = True,
    ) -> str: ...

    async def get_sections(self, page_id: str) -> list[dict[str, Any]]: ...

    async def update_section(self, section_id: str, **patch: Any) -> dict[str, Any]: ...

    async def delete_section(self, section_id: str) -> None: ...

    # ── Pattern expansion (high-level helper) ──
    async def apply_pattern(
        self,
        *,
        page_id: str,
        pattern_name: str,
        context: dict[str, Any] | None = None,
        starting_sort_order: int = 0,
    ) -> list[str]: ...

    # ── Theme ──
    async def apply_design_system(self, theme_config: dict[str, Any]) -> None: ...

    # ── Files ──
    async def upload_image(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        mime_type: str = "image/png",
        alt: str = "",
    ) -> str: ...
