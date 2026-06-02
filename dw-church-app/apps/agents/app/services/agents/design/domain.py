"""Pydantic schemas for DesignAgent (designSystem endpoint).

The output is the same theme.json shape the storefront's
@dw-church/design-tokens consumes — admin-app's wizard ships it
verbatim into the per-tenant `themes` table after the operator
picks a color option + font option from the menus the agent
returns. So the field names here MUST match the existing
designSystem JSON contract; renaming any of them silently breaks
the storefront cascade.

Keeping this typed (instead of `dict`) is what makes the schema-
retry policy useful here: the LLM occasionally drops a corner of
the response (e.g. forgets `surface` in one of the nine palettes,
or returns 7 colors instead of 8). Without validation those near-
misses sneak through extract_json and cause runtime errors only
once the operator picks that broken option in the wizard.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────────
# Input
# ──────────────────────────────────────────────────────────────────


class DesignInput(BaseModel):
    """Inputs the wizard funnels into the design-system call.

    Everything optional — the agent is expected to invent reasonable
    palettes for an "industry: cafe" prompt with no other context. The
    extra fields (preferredColors / preferredMood / demographics /
    languages) just constrain the output when the operator provided
    them on Step 2."""

    business_name: str = Field(default="", alias="businessName")
    industry: str = ""
    brand_keywords: str = Field(default="", alias="brandKeywords")
    preferred_colors: str = Field(default="", alias="preferredColors")
    preferred_mood: str = Field(default="", alias="preferredMood")
    demographics: str = ""
    languages: str = ""

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────────────────────────
# Output — sub-shapes
# ──────────────────────────────────────────────────────────────────


class ColorPalette(BaseModel):
    """The 8 token slots a theme.json palette has. Hex strings only —
    operator-controlled hex is validated downstream by design-tokens
    before persistence; we don't re-regex it here."""

    primary: str
    secondary: str
    accent: str
    background: str
    surface: str
    text: str
    muted: str
    border: str


class ColorOption(BaseModel):
    """One of nine palette options the wizard shows as chips."""

    name: str
    mood: str
    harmony: str
    colors: ColorPalette


class FontOption(BaseModel):
    """One of six font pairings."""

    name: str
    heading: str
    body: str
    korean_font: str = Field(alias="koreanFont")
    mood: str
    style: str

    model_config = {"populate_by_name": True}


class FontSizesPair(BaseModel):
    h1: str
    h2: str
    h3: str
    body: str


class FontSizes(BaseModel):
    desktop: FontSizesPair
    mobile: FontSizesPair


class Spacing(BaseModel):
    section_padding: str = Field(alias="sectionPadding")
    container_max: str = Field(alias="containerMax")

    model_config = {"populate_by_name": True}


class BorderRadius(BaseModel):
    sm: str
    md: str
    lg: str


# ──────────────────────────────────────────────────────────────────
# Output — top-level
# ──────────────────────────────────────────────────────────────────


class DesignDecision(BaseModel):
    """Full design system the wizard renders for selection.

    Bounds are intentional:
      colorOptions: 1-12 — the prompt asks for 9, but Flash sometimes
        returns 8 or 10. We accept that range; below 1 means the model
        produced nothing usable and the schema retry should fire.
      fontOptions: 1-8 — same pattern, prompt asks for 6.
    """

    color_options: list[ColorOption] = Field(
        alias="colorOptions", min_length=1, max_length=12,
    )
    font_options: list[FontOption] = Field(
        alias="fontOptions", min_length=1, max_length=8,
    )
    font_sizes: FontSizes = Field(alias="fontSizes")
    spacing: Spacing
    border_radius: BorderRadius = Field(alias="borderRadius")

    model_config = {"populate_by_name": True}
