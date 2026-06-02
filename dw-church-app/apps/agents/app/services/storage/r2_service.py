"""Cloudflare R2 업로드 서비스 (S3-호환 API 사용).

사용자 제시 원칙: DB=Railway, 파일=R2. AI 이미지, 사용자 업로드 에셋 등
파일은 모두 R2 에 보관하고 DB 는 URL 만 유지.

필요 Env 변수 (Railway 에 이미 세팅되어 있다는 전제):
    R2_ENDPOINT_URL          - 'https://<account>.r2.cloudflarestorage.com'
    R2_BUCKET_NAME           - 버킷 이름
    R2_ACCESS_KEY_ID         - API token access key
    R2_SECRET_ACCESS_KEY     - API token secret
    R2_PUBLIC_URL            - 공개 base URL (예: https://pub-xxx.r2.dev
                               또는 custom domain). 이 + '/' + key = 최종 URL
(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 도 자동 fallback.)

r2_configured() 가 False 면 호출측은 legacy DB bytes 저장으로 fallback.
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

logger = logging.getLogger(__name__)

# boto3 는 runtime 시점에 import — 미설치 환경에서 module load 실패 방지
_boto3 = None
_botocore_exc = None


def _ensure_boto3() -> tuple[Any, Any] | None:
    global _boto3, _botocore_exc
    if _boto3 is None:
        try:
            import boto3 as _b3
            from botocore.exceptions import BotoCoreError, ClientError
            _boto3 = _b3
            _botocore_exc = (BotoCoreError, ClientError)
        except ImportError:
            logger.warning("boto3 not installed — R2 storage disabled")
            return None
    return _boto3, _botocore_exc


def r2_configured() -> bool:
    """환경변수 + boto3 가 모두 준비됐는지."""
    if _ensure_boto3() is None:
        return False
    endpoint = os.getenv("R2_ENDPOINT_URL") or os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET_NAME") or os.getenv("R2_BUCKET")
    key_id = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
    secret = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
    public = os.getenv("R2_PUBLIC_URL")
    return all([endpoint, bucket, key_id, secret, public])


class R2Service:
    """싱글톤 스타일 R2 업로더. S3-호환 endpoint 로 boto3.client 생성."""

    def __init__(self) -> None:
        imports = _ensure_boto3()
        if imports is None:
            raise RuntimeError("boto3 is not installed")
        boto3, _exc = imports

        self.endpoint = os.getenv("R2_ENDPOINT_URL") or os.getenv("R2_ENDPOINT", "")
        self.bucket = os.getenv("R2_BUCKET_NAME") or os.getenv("R2_BUCKET", "")
        self.public_url = (os.getenv("R2_PUBLIC_URL") or "").rstrip("/")
        if not all([self.endpoint, self.bucket, self.public_url]):
            raise RuntimeError("R2 env not configured")

        self._client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=(os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")),
            aws_secret_access_key=(os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")),
            region_name="auto",  # R2 요구사항
        )

    def _make_key(self, project_id: str | None, filename: str) -> str:
        """버킷 내 key 규칙: dw/{project_id}/<uuid>-<filename>. 충돌 방지 uuid prefix."""
        safe = filename.replace("/", "_").replace("\\", "_")[:120]
        prefix = f"dw/{project_id}" if project_id else "dw/_global"
        return f"{prefix}/{uuid.uuid4().hex[:8]}-{safe}"

    def upload_bytes(
        self,
        data: bytes,
        filename: str,
        *,
        project_id: str | None = None,
        mime: str | None = None,
        key: str | None = None,
    ) -> tuple[str, str]:
        """bytes 를 R2 에 업로드하고 (storage_key, 공개 URL) 튜플 반환.

        이전엔 URL만 반환했지만, True Light 의 Media Library 등록(POST
        /api/v1/internal/files/register-image)이 storage_key 를 별도
        컬럼으로 저장하기 위해 키도 함께 반환하도록 변경됐다. 호출자가
        URL만 필요하면 두 번째 원소만 사용하면 된다.

        key 인자가 제공되면 그 값을 그대로 사용한다 (테넌트 스코프
        경로 'tenant_<slug>/ai-images/...' 같이 호출자가 명시적으로
        조립한 경우). 미제공이면 기존 _make_key 동작 (project_id +
        uuid 접두사) 으로 폴백 — 레거시 호출자 호환.
        """
        final_key = key or self._make_key(project_id, filename)
        extra: dict[str, Any] = {}
        if mime:
            extra["ContentType"] = mime
        # R2 public bucket 기본 — 추가 ACL 불필요. custom public_url 로 서빙.
        self._client.put_object(Bucket=self.bucket, Key=final_key, Body=data, **extra)
        url = f"{self.public_url}/{final_key}"
        logger.info("R2 upload: %s → %s", filename, url)
        return final_key, url

    def delete_by_url(self, url: str) -> bool:
        """공개 URL 로부터 key 역추출해 삭제. public_url 접두 안 맞으면 False."""
        if not url.startswith(self.public_url + "/"):
            return False
        key = url[len(self.public_url) + 1:]
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            logger.warning("R2 delete failed for %s: %s", key, e)
            return False


_singleton: R2Service | None = None


def get_r2() -> R2Service | None:
    """싱글톤 인스턴스. 환경 미설정 시 None."""
    global _singleton
    if _singleton is not None:
        return _singleton
    if not r2_configured():
        return None
    try:
        _singleton = R2Service()
        return _singleton
    except Exception as e:
        logger.warning("R2 client init failed: %s", e)
        return None


__all__ = ["R2Service", "get_r2", "r2_configured"]
