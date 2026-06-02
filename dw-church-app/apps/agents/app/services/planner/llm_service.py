"""Unified LLM service — Claude + Gemini support.

Wraps both Anthropic Claude and Google Gemini APIs for the web planner pipeline.
"""

import asyncio
import json
import logging
import os
import random
import re

import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Status codes that indicate a transient error worth retrying — model
# overload (503), rate limiting (429), and the gateway-level 500/502/504.
# 4xx other than 429 are deterministic (bad request, auth, quota), so don't
# retry. 200 is the happy path.
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
# Total wait worst case: ~1 + ~2 + ~4 ≈ 7 seconds plus jitter. The httpx
# request itself has a 120s timeout, so end-to-end stays well under the
# admin-app planner timeout.


async def _post_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict,
    json_body: dict,
    label: str,
) -> httpx.Response:
    """POST that retries transient 5xx / 429 with exponential backoff + jitter.

    Returns the final Response (which may still be non-2xx if the upstream
    keeps failing). Caller decides what to do with the status. Network-level
    errors (httpx.RequestError) are also retried, then re-raised.
    """
    last_error: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            response = await client.post(url, headers=headers, json=json_body)
        except httpx.RequestError as err:
            last_error = err
            if attempt >= _MAX_RETRIES:
                logger.error(
                    f"{label} network error after {_MAX_RETRIES + 1} attempts: {err}"
                )
                raise
            backoff = (2 ** attempt) + random.uniform(0, 0.5)
            logger.warning(
                f"{label} network error (attempt {attempt + 1}/{_MAX_RETRIES + 1}), "
                f"retrying in {backoff:.1f}s: {err}"
            )
            await asyncio.sleep(backoff)
            continue

        if response.status_code not in _RETRYABLE_STATUS or attempt >= _MAX_RETRIES:
            return response

        backoff = (2 ** attempt) + random.uniform(0, 0.5)
        logger.warning(
            f"{label} transient {response.status_code} "
            f"(attempt {attempt + 1}/{_MAX_RETRIES + 1}), retrying in {backoff:.1f}s"
        )
        await asyncio.sleep(backoff)

    # Unreachable — loop returns or raises. Keeps mypy happy.
    if last_error:
        raise last_error
    raise RuntimeError(f"{label} retry loop exited without response")


async def call_claude(
    prompt: str,
    system: str = "",
    max_tokens: int = 4000,
    *,
    cache_system: bool = False,
) -> str:
    """Call Anthropic Claude API. Retries 429 / 5xx transients.

    cache_system: when True, the system prompt is sent with Anthropic's
    ephemeral prompt-caching marker (cache_control: {type: 'ephemeral'}).
    A cache write costs 1.25× the normal input rate; reads cost 0.1× —
    so for system prompts that are stable across multiple calls within
    a 5-minute window (e.g. StrategyAgent / InsightAgent on a single
    wizard run), this saves ~90% of the system-prompt tokens. The flag
    is opt-in because caching when the system prompt actually varies
    between calls would cost more than it saves.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    messages = [{"role": "user", "content": prompt}]
    body: dict = {
        "model": "claude-sonnet-4-6",
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        if cache_system:
            # The list form lets us attach cache_control. Anthropic
            # caches the marked block when the surrounding fingerprint
            # (model + tokens + auth) matches a recent call. The first
            # call writes (1.25× cost), subsequent reads are 0.1×.
            body["system"] = [{
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }]
        else:
            body["system"] = system

    async with httpx.AsyncClient(timeout=120) as client:
        response = await _post_with_retry(
            client,
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json_body=body,
            label="Claude",
        )

    if response.status_code == 429:
        raise ValueError("API rate limit — try again later")
    if response.status_code != 200:
        logger.error(f"Claude API error: {response.status_code}")
        raise ValueError(f"Claude API error ({response.status_code})")

    data = response.json()
    # When caching is on the response usage block exposes
    # cache_creation_input_tokens / cache_read_input_tokens. Logged at
    # INFO so cost-tracking dashboards can pick them up; we don't fail
    # if the keys are missing (older API versions or non-caching path).
    if cache_system:
        usage = data.get("usage") or {}
        cache_read = usage.get("cache_read_input_tokens", 0) or 0
        cache_write = usage.get("cache_creation_input_tokens", 0) or 0
        if cache_read or cache_write:
            logger.info(
                "Claude cache — read=%s write=%s in=%s out=%s",
                cache_read, cache_write,
                usage.get("input_tokens", 0), usage.get("output_tokens", 0),
            )
    return data["content"][0]["text"]


async def call_gemini(prompt: str, max_tokens: int = 4000, model: str = "gemini-2.5-flash") -> str:
    """Call Google Gemini API. Retries 503 (model overloaded) / 429 / 5xx.

    model 파라미터로 용도별 최적 모델 선택 가능:
    - 'gemini-2.5-flash-lite': 가장 가볍고 빠름. 프롬프트 바의 CSS/텍스트
      변환같이 단순 transformation 용. 토큰 단가도 최저.
    - 'gemini-2.5-flash' (기본): 균형형. 플래너/사이트 크롤러같이 추론이
      필요한 작업에 사용.
    - 'gemini-2.5-pro': 복잡한 reasoning. 보통 여기서는 사용 안 함.

    Gemini 2.5 series default to "thinking" mode which silently consumes
    from maxOutputTokens before any visible output. With max_tokens=1500
    (parse-business) the thinking budget can exhaust the whole quota and
    Gemini returns 400 with no candidates. Set thinkingBudget: 0 to disable
    thinking — we want fast, deterministic JSON / short text completions
    here, not chain-of-thought reasoning.

    BUT: gemini-2.5-pro REQUIRES thinking mode (Google rejects
    thinkingBudget=0 with "This model only works in thinking mode").
    Pro is reserved for ArchitectAgent (hierarchical IA) which actually
    benefits from chain-of-thought, so we leave its budget on the
    model's default rather than disabling. Only Flash + Flash-Lite get
    the budget-0 override.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    url = f"{GEMINI_API_URL}/{model}:generateContent"

    generation_config: dict = {"maxOutputTokens": max_tokens}
    # Disable thinking only on Flash/Flash-Lite 2.5. Pro 2.5 rejects
    # budget=0; gemini-1.5-* rejects the thinkingConfig key entirely.
    if model.startswith("gemini-2.5") and "pro" not in model.lower():
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}

    async with httpx.AsyncClient(timeout=120) as client:
        response = await _post_with_retry(
            client,
            url,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json_body={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": generation_config,
            },
            label=f"Gemini ({model})",
        )

    if response.status_code != 200:
        # 503 after retries usually means the model is genuinely overloaded
        # right now; surface a friendlier message so the SPA can show the
        # right CTA ("Gemini이 잠시 혼잡합니다 — 잠시 후 다시 시도해 주세요.").
        if response.status_code == 503:
            raise ValueError("Gemini 모델이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.")
        if response.status_code == 429:
            raise ValueError("Gemini API rate limit — try again later")
        # Surface Gemini's error body so the operator can see what went
        # wrong (e.g. "API key not valid", "model not found", "input too
        # long"). Without this every 4xx looked identical to "(400)" in
        # the SPA toast.
        detail = ""
        try:
            err_body = response.json()
            err_obj = err_body.get("error", {})
            msg = err_obj.get("message") or err_obj.get("status") or ""
            if msg:
                detail = f" — {str(msg)[:200]}"
        except Exception:  # noqa: BLE001 - truly opaque body, fall through
            text_body = (response.text or "")[:200]
            if text_body:
                detail = f" — {text_body}"
        raise ValueError(f"Gemini API error ({response.status_code}){detail}")

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        # Empty candidates with 200 = safety filter blocked or thinking
        # exhausted the budget. Pull promptFeedback if present so the
        # operator can see the cause.
        feedback = data.get("promptFeedback", {})
        block_reason = feedback.get("blockReason")
        if block_reason:
            raise ValueError(f"Gemini blocked the request: {block_reason}")
        raise ValueError("Gemini returned no content — try again or shorten the input.")
    parts = candidates[0].get("content", {}).get("parts", [])
    return parts[0].get("text", "") if parts else ""


async def call_llm(prompt: str, system: str = "", max_tokens: int = 4000, model: str = "claude") -> str:
    """Call LLM — auto-selects Claude or Gemini."""
    if model == "gemini":
        return await call_gemini(prompt, max_tokens)
    return await call_claude(prompt, system, max_tokens)


def extract_json(text: str) -> dict | list | None:
    """Extract JSON from LLM response (handles code fences and truncation)."""
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = re.sub(r"```\w*\n?", "", cleaned).strip()

    # Try object
    try:
        start = cleaned.index("{")
        end = cleaned.rindex("}") + 1
        return json.loads(cleaned[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    # Try array
    try:
        start = cleaned.index("[")
        end = cleaned.rindex("]") + 1
        return json.loads(cleaned[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    # Try repairing truncated JSON (common with token limits)
    repaired = _repair_truncated_json(cleaned)
    if repaired is not None:
        return repaired

    return None


def _repair_truncated_json(text: str) -> dict | list | None:
    """Attempt to repair truncated JSON by closing open brackets/braces."""
    # Find the JSON start
    obj_start = text.find("{")
    arr_start = text.find("[")
    if obj_start < 0 and arr_start < 0:
        return None

    start = min(
        obj_start if obj_start >= 0 else len(text),
        arr_start if arr_start >= 0 else len(text),
    )
    fragment = text[start:]

    # Walk backward to find the last valid structural character
    # then close any remaining open brackets/braces
    opens: list[str] = []
    in_string = False
    escape_next = False

    for ch in fragment:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\":
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in "{[":
            opens.append(ch)
        elif ch == "}" and opens and opens[-1] == "{":
            opens.pop()
        elif ch == "]" and opens and opens[-1] == "[":
            opens.pop()

    if not opens:
        return None  # Already balanced — parse failure is not due to truncation

    # Strip trailing incomplete values (partial strings, trailing commas)
    repaired = fragment.rstrip()
    # Remove trailing comma or colon that precedes a missing value
    repaired = re.sub(r'[,:\s]+$', '', repaired)

    # Close in reverse order
    for bracket in reversed(opens):
        repaired += "]" if bracket == "[" else "}"

    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        return None
