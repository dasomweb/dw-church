"""True Light — AI Agents service (FastAPI).

Currently exposes:
  GET  /health           — liveness probe
  POST /api/agents/plan  — Planner agent (sitemap from business description)

Coming in Phase 4:
  POST /api/agents/projects/{tenant_id}/run        — full pipeline
  GET  /api/agents/projects/{tenant_id}/status     — pipeline status
  POST /api/agents/projects/{tenant_id}/images     — AI image generation
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import planner, projects

app = FastAPI(
    title="True Light Agents",
    description="AI agent pipeline: Planner -> Designer -> Developer -> QA. "
                "Persists results to the dw-church-api Fastify server via internal HTTP.",
    version="0.1.0",
)

# CORS — allowlist via env var. Default to local dev origins only.
# Production: set CORS_ORIGINS to "https://admin.truelight.app,https://api.truelight.app".
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3002,http://localhost:3003")
allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(planner.router)
app.include_router(projects.router)


@app.get("/health")
async def health_check() -> dict:
    """Liveness probe. Returns service identity + version."""
    return {
        "status": "ok",
        "service": "dw-church-agents",
        "version": "0.1.0",
    }
