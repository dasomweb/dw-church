"""원격 파일 저장소 — Cloudflare R2 (S3-호환)."""
from app.services.storage.r2_service import R2Service, get_r2, r2_configured

__all__ = ["R2Service", "get_r2", "r2_configured"]
