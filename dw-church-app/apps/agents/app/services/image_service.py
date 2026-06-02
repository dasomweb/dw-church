"""AI Image Generation Service — Gemini Image API.

각 섹션의 (heading + paragraph) + 페이지 전체 공통 style guide를
조합해 prompt를 만들고 Gemini의 image preview 모델에 호출.

설계 포인트:
- variant별 사이즈: hero(1920x1080) / section(1280x800) / square(1024x1024)
- 일괄 생성 시 같은 style descriptor를 모든 이미지에 prefix로 주입 →
  컬러 팔레트, photography mood, lighting이 페이지 전반에 통일됨.
- 결과는 DB에 bytes로 저장 후 우리 backend의 /api/images/{id}로 serve.
- Gemini가 다양한 사이즈 직접 지원 안 하면 prompt에 사이즈 hint를 넣고
  결과를 그대로 사용 (1024x1024가 모델 기본일 수 있음).
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

ImageVariant = Literal[
    "hero", "section", "square",
    # 후속 추가 — AI 이미지 운영계획서의 비율 매트릭스
    # (hero_mobile=9:16 / banner_wide=21:9 / product_card=1:1 /
    #  product_detail=4:5)
    "hero_mobile", "banner_wide", "product_card", "product_detail",
]

# Generation mode — 운영계획서의 핵심 정책 분기.
# - "space": 공간(사업장) 이미지 — 실제 건물 구조 보존이 신뢰성 핵심.
#   카메라 각도 / 조명 / 시간대 / 색감 변경만 허용. 벽 이동, 창문 위치
#   변경, 가구 구조 변경, 가짜 공간 생성 등은 금지.
# - "product": 제품 이미지 — 제품 형태 / 색상 / 로고 / 패키지 / 재질
#   유지. 라이프스타일/광고 컨텍스트로 재배치 OK.
# - None (기본): 정책 prefix 없이 일반 prompt.
ImageMode = Literal["space", "product"]

# Gemini 이미지 모델 — production ListModels로 검증된 정확한 이름.
# 사용자 지정: "Gemini 3 Flash Image" = gemini-3.1-flash-image-preview
GEMINI_IMAGE_MODELS = [
    "gemini-3.1-flash-image-preview",  # ★ 사용자 우선 — 빠르고 신상
    "gemini-3-pro-image-preview",      # 더 좋은 품질, 상대적으로 느림
    "gemini-2.5-flash-image",          # 안정적 fallback
]

# Imagen 모델 — production ListModels로 검증된 정확한 이름.
# aspect ratio 정확 지원 (16:9, 4:3, 1:1 등). Hero/Section에 최적.
IMAGEN_MODELS = [
    "imagen-4.0-generate-001",       # 검증된 기본 (현재 동작 중)
    "imagen-4.0-ultra-generate-001", # 최고 품질, 느림
    "imagen-4.0-fast-generate-001",  # 빠름, 품질 약간 낮음
]

# Gemini 3 Flash Image 후보만 따로 — 사용자 명시 우선.
GEMINI3_PREFIX = [m for m in GEMINI_IMAGE_MODELS if m.startswith("gemini-3")]

# variant → 선호 모델 chain. 첫 성공 모델이 _working_models[variant]에 캐시.
#
# 우선순위 정책:
# - hero/section/banner_wide: Gemini 3 Flash Image (사용자 우선) → 만약
#   응답이 부족한 사이즈/aspect면 다음 호출에선 Imagen 4로 자동 fallback.
# - square/product_card: Gemini (1:1 자연 매칭)
# - product_detail (4:5): Imagen이 정확한 비율 보장에 강해서 우선
# - hero_mobile (9:16): Imagen이 9:16 정식 지원
_HERO_LIKE = GEMINI3_PREFIX + IMAGEN_MODELS + [m for m in GEMINI_IMAGE_MODELS if m not in GEMINI3_PREFIX]
_PRODUCT_LIKE = IMAGEN_MODELS + GEMINI_IMAGE_MODELS

VARIANT_MODEL_CHAIN: dict[str, list[str]] = {
    "hero":           _HERO_LIKE,
    "section":        _HERO_LIKE,
    "square":         GEMINI_IMAGE_MODELS + IMAGEN_MODELS,
    # 신규 비율 ↓
    "hero_mobile":    _HERO_LIKE,           # 9:16
    "banner_wide":    _HERO_LIKE,           # 21:9
    "product_card":   GEMINI_IMAGE_MODELS + IMAGEN_MODELS,  # 1:1
    "product_detail": _PRODUCT_LIKE,        # 4:5 — Imagen이 정확한 비율 더 잘 지킴
}

# variant → Imagen aspect ratio
# Imagen 공식 지원: 1:1, 3:4, 4:3, 9:16, 16:9. 21:9 / 4:5는 정식 지원
# 아니라 가장 가까운 ratio로 대체 (4:5 → 3:4, 21:9 → 16:9). 모델이 정확한
# 사이즈를 보장하지 않으므로 prompt aspect hint와 함께 강제.
VARIANT_ASPECT: dict[str, str] = {
    "hero":           "16:9",
    "section":        "4:3",
    "square":         "1:1",
    "hero_mobile":    "9:16",
    "banner_wide":    "16:9",  # Imagen 21:9 미지원 → 가장 가까운 16:9 + prompt hint
    "product_card":   "1:1",
    "product_detail": "3:4",   # Imagen 4:5 미지원 → 가장 가까운 3:4 (포트레잇)
}

_working_models: dict[str, str] = {}  # variant → 첫 성공 모델 캐시


def get_working_model(variant: str | None = None) -> str | dict[str, str] | None:
    """현재 캐시된 동작 모델 — 디버그/관측용."""
    if variant:
        return _working_models.get(variant)
    return dict(_working_models) if _working_models else None


def _gemini_url(model: str) -> str:
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )


def _imagen_url(model: str) -> str:
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:predict"
    )

# 변형별 사이즈 + aspect 가이드 (모델이 정확한 픽셀 사이즈를 보장하지 않을
# 수 있어 텍스트 hint로 강조)
VARIANT_SPECS: dict[str, dict] = {
    "hero": {
        "width": 1920,
        "height": 1080,
        "aspect": "16:9 wide cinematic landscape, full-bleed background",
    },
    "section": {
        "width": 1280,
        "height": 800,
        "aspect": "8:5 landscape, mid-shot, leaves room for adjacent text",
    },
    "square": {
        "width": 1024,
        "height": 1024,
        "aspect": "1:1 square, balanced composition",
    },
    # ── AI 이미지 운영계획서의 신규 비율 ──────────────────────────
    "hero_mobile": {
        "width": 1080,
        "height": 1920,
        "aspect": "9:16 vertical mobile-first hero, full-bleed background, "
                  "subject centered with breathing room above and below for "
                  "overlay text",
    },
    "banner_wide": {
        "width": 2560,
        "height": 1080,
        "aspect": "21:9 ultra-wide cinematic banner, panoramic composition, "
                  "subject distributed horizontally — empty negative space "
                  "left or right for headline overlay",
    },
    "product_card": {
        "width": 1080,
        "height": 1080,
        "aspect": "1:1 square product shot, single focal product, clean "
                  "neutral background, eye-level angle suitable for grid "
                  "thumbnails",
    },
    "product_detail": {
        "width": 1080,
        "height": 1350,
        "aspect": "4:5 vertical portrait product hero, premium commercial "
                  "shot, subject fills upper 70%, lifestyle context allowed",
    },
}

# Hard rule applied to every generation. Gemini's image models tend to
# hallucinate labels, menu boards, packaging text, and storefront signs
# unless explicitly forbidden — and once any text appears in the output,
# operators can't use the image (the wrong words show through to live
# customers). This is enforced at the prompt level because the
# generation models don't have a post-filter for "no text".
#
# Wording strategy (revised after user reports that text was still
# leaking through despite the previous rule):
#   1. Lead with positive framing ("produce a photograph without...")
#      because diffusion models attend to the *content* of negative
#      prompts. "Do not render text" can paradoxically prime "text".
#   2. Use the word "MUST" — Gemini/Imagen weight imperative wording
#      higher than "should/avoid".
#   3. Cover the "reference contains text → output mimics text" path
#      explicitly. With image-to-image (space/product policy + refs),
#      the model otherwise copies signage from the reference.
#   4. Keep it short. Long lists of forbidden text categories
#      sometimes prime the model toward those categories. One sweep
#      ("any letters, numbers, glyphs in any language") + one
#      reference-handling clause is more effective than enumerating
#      30 categories.
NO_TEXT_RULE = (
    "ABSOLUTE RULE — produce a clean photograph with ZERO visible text. "
    "The output MUST NOT contain any letters, numbers, glyphs, words, or "
    "characters in any language. Any signage, labels, posters, menus, "
    "packaging copy, screens, books, or t-shirt graphics that appear in "
    "the frame MUST be rendered blank, abstract, or so blurred they are "
    "unreadable — never legible. If a reference image contains visible "
    "text, DO NOT reproduce or imitate that text in the output. This "
    "rule overrides every other instruction."
)

# Short reminder used at the END of the prompt as a re-anchor. Models
# weight the final tokens slightly higher when generating; one short
# repetition catches the "I forgot the constraint mid-generation" case
# without paying for the full rule twice.
_NO_TEXT_TAIL = "Reminder: output MUST be free of any readable text or glyphs."

# 모든 이미지에 공통 적용되는 quality / 통일성 룰. brand_scenes 모듈의
# MASTER_RULE 정신을 가져온 축약본. NO_TEXT_RULE은 별도로 prompt 맨
# 앞에 prepend되므로 여기서는 quality만 다룬다 (중복 제거).
QUALITY_RULES = (
    "Photographic, real-world quality. Consistent natural lighting. "
    "Clean and grain-free. No plastic skin, no over-sharpening, no HDR, "
    "no CGI look. Subjects naturally integrated within environment, "
    "same light source on all elements. Realistic textures and materials."
)


# ─── Mode-aware policy prefixes ─────────────────────────────────
# 운영계획서의 두 줄기. reference 이미지가 함께 첨부되었을 때 가장
# 효과적이다 (image-to-image). reference 없이 mode만 주어진 경우엔
# 정책의 정신을 prompt에 명시해두는 정도로만 작동.

_SPACE_POLICY_PREFIX = (
    "[SPACE / VENUE PHOTOGRAPHY POLICY — STRICT]\n"
    "This image depicts a real, existing place of business. The reference "
    "photograph(s) attached are the SOURCE OF TRUTH for the architecture, "
    "interior layout, materials, fixtures, signage, branding, and colors of "
    "this venue.\n"
    "REQUIRED — preserve exactly:\n"
    "  • Same building / room / space — do NOT generate a new venue\n"
    "  • Same wall positions, window positions, door positions, ceiling shape\n"
    "  • Same furniture layout, fixtures, equipment, materials\n"
    "  • Same colors, finishes, surfaces, textures\n"
    "  • Same brand identity (signs, logos, colors) if visible\n"
    "ALLOWED — variations to make a website-ready photograph:\n"
    "  • Alternate camera angle / perspective from within the same space\n"
    "  • Different time of day, lighting mood (warm/cool, dawn/midday/dusk)\n"
    "  • Cinematic tone, shallow depth of field, color grading\n"
    "  • Add or remove people naturally (customers, staff at work)\n"
    "  • Tidy minor clutter; light staging\n"
    "FORBIDDEN — never do these:\n"
    "  • Move or invent walls, windows, doors\n"
    "  • Replace furniture style or rearrange the room layout\n"
    "  • Generate a venue that does not match the reference\n"
    "  • Heavy interior re-design or material swaps\n"
    "Result must read as 'photographed moments later, from a different angle, "
    "in the same business' — never 'a different place'."
)

_PRODUCT_POLICY_PREFIX = (
    "[PRODUCT / COMMERCIAL PHOTOGRAPHY POLICY — STRICT]\n"
    "This image showcases a real product. The reference photograph(s) "
    "attached are the SOURCE OF TRUTH for the product itself.\n"
    "REQUIRED — preserve exactly:\n"
    "  • Identical product shape, silhouette, proportions\n"
    "  • Identical color, finish, material texture of the product\n"
    "  • Identical logo, brand mark, packaging, label artwork\n"
    "  • Identical key visual details (buttons, seams, vents, openings)\n"
    "ALLOWED — variations for premium commercial photography:\n"
    "  • New lifestyle / use-case scene around the product\n"
    "  • Different background, environment, props, hands or models using it\n"
    "  • Different lighting, composition, depth of field\n"
    "  • Cinematic / advertising mood\n"
    "FORBIDDEN — never do these:\n"
    "  • Change the product's shape, proportions, or branding\n"
    "  • Substitute a similar-looking product\n"
    "  • Distort the logo or repaint the packaging\n"
    "Result must read as 'the same physical product, in a new ad scene' — "
    "never 'a redesigned or generic version'."
)


def _mode_prefix(mode: str | None, has_reference: bool) -> str:
    """Return the policy-prefix block for the requested mode, or "".

    When mode is set but no reference is attached, we still prepend the
    policy as soft guidance — the model can't compare against a master
    image but the rule wording often nudges it away from obvious
    violations (e.g. "do not generate a different venue").
    """
    if mode == "space":
        if has_reference:
            return _SPACE_POLICY_PREFIX
        # 참고 사진이 없는 space mode — soft guidance만.
        return (
            "[SPACE / VENUE PHOTOGRAPHY GUIDANCE]\n"
            "This image should depict a believable real venue. Avoid generic "
            "stock-photo composites. Cohesive interior with consistent "
            "materials, plausible architecture, no surreal scale jumps."
        )
    if mode == "product":
        if has_reference:
            return _PRODUCT_POLICY_PREFIX
        return (
            "[PRODUCT / COMMERCIAL PHOTOGRAPHY GUIDANCE]\n"
            "Premium commercial product photography. Single hero subject, "
            "clean composition, lifestyle context optional. Avoid generic "
            "stock-photo look."
        )
    return ""


def build_style_descriptor(design_system: dict, business: dict | None = None) -> str:
    """페이지/사이트 전체에 공통 적용할 style guide 한 단락.

    이걸 모든 일괄 생성 prompt에 prefix로 넣으면 컬러·톤·분위기가 통일됨.
    """
    colors = (design_system or {}).get("selectedColors") or {}
    primary = colors.get("primary")
    accent = colors.get("accent")
    bg = colors.get("background")

    # business info 추출
    biz = business or {}
    industry = biz.get("industry") or ""
    brand = biz.get("brandKeywords") or ""

    parts = ["Brand visual style guide:"]
    if industry:
        parts.append(f"Industry: {industry}.")
    if brand:
        parts.append(f"Brand mood/keywords: {brand}.")
    if primary or accent:
        ctones = ", ".join([c for c in [primary, accent, bg] if c])
        parts.append(
            f"Color palette tones: {ctones} — composition should harmonize with these hues."
        )
    parts.append(
        "Cohesive photography style across all images: same color grading, "
        "same lighting temperature, same realism level — pages should look like "
        "they were shot for one campaign."
    )
    return " ".join(parts)


def build_section_prompt(
    *,
    variant: ImageVariant,
    section_text: str,
    style_descriptor: str,
    extra_hint: str = "",
) -> str:
    """단일 섹션의 최종 prompt 조립.

    section_text는 그 섹션의 heading + paragraph 결합. 그것이 이미지의
    의미적 중심이 됨.
    """
    spec = VARIANT_SPECS.get(variant, VARIANT_SPECS["section"])
    role = (
        "Hero background image — atmospheric, immersive, suitable for overlaying text on top."
        if variant == "hero"
        else (
            "Section accompaniment image — conceptual visual that supports the heading and paragraph."
            if variant == "section"
            else "Card-style image — single focal subject, balanced composition."
        )
    )

    # NO_TEXT_RULE leads + trailing tail reminder — same sandwich
    # pattern as generate_image_bytes. build_section_prompt is the
    # legacy single-section helper; if a caller passes the result of
    # this directly into Gemini/Imagen without going through
    # generate_image_bytes, we still want the constraint front-loaded.
    user_prompt_parts = [
        NO_TEXT_RULE,
        style_descriptor,
        f"Image purpose: {role}",
        f"Aspect/format: {spec['aspect']}.",
        f"Subject and meaning: {section_text.strip() or 'Generic brand visual.'}",
    ]
    if extra_hint:
        user_prompt_parts.append(f"Additional direction: {extra_hint}")
    user_prompt_parts.append(QUALITY_RULES)
    user_prompt_parts.append(_NO_TEXT_TAIL)

    return "\n".join(user_prompt_parts)


async def _fetch_reference_bytes(
    client: httpx.AsyncClient, url: str
) -> tuple[bytes, str] | None:
    """Pull a reference image from R2 (or any public URL) so it can be
    inlined as a Gemini multimodal part. Returns (bytes, mime) or None
    on failure. Failures don't block generation — we just drop that
    reference and continue with whatever else loaded successfully.

    Bytes are base64-inlined later; size matters: Gemini limits the total
    inline payload to roughly 20MB, so we cap each reference at 4MB. The
    file-upload path already enforces 5MB at the source, but defensively
    re-check here in case an external URL slips through.
    """
    try:
        r = await client.get(url, timeout=20.0)
    except Exception:
        return None
    if r.status_code != 200:
        return None
    if len(r.content) > 4 * 1024 * 1024:
        return None
    mime = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
    if not mime.startswith("image/"):
        return None
    return r.content, mime


class ReferenceFetchError(RuntimeError):
    """Raised when any caller-supplied reference image fails to load.

    Previously failures were silently dropped, which produced a
    text-only generation while the operator believed their references
    had been used. That is exactly the "pretending to consult the
    reference" behaviour the user called out — see
    feedback-no-hardcoded-defaults. Now: any fetch failure aborts the
    whole image call so the operator sees a clear error.
    """


async def _build_gemini_parts(
    client: httpx.AsyncClient,
    prompt: str,
    reference_urls: list[str],
) -> list[dict]:
    """Compose the parts list for a Gemini multimodal generateContent
    call. Order matters: references first, then the text prompt — the
    model attends more strongly to images that precede the text describing
    them. Each reference is base64-encoded inline_data.

    References are fetched in parallel because typical use cases pass
    3–5 of them and serial fetching from R2 would dominate latency.

    Fail-loud on any reference fetch failure — see ReferenceFetchError.
    """
    parts: list[dict] = []
    if reference_urls:
        results = await asyncio.gather(
            *(_fetch_reference_bytes(client, u) for u in reference_urls),
            return_exceptions=True,
        )
        failures: list[str] = []
        for url, res in zip(reference_urls, results, strict=True):
            if isinstance(res, tuple):
                data_bytes, mime = res
                parts.append({
                    "inline_data": {
                        "mime_type": mime,
                        "data": base64.b64encode(data_bytes).decode("ascii"),
                    },
                })
            elif isinstance(res, BaseException):
                failures.append(f"{url}: {res.__class__.__name__}: {res}")
            else:
                failures.append(
                    f"{url}: fetch returned None (HTTP non-200, "
                    "non-image content-type, or exceeded 4MB cap)"
                )
        if failures:
            raise ReferenceFetchError(
                "Failed to load "
                f"{len(failures)}/{len(reference_urls)} reference image(s); "
                "refusing to generate without them so the result still "
                "reflects the operator's intent:\n  - "
                + "\n  - ".join(failures)
            )
    parts.append({"text": prompt})
    return parts


async def _try_gemini_model(
    client: httpx.AsyncClient,
    model: str,
    api_key: str,
    prompt: str,
    reference_urls: list[str] | None = None,
) -> tuple[bytes, str] | tuple[None, str]:
    """Gemini multimodal — generateContent + responseModalities=IMAGE.

    When reference_urls is non-empty, the request becomes image-to-image:
    each URL is fetched, base64-inlined, and prepended to the parts list.
    The model conditions its output on the references' look (interior
    palette, exterior architecture, product packaging, ...).

    NO_TEXT_RULE is also passed via systemInstruction (separate from
    the user-content parts). Gemini weights systemInstruction more
    heavily than mid-prompt text, so this is the strongest place to
    park the no-text constraint when the model is otherwise tempted
    to copy signage from a reference photo.
    """
    parts = await _build_gemini_parts(client, prompt, reference_urls or [])
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
        "systemInstruction": {
            "parts": [{"text": NO_TEXT_RULE}],
        },
    }
    try:
        r = await client.post(
            f"{_gemini_url(model)}?key={api_key}",
            json=body,
            headers={"Content-Type": "application/json"},
        )
    except Exception as e:
        return None, f"{model}: 네트워크 — {e}"
    if r.status_code != 200:
        return None, f"{model}: HTTP {r.status_code} {r.text[:200]}"
    try:
        data = r.json()
    except Exception:
        return None, f"{model}: JSON 파싱 실패"
    candidates = data.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            try:
                return base64.b64decode(inline["data"]), mime
            except Exception as e:
                return None, f"{model}: base64 decode 실패 — {e}"
    return None, f"{model}: no inline image — {json.dumps(data)[:200]}"


async def _try_imagen_model(
    client: httpx.AsyncClient,
    model: str,
    api_key: str,
    prompt: str,
    aspect_ratio: str,
) -> tuple[bytes, str] | tuple[None, str]:
    """Imagen — predict + parameters.aspectRatio."""
    body = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "aspectRatio": aspect_ratio,  # 16:9 | 4:3 | 1:1 | 9:16 | 3:4
            "sampleCount": 1,
        },
    }
    try:
        r = await client.post(
            f"{_imagen_url(model)}?key={api_key}",
            json=body,
            headers={"Content-Type": "application/json"},
        )
    except Exception as e:
        return None, f"{model}: 네트워크 — {e}"
    if r.status_code != 200:
        return None, f"{model}: HTTP {r.status_code} {r.text[:200]}"
    try:
        data = r.json()
    except Exception:
        return None, f"{model}: JSON 파싱 실패"
    preds = data.get("predictions") or []
    for p in preds:
        b64 = p.get("bytesBase64Encoded") or p.get("bytes_base64_encoded")
        if b64:
            mime = p.get("mimeType") or p.get("mime_type") or "image/png"
            try:
                return base64.b64decode(b64), mime
            except Exception as e:
                return None, f"{model}: base64 decode 실패 — {e}"
    return None, f"{model}: no prediction — {json.dumps(data)[:200]}"


async def generate_image_bytes(
    prompt: str,
    *,
    variant: str = "section",
    timeout: float = 90.0,
    reference_urls: list[str] | None = None,
    mode: str | None = None,
) -> tuple[bytes, str]:
    """variant별 모델 chain을 순서대로 시도 → 첫 성공 사용.

    Imagen 모델은 predict + aspectRatio 파라미터 사용 (정확한 사이즈 보장).
    Gemini는 generateContent + responseModalities=IMAGE 사용 (1024 고정).
    각 variant의 첫 성공 모델은 _working_models에 캐시되어 다음 호출부터 그것만 시도.

    reference_urls가 있으면 Gemini multimodal 호출에 inline_data로 부착돼
    image-to-image 모드로 동작 (운영자가 큐레이션한 매장 외관/제품 사진을
    참고해서 hero/features/text-image 비주얼을 그 톤에 맞춰 생성).
    Imagen 모델은 reference 입력을 지원하지 않으므로 references가 있으면
    Gemini 모델만 시도하고 Imagen으로 fallback하지 않는다 — 참고 일관성을
    포기한 결과보다는 명확한 실패가 디버깅에 유리.

    mode가 'space' / 'product'이면 운영계획서의 정책 prefix를 prompt 앞에
    삽입한다. reference와 함께 쓰면 가장 효과적이고 (image-to-image의
    제약 강화), reference 없이도 soft guidance로 작동.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY 미설정")

    chain = list(VARIANT_MODEL_CHAIN.get(variant) or GEMINI_IMAGE_MODELS)
    aspect = VARIANT_ASPECT.get(variant, "1:1")

    has_refs = bool(reference_urls)
    if has_refs:
        # references는 Gemini multimodal 전용 — Imagen은 image input 미지원.
        chain = [m for m in chain if m not in IMAGEN_MODELS]

    # Prompt assembly — order matters. The previous layout put
    # NO_TEXT_RULE inside QUALITY_RULES at the END; operators reported
    # that text still leaked through. Front-loading the constraint and
    # repeating a short tail reminder is much more reliable across
    # both Gemini Image and Imagen.
    #
    # Final shape:
    #   [NO_TEXT_RULE — first thing the model sees]
    #   [mode policy prefix (space/product, optional)]
    #   [caller's prompt — what the operator typed]
    #   [QUALITY_RULES — photographic quality]
    #   [NO_TEXT_RULE tail reminder]
    #
    # For Gemini, NO_TEXT_RULE is ALSO passed via systemInstruction in
    # _try_gemini_model — that field outranks user-content. Imagen
    # doesn't accept systemInstruction so we rely on the front+back
    # sandwich here.
    #
    # Caller's prompt is NOT mutated; we just compose a fresh string.
    policy = _mode_prefix(mode, has_refs)
    pieces: list[str] = [NO_TEXT_RULE]
    if policy:
        pieces.append(policy)
    pieces.append(prompt)
    pieces.append(QUALITY_RULES)
    pieces.append(_NO_TEXT_TAIL)
    final_prompt = "\n\n".join(pieces)

    cached = _working_models.get(variant)
    if cached and cached in chain:
        # 캐시된 모델을 맨 앞으로 — 보통 첫 시도에서 즉시 성공
        chain = [cached] + [m for m in chain if m != cached]

    errors: list[str] = []
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in chain:
            is_imagen = model in IMAGEN_MODELS
            if is_imagen:
                result, info = await _try_imagen_model(
                    client, model, api_key, final_prompt, aspect
                )
            else:
                result, info = await _try_gemini_model(
                    client, model, api_key, final_prompt, reference_urls,
                )
            if result is not None:
                _working_models[variant] = model
                logger.info(
                    "Image API 성공 — variant=%s mode=%s model=%s aspect=%s",
                    variant, mode or "(none)", model,
                    aspect if is_imagen else "n/a (Gemini 1024)",
                )
                return result, info
            errors.append(info)
            logger.warning("Image API 실패: %s", info)

    raise RuntimeError(
        f"variant={variant} 모든 후보 모델 실패. 마지막 에러:\n" + "\n".join(errors[-3:])
    )


# NOTE: Gutenberg-aware helpers (`collect_section_text`, `needs_image`,
# `collect_image_targets`) lived here but only worked on the legacy
# core/heading / core/cover / core/media-text block types. They had no
# call sites outside the now-removed `pattern_service.py` and `/build-page`
# endpoint, so they are deleted along with the rest of the Gutenberg path.
# If image-slot inference comes back, build it on the True Light block_type
# vocabulary (hero_banner, text_image, image_gallery, …) instead.
