"""Church content-module page structure enforcement.

A page whose purpose is a single content module (설교/주보/목회칼럼/예배안내/…)
must render as exactly [page-hero, intro text, <data block>] — never a generic
text-image/gallery. These tests pin the detection + the deterministic
restructure so a copywriter that picks text-image can't ship the wrong shape.
"""
from app.routers.planner import (
    _detect_content_module,
    _enforce_content_module_structure,
)


class TestDetectContentModule:
    def test_home_is_never_a_module(self):
        assert _detect_content_module("홈", "/") is None
        assert _detect_content_module("Home", "/home") is None

    def test_church_content_pages_detected(self):
        cases = {
            ("설교", "/sermons"): "sermons",
            ("주보", "/bulletins"): "bulletins",
            ("목회칼럼", "/pastor-column"): "columns",
            ("예배 안내", "/about/worship-info"): "worship-schedule",
            ("섬기는 사람들", "/about/staff"): "clergy",
            ("교회 연혁", "/about/history"): "history",
            ("갤러리", "/community/gallery"): "albums",
            ("게시판", "/community/board"): "board",
            ("교회 행사", "/community/events"): "events",
        }
        for (name, slug), expected in cases.items():
            assert _detect_content_module(name, slug) == expected, f"{slug} -> {expected}"

    def test_non_module_pages_pass_through(self):
        for name, slug in [("비전", "/about/vision"), ("선교", "/missions"),
                            ("오시는 길", "/contact"), ("사역", "/community/ministries")]:
            assert _detect_content_module(name, slug) is None, slug


class TestEnforceStructure:
    def test_non_module_returns_none(self):
        # caller keeps the LLM output untouched
        assert _enforce_content_module_structure(
            {"name": "비전", "slug": "/about/vision"},
            [{"sectionType": "hero"}, {"sectionType": "text-image"}],
        ) is None

    def test_module_page_forced_to_hero_text_block(self):
        sections = [
            {"sectionType": "page-hero", "title": "목회칼럼", "subtitle": "담임목사의 글"},
            {"sectionType": "text-image", "title": "말씀 묵상", "description": "매주 칼럼", "imagePrompt": "x"},
            {"sectionType": "cta", "title": "구독"},
        ]
        out = _enforce_content_module_structure(
            {"name": "목회칼럼", "slug": "/pastor-column"}, sections,
        )
        assert [s["sectionType"] for s in out] == ["page-hero", "text", "columns"]
        # hero + intro copy reused from the LLM output
        assert out[0]["title"] == "목회칼럼"
        assert out[1]["title"] == "말씀 묵상"
        assert out[1]["description"] == "매주 칼럼"
        # data block carries no LLM-authored items
        assert out[2]["title"] == ""

    def test_synthesizes_when_llm_gave_nothing_usable(self):
        out = _enforce_content_module_structure(
            {"name": "주보", "slug": "/bulletins"}, [],
        )
        assert [s["sectionType"] for s in out] == ["page-hero", "text", "bulletins"]
        assert out[0]["title"] == "주보"
