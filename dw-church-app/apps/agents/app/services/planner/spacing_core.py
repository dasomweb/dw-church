"""
웹 디자인 여백(Spacing) 코어 — 업종별 마진/패딩 체계

AI 프롬프팅 시 업종과 밀도에 맞는 여백 시스템을 자동 적용.
"""

# ── 8px 베이스 스페이싱 토큰 ──
SPACING_TOKENS = {
    "space-1": "4px",
    "space-2": "8px",
    "space-3": "16px",
    "space-4": "24px",
    "space-5": "32px",
    "space-6": "48px",
    "space-7": "64px",
    "space-8": "80px",
    "space-9": "120px",
}

# ── 업종별 여백 프로필 ──
# density: dense(정보 밀도 높음), mid(중간), airy(여백 넓음)
INDUSTRY_SPACING_PROFILES = {
    # ── 밀도 높음 (Dense) — 정보 중심 ──
    "newspaper": {
        "density": "dense",
        "label": "신문사 / 뉴스",
        "section_padding_y": {"pc": "40-60px", "tablet": "24px", "mobile": "24px"},
        "container_padding_x": {"pc": "16-24px", "tablet": "12px", "mobile": "12px"},
        "card_padding": {"pc": "12-16px", "mobile": "12-16px"},
        "article_gap": {"pc": "8-12px", "mobile": "8-12px"},
        "max_width": "1200-1440px",
        "philosophy": "정보 밀도 최우선. 여백을 줄여 스크롤 없이 많은 기사를 노출. 그리드 레이아웃 필수.",
    },
    "webzine": {
        "density": "dense",
        "label": "웹진 / 매거진",
        "section_padding_y": {"pc": "60-80px", "tablet": "32px", "mobile": "32px"},
        "container_padding_x": {"pc": "24-40px", "tablet": "16px", "mobile": "16px"},
        "card_padding": {"pc": "20-24px", "mobile": "20-24px"},
        "article_gap": {"pc": "16-24px", "mobile": "16-24px"},
        "max_width": "1100-1280px",
        "philosophy": "뉴스보다 여백 넓음. 타이포그래피와 이미지 품질 강조. 본문 컬럼 폭 680-720px 권장.",
    },
    "blog": {
        "density": "mid",
        "label": "블로그 / 개인",
        "section_padding_y": {"pc": "60-80px", "tablet": "40px", "mobile": "40px"},
        "container_padding_x": {"pc": "32-48px", "tablet": "20px", "mobile": "20px"},
        "card_padding": {"pc": "24px", "mobile": "24px"},
        "post_gap": {"pc": "32-40px", "mobile": "32-40px"},
        "max_width": "680-800px",
        "philosophy": "읽기 최적화. 본문 단일 컬럼. max-width를 짧게 잡아 행당 글자 수(65-75자) 제어.",
    },

    # ── 중간 밀도 (Mid) — 브랜드 + 정보 ──
    "corporate": {
        "density": "mid",
        "label": "일반 기업 / B2B",
        "section_padding_y": {"pc": "80-100px", "tablet": "48px", "mobile": "48px"},
        "container_padding_x": {"pc": "40-60px", "tablet": "20px", "mobile": "20px"},
        "card_padding": {"pc": "24-32px", "mobile": "24-32px"},
        "section_gap": "섹션 padding으로 처리",
        "max_width": "1200px",
        "philosophy": "신뢰감·전문성 표현. 여백으로 콘텐츠 구획을 명확히. Hero 섹션 Y 패딩 120-160px 권장.",
    },
    "ecommerce": {
        "density": "mid",
        "label": "쇼핑몰 / E-commerce",
        "section_padding_y": {"pc": "48-64px", "tablet": "32px", "mobile": "32px"},
        "container_padding_x": {"pc": "24-40px", "tablet": "12px", "mobile": "12px"},
        "product_card_padding": {"pc": "12-16px", "mobile": "12-16px"},
        "product_gap": {"pc": "12-16px", "mobile": "12-16px"},
        "max_width": "1280-1440px",
        "philosophy": "상품 노출 수 최대화와 브랜드 여백 사이 균형. 모바일 좌우 패딩 최소화해 상품 폭 확보.",
    },
    "portfolio": {
        "density": "mid",
        "label": "포트폴리오 / 에이전시",
        "section_padding_y": {"pc": "80-120px", "tablet": "60px", "mobile": "60px"},
        "container_padding_x": {"pc": "40-80px", "tablet": "20px", "mobile": "20px"},
        "project_gap": {"pc": "24-40px", "mobile": "24-40px"},
        "text_group": "16px",
        "max_width": "1200-1440px (or full)",
        "philosophy": "풀블리드 이미지 적극 활용. 컨테이너 없이 edge-to-edge 섹션과 박스 섹션을 교차.",
    },
    "clinic": {
        "density": "mid",
        "label": "병원 / 클리닉",
        "section_padding_y": {"pc": "80-100px", "tablet": "48px", "mobile": "48px"},
        "container_padding_x": {"pc": "40-60px", "tablet": "20px", "mobile": "20px"},
        "card_padding": {"pc": "24-32px", "mobile": "24-32px"},
        "section_gap": "균일하게 유지",
        "max_width": "1100-1200px",
        "philosophy": "신뢰·안심감 표현. 여백 균일하게 유지해 혼란 없애기. 폰트 가독성 최우선, 16px 이상.",
    },

    # ── 여백 넓음 (Airy) — 감성·경험 중심 ──
    "restaurant": {
        "density": "airy",
        "label": "식당 / 카페",
        "section_padding_y": {"pc": "100-140px", "tablet": "60px", "mobile": "60px"},
        "container_padding_x": {"pc": "40-80px", "tablet": "24px", "mobile": "24px"},
        "menu_card_padding": {"pc": "24-32px", "mobile": "24-32px"},
        "section_gap": "매우 넓게 (120px+)",
        "max_width": "1100-1200px",
        "philosophy": "공간감·분위기 전달이 목적. 이미지 풀블리드 + 텍스트 오버레이 패턴 多. 빈 공간도 의도된 디자인.",
    },
    "luxury": {
        "density": "airy",
        "label": "럭셔리 / 하이엔드",
        "section_padding_y": {"pc": "120-200px", "tablet": "80px", "mobile": "80px"},
        "container_padding_x": {"pc": "80-120px", "tablet": "32px", "mobile": "32px"},
        "card_padding": {"pc": "40-60px", "mobile": "40-60px"},
        "element_gap": {"pc": "48-64px", "mobile": "48-64px"},
        "max_width": "960-1100px",
        "philosophy": "여백 자체가 브랜드. 요소 수를 최소화하고 각 요소에 충분한 공기를 줌. 폰트 크기도 크게.",
    },
}

# ── 업종 키워드 → 프로필 매핑 ──
INDUSTRY_KEYWORD_MAP = {
    # Dense
    "신문": "newspaper", "뉴스": "newspaper", "미디어": "newspaper", "언론": "newspaper",
    "매거진": "webzine", "웹진": "webzine", "잡지": "webzine",
    "블로그": "blog", "개인": "blog", "작가": "blog",
    # Mid
    "기업": "corporate", "B2B": "corporate", "컨설팅": "corporate", "회사": "corporate",
    "법률": "corporate", "회계": "corporate", "금융": "corporate",
    "쇼핑": "ecommerce", "이커머스": "ecommerce", "쇼핑몰": "ecommerce", "마켓": "ecommerce",
    "포트폴리오": "portfolio", "에이전시": "portfolio", "디자인": "portfolio", "크리에이티브": "portfolio",
    "병원": "clinic", "클리닉": "clinic", "의원": "clinic", "치과": "clinic", "의료": "clinic",
    "교육": "corporate", "학원": "corporate", "학교": "corporate",
    "부동산": "corporate", "건설": "corporate",
    # Airy
    "식당": "restaurant", "레스토랑": "restaurant", "카페": "restaurant", "베이커리": "restaurant",
    "BBQ": "restaurant", "요식": "restaurant", "음식": "restaurant",
    "럭셔리": "luxury", "하이엔드": "luxury", "명품": "luxury", "주얼리": "luxury",
    "호텔": "luxury", "리조트": "luxury", "스파": "luxury",
    "패션": "portfolio", "뷰티": "restaurant",
}

# ── 반응형 정렬 규칙 ──
RESPONSIVE_ALIGNMENT_RULES = {
    "section_title": {"pc": "left or center", "mobile": "center 권장"},
    "body_text": {"pc": "left", "mobile": "left 유지 (center는 가독성 떨어짐)"},
    "cta_button": {"pc": "inline / left", "mobile": "center 또는 full-width"},
    "icon_text_group": {"pc": "left", "mobile": "center"},
    "flex_direction": {"pc": "row", "mobile": "column"},
    "image_in_hero": {"pc": "side-by-side", "mobile": "column, image order: -1 (위로)"},
}

# ── 컴포넌트 레벨 여백 ──
COMPONENT_SPACING = {
    "card_padding": {"pc": "24-32px", "mobile": "16-20px"},
    "button_padding": {"pc": "12-16px / 24-32px (Y/X)", "mobile": "10-12px / 20-24px"},
    "input_padding": {"pc": "12-14px / 16px", "mobile": "10-12px / 14px"},
    "component_gap": {"pc": "24-32px", "mobile": "16px"},
}

# ── 타이포그래피 주변 여백 ──
TYPOGRAPHY_SPACING = {
    "h1_h2_margin_bottom": "16-24px",
    "h3_h4_margin_bottom": "12-16px",
    "paragraph_margin_bottom": "12-16px",
    "section_title_to_body_gap": {"pc": "40-60px", "mobile": "24-32px"},
}

# ── 핵심 원칙 ──
SPACING_PRINCIPLES = [
    "섹션 간격 → padding으로, margin은 최소화 (배경색 커버 이슈)",
    "좌우 여백 → 컨테이너 padding으로 통일 (각 요소가 개별 관리 금지)",
    "8px 배수 시스템 유지 → 디자인 일관성",
    "모바일은 PC의 50~60% 수준으로 줄이는 게 기준점",
    "수직 여백 > 수평 여백 (콘텐츠 호흡을 위해 Y축을 넉넉하게)",
    "box-sizing: border-box 전역 설정 필수",
    "body overflow-x: hidden으로 가로 스크롤 방지",
    "긴 본문 텍스트 text-align: center 금지 (타이틀/버튼만 center)",
]


def detect_industry_profile(industry: str) -> dict:
    """업종 키워드에서 여백 프로필을 자동 감지."""
    industry_lower = industry.lower()
    for keyword, profile_key in INDUSTRY_KEYWORD_MAP.items():
        if keyword.lower() in industry_lower:
            return INDUSTRY_SPACING_PROFILES[profile_key]
    # 기본값: corporate (mid)
    return INDUSTRY_SPACING_PROFILES["corporate"]


def get_spacing_for_prompt(industry: str) -> str:
    """AI 프롬프팅용 여백 컨텍스트 문자열 반환."""
    profile = detect_industry_profile(industry)

    lines = [
        f"[여백 시스템 — {profile['label']} ({profile['density']})]",
        "",
        (
            f"밀도: {profile['density']} ("
            + (
                "정보 밀집" if profile["density"] == "dense"
                else "브랜드+정보 균형" if profile["density"] == "mid"
                else "감성·경험 중심"
            )
            + ")"
        ),
        f"설계 철학: {profile['philosophy']}",
        "",
        "섹션 레벨:",
    ]

    for key, val in profile.items():
        if key in ("density", "label", "philosophy"):
            continue
        if isinstance(val, dict):
            parts = " / ".join(f"{k}: {v}" for k, v in val.items())
            lines.append(f"  {key}: {parts}")
        else:
            lines.append(f"  {key}: {val}")

    lines.append("")
    lines.append("컴포넌트 여백:")
    for key, val in COMPONENT_SPACING.items():
        if isinstance(val, dict):
            parts = " / ".join(f"{k}: {v}" for k, v in val.items())
            lines.append(f"  {key}: {parts}")
        else:
            lines.append(f"  {key}: {val}")

    lines.append("")
    lines.append("타이포그래피 여백:")
    for key, val in TYPOGRAPHY_SPACING.items():
        if isinstance(val, dict):
            parts = " / ".join(f"{k}: {v}" for k, v in val.items())
            lines.append(f"  {key}: {parts}")
        else:
            lines.append(f"  {key}: {val}")

    lines.append("")
    lines.append("반응형 정렬 규칙:")
    for element, rules in RESPONSIVE_ALIGNMENT_RULES.items():
        lines.append(f"  {element}: PC={rules['pc']} → Mobile={rules['mobile']}")

    lines.append("")
    lines.append("핵심 원칙:")
    for p in SPACING_PRINCIPLES:
        lines.append(f"  - {p}")

    lines.append("")
    lines.append("스페이싱 토큰 (8px 베이스):")
    for token, val in SPACING_TOKENS.items():
        lines.append(f"  --{token}: {val}")

    return "\n".join(lines)
