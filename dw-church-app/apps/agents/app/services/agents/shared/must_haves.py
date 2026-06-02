"""Shared formatter for operator hard-requirement input.

Every narrative-producing agent (Strategy / Architect / Copywriter) accepts
4 fields the operator filled in the wizard's "필수 반영 사항" panel:

    must_haves                 — free-text "반드시 반영" 사항
    required_pages             — must-have page names (architect honors)
    required_key_messages      — must-have copy lines (copywriter honors)
    required_stats             — must-have numbers / metrics (copywriter)

The prompt builder injects this block at the TOP of the user message so
the LLM sees it before any agent-specific context. The block is
formatted as a numbered list with a 'MUST' header — Claude / Gemini both
treat "MUST" as a hard constraint when paired with explicit numbering.

When all fields are empty the helper returns "", so the prompt stays
clean for tenants that didn't fill the panel.
"""

from __future__ import annotations


def format_must_haves(
    *,
    must_haves: str = "",
    required_pages: list[str] | None = None,
    required_key_messages: list[str] | None = None,
    required_stats: list[str] | None = None,
    is_ko: bool = False,
) -> str:
    """Returns a prompt fragment ('' when no input). Pair with `\\n\\n`
    after when concatenating into a larger prompt.
    """
    pages = required_pages or []
    msgs = required_key_messages or []
    stats = required_stats or []
    has_any = bool(must_haves.strip()) or pages or msgs or stats
    if not has_any:
        return ""

    if is_ko:
        header = (
            "═══ OPERATOR MUST-HAVE REQUIREMENTS (운영자 필수 반영 사항) ═══\n"
            "아래 항목들은 운영자가 명시적으로 입력한 강제 요구사항입니다.\n"
            "agent 의 자체 판단보다 우선하며, 모두 반드시 출력에 반영해야 합니다.\n"
        )
        labels = {
            "free": "필수 반영 (자유 텍스트):",
            "pages": "필수 페이지 (sitemap 에 반드시 포함):",
            "msgs": "필수 키 메시지 (헤드라인 / 본문에 verbatim 또는 paraphrase 로 반영):",
            "stats": "필수 수치 (stats / pricing / proof 섹션에 반드시 포함):",
        }
        footer = (
            "위 요구사항을 누락하거나 의역으로 약화시키지 마세요. "
            "특히 키 메시지는 가능한 한 verbatim 으로 포함하고, 필수 수치는 "
            "정확한 값으로 표기하세요.\n"
            "════════════════════════════════════════════════\n"
        )
    else:
        header = (
            "═══ OPERATOR MUST-HAVE REQUIREMENTS ═══\n"
            "These are hard requirements the operator explicitly entered.\n"
            "They OVERRIDE the agent's own judgement — all of them MUST be\n"
            "reflected in the output.\n"
        )
        labels = {
            "free": "Must-have (free text):",
            "pages": "Required pages (MUST appear in sitemap):",
            "msgs": "Required key messages (MUST appear in headlines / body, verbatim or close paraphrase):",
            "stats": "Required stats / numbers (MUST appear in stats / pricing / proof sections):",
        }
        footer = (
            "Do not drop these or soften them with vague paraphrase. Quote "
            "key messages as close to verbatim as the surrounding copy allows; "
            "render required stats with their exact values.\n"
            "═══════════════════════════════════════\n"
        )

    parts: list[str] = [header]
    if must_haves.strip():
        parts.append(f"\n{labels['free']}\n{must_haves.strip()}\n")
    if pages:
        parts.append(f"\n{labels['pages']}\n" + "\n".join(f"  - {p}" for p in pages) + "\n")
    if msgs:
        parts.append(f"\n{labels['msgs']}\n" + "\n".join(f"  - {m}" for m in msgs) + "\n")
    if stats:
        parts.append(f"\n{labels['stats']}\n" + "\n".join(f"  - {s}" for s in stats) + "\n")
    parts.append(f"\n{footer}")
    return "".join(parts)
