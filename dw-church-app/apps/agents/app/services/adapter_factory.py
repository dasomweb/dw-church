"""Construct DWChurchAdapter instances from environment variables.

Isolated here so most of apps/agents/app/* doesn't import the dw_church_adapter
package directly (the agents/* modules use the BlockAdapter Protocol via
duck typing). This is the only module that wires concrete classes together.
"""

from __future__ import annotations

import os

from dw_church_adapter import DWChurchAdapter, InternalApiClient


class AdapterConfigError(RuntimeError):
    """Raised when env vars needed to construct DWChurchAdapter are missing."""


def build_adapter(*, tenant_id: str) -> DWChurchAdapter:
    """Construct a DWChurchAdapter scoped to ``tenant_id``.

    Reads from env:
      - SERVER_INTERNAL_URL  (default: http://localhost:3001)
      - INTERNAL_SERVICE_TOKEN  (required)
    """
    base_url = os.getenv("SERVER_INTERNAL_URL", "http://localhost:3001")
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not token:
        raise AdapterConfigError(
            "INTERNAL_SERVICE_TOKEN env var is required to talk to apps/server.",
        )

    api = InternalApiClient(
        base_url=base_url,
        service_token=token,
        tenant_id=tenant_id,
    )
    return DWChurchAdapter(api)
