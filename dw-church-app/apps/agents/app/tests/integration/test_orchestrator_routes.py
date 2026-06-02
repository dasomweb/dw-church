"""Integration tests for /api/agents/projects/{tenant_id}/* endpoints.

These exercise the HTTP surface the apps/server proxy talks to:

  POST /run      → starts a pipeline (requires Bearer service token + UUID tenant_id)
  GET  /status   → returns current orchestrator state
  POST /advance  → approves current stage; pipeline state advances
  POST /retry    → rejects current stage; same stage re-runs

The PlannerAgent runs without ANTHROPIC_API_KEY and falls back to the
deterministic _default_plan, which is why this test runs in CI without
network access. The DWChurchAdapter would otherwise call the apps/server
internal API; we stub it with a fake adapter so the Developer/QA stages
don't actually need a database.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

import app.routers.projects as projects_module
from app.main import app

VALID_TENANT_ID = "11111111-2222-3333-4444-555555555555"
TEST_TOKEN = "test-orchestrator-token-aaaaaaaaaaa"


class FakeAdapter:
    """Minimal in-memory BlockAdapter stand-in.

    Implements the methods the Developer + QA agents call against a real
    DWChurchAdapter: create_page, apply_pattern, list_pages, get_sections.
    Returns shapes the agents are happy with (page id strings, section dicts).
    """

    def __init__(self) -> None:
        self._pages: list[dict[str, Any]] = []
        self._sections: dict[str, list[dict[str, Any]]] = {}
        self._page_counter = 0

    async def create_page(self, *, title: str, slug: str, **_: Any) -> str:
        self._page_counter += 1
        page_id = f"page-{self._page_counter:03d}"
        self._pages.append({"id": page_id, "title": title, "slug": slug})
        self._sections.setdefault(page_id, [])
        return page_id

    async def apply_pattern(
        self,
        *,
        page_id: str,
        pattern_name: str,
        context: dict[str, Any],
        starting_sort_order: int,
    ) -> list[str]:
        sec_id = f"{page_id}-sec{starting_sort_order:02d}"
        self._sections[page_id].append(
            {"id": sec_id, "block_type": "stub_block", "props": {**context}},
        )
        return [sec_id]

    async def list_pages(self) -> list[dict[str, Any]]:
        return list(self._pages)

    async def get_sections(self, page_id: str) -> list[dict[str, Any]]:
        return self._sections.get(page_id, [])


@pytest.fixture(autouse=True)
def configure_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", TEST_TOKEN)
    # Force PlannerAgent / DesignerAgent into their default-plan path —
    # no Anthropic API key, no network.
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


@pytest.fixture(autouse=True)
def reset_registry(monkeypatch: pytest.MonkeyPatch) -> None:
    """Clear cross-test orchestrator state and inject a fake adapter."""
    projects_module._orchestrators.clear()
    monkeypatch.setattr(
        projects_module,
        "build_adapter",
        lambda *, tenant_id: FakeAdapter(),
    )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def auth_header(token: str = TEST_TOKEN) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    def test_missing_authorization_rejected(self, client: TestClient) -> None:
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale"},
        )
        assert r.status_code == 401

    def test_wrong_token_rejected(self, client: TestClient) -> None:
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale"},
            headers=auth_header("wrong-token"),
        )
        assert r.status_code == 401

    def test_unset_server_token_503(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale"},
            headers=auth_header(),
        )
        assert r.status_code == 503


class TestRun:
    def test_invalid_tenant_id(self, client: TestClient) -> None:
        r = client.post(
            "/api/agents/projects/not-a-uuid/run",
            json={"business_description": "..."},
            headers=auth_header(),
        )
        assert r.status_code == 400

    def test_missing_business_description(self, client: TestClient) -> None:
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={},
            headers=auth_header(),
        )
        assert r.status_code == 400

    def test_run_returns_planner_result(self, client: TestClient) -> None:
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale apparel", "site_name": "Acme"},
            headers=auth_header(),
        )
        assert r.status_code == 200
        body = r.json()
        assert body["tenant_id"] == VALID_TENANT_ID
        assert body["stage"] == "planning"
        assert body["result"]["role"] == "planner"
        assert body["result"]["status"] == "awaiting_approval"
        assert body["result"]["output"]["site_name"]


class TestStatus:
    def test_status_404_before_run(self, client: TestClient) -> None:
        r = client.get(
            f"/api/agents/projects/{VALID_TENANT_ID}/status",
            headers=auth_header(),
        )
        assert r.status_code == 404

    def test_status_after_run(self, client: TestClient) -> None:
        client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale"},
            headers=auth_header(),
        )
        r = client.get(
            f"/api/agents/projects/{VALID_TENANT_ID}/status",
            headers=auth_header(),
        )
        assert r.status_code == 200
        body = r.json()
        assert body["stage"] == "planning"


class TestAdvance:
    def test_full_pipeline_completes(self, client: TestClient) -> None:
        # Stage 1: planning → designing
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B wholesale"},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "planning"

        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/advance",
            json={},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "designing"

        # Stage 2: designing → developing
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/advance",
            json={},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "developing"

        # Stage 3: developing → qa_testing
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/advance",
            json={},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "qa_testing"

        # Stage 4: qa_testing → completed
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/advance",
            json={},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["completed"] is True


class TestRetry:
    def test_retry_keeps_stage(self, client: TestClient) -> None:
        client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/run",
            json={"business_description": "B2B"},
            headers=auth_header(),
        )
        r = client.post(
            f"/api/agents/projects/{VALID_TENANT_ID}/retry",
            json={"feedback": "be more specific"},
            headers=auth_header(),
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "planning"
