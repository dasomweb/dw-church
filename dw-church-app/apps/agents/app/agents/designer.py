"""Designer Agent - Tenant theme configuration.

Responsibilities:
- Generate theme tokens (colors palette + typography families) that flow
  into the tenant's theme settings, where they're emitted as --brand-*
  CSS variables for every block to inherit (block code is hardcode-free).
- Output: theme_config in ProjectContext.

Per-block / per-element visual specs are NOT this agent's concern. Block
code references --brand-* tokens directly (typography sizes / weights /
line-heights / letter-spacing — and color palette slots — all derived
from the theme). The operator's "타이포그래피" / "색상·글꼴" theme panels
edit the same tokens. The old css_map field shipped string-CSS payloads
that no downstream consumer ever applied — removed.
"""

import json

from app.agents.base import (
    AgentBase,
    AgentResult,
    AgentRole,
    AgentStatus,
    ProjectContext,
)

DESIGNER_SYSTEM_PROMPT = """You are a brand designer setting up a new website's theme tokens.

Output a JSON object with this exact shape:
{
  "theme_config": {
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex"
    },
    "fonts": {
      "heading": "font-family stack (web-safe, ends with sans-serif/serif/system fallback)",
      "body": "font-family stack",
      "koreanFont": "Korean-friendly font-family stack (Pretendard / Noto Sans KR / etc.)"
    },
    "brand_tone": "한국어 1-2문장 — 브랜드의 디자인 정체성 (예: 신뢰감 있는 정공법 B2B / 따뜻한 라이프스타일 / 미니멀 모던)"
  }
}

These tokens are written to the tenant theme and emitted as CSS variables:
  --brand-primary / --brand-secondary / --brand-accent / --brand-text / ...
  --brand-font-heading / --brand-font-body / --brand-font-korean
Block code references those variables directly — never bakes hex / font
strings inline. Operator's theme panel ("타이포그래피" / "색상·글꼴") edits
the same fields the operator sees on save.

Rules:
1. Hex palette must pass WCAG AA contrast (4.5:1 for body text on background)
2. Match the brand_tone from the plan when the planner supplied one
3. Korean font stack is required (storefront primarily renders Korean copy)
4. Return ONLY the JSON object — no markdown, no explanation"""


class DesignerAgent(AgentBase):
    """Generates visual design tokens and CSS."""

    role = AgentRole.DESIGNER

    async def execute(self, context: ProjectContext) -> AgentResult:
        """Generate design based on site plan."""
        if not context.pages:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=["No pages in plan. Run Planner first."],
            )

        if not self._ai_service:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=[
                    "DesignerAgent has no AI service configured. "
                    "Code-level _default_design fixtures are not used in "
                    "any production path — they shipped a fixed indigo/"
                    "violet palette + system-ui fonts + an English brand "
                    "tone string ('professional and modern') disguised "
                    "as AI output. Provide a real ai_service or fail "
                    "explicitly. See feedback-no-hardcoded-defaults."
                ],
            )

        prompt = self.get_prompt(context)
        try:
            client = self._ai_service._get_client()
            response = await client.messages.create(
                model="claude-opus-4-7",
                max_tokens=4096,
                system=DESIGNER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            design = self._parse_design(raw)
        except Exception as e:
            return AgentResult(
                role=self.role,
                status=AgentStatus.FAILED,
                errors=[f"AI generation failed: {e}"],
            )

        context.theme_config = design.get("theme_config", {})
        # css_map removed — block code is hardcode-free and pulls
        # everything from --brand-* tokens. Designer's job is only to
        # author those tokens (palette + font families). Per-element
        # visual specs are operator-controlled via inspector / props.

        colors = context.theme_config.get("colors", {})
        fonts = context.theme_config.get("fonts", {})
        return AgentResult(
            role=self.role,
            status=AgentStatus.AWAITING_APPROVAL,
            output=design,
            summary=(
                f"Theme tokens: {len(colors)} palette slots, "
                f"{len(fonts)} font families"
            ),
        )

    def get_prompt(self, context: ProjectContext) -> str:
        pages_summary = json.dumps(context.pages, ensure_ascii=False, indent=2)
        planner_result = context.agent_results.get(
            "planner",
            AgentResult(role=AgentRole.PLANNER, status=AgentStatus.COMPLETED),
        )
        brand_tone = planner_result.output.get("brand_tone", "professional")
        return f"""Website plan:
{pages_summary}

Brand tone: {brand_tone}
Business: {context.business_description}

Generate design tokens and CSS for each block in each page."""

    @staticmethod
    def _parse_design(raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            import re
            cleaned = re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned).strip()
        return json.loads(cleaned)

    # `_default_design` was removed. It was reachable from production
    # via the `if self._ai_service: ... else: _default_design(...)`
    # branch, shipping a fixed indigo/violet/cyan palette (#2563eb /
    # #7c3aed / #06b6d4) + system-ui fonts + an English brand_tone
    # string ('professional and modern') to every tenant whose ai_service
    # was missing. Operators saw their tenant rendered with this fixture
    # and assumed the AI Designer had run. Tests must inject a mocked
    # ai_service rather than relying on a code-level fixture. See
    # feedback-no-hardcoded-defaults.
