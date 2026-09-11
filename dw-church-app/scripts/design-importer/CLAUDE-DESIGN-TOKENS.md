# True Light / DW Church — Design Token Contract (apply FIRST)

> **The token system is STEP 1 of every Claude Design import — always applied
> before any page composition.** The design's styleguide page becomes the tenant
> **theme** (a single `PUT /api/v1/theme`); blocks then read those tokens as CSS
> variables. Nothing on any page hardcodes a hex — colors, type, and radius come
> from the theme. Role table: [CLAUDE-DESIGN-CATALOG.md](./CLAUDE-DESIGN-CATALOG.md).

Companion docs: [CLAUDE-DESIGN-PREP-PROMPT.md](./CLAUDE-DESIGN-PREP-PROMPT.md) ·
[CLAUDE-DESIGN-IMPORT-GUIDE.md](./CLAUDE-DESIGN-IMPORT-GUIDE.md) ·
[README.md](./README.md).

---

## Why tokens first

If pages are composed before the theme is set, every block renders on the
default palette and has to be re-touched later. Applying the theme first means
each block is correct on first render.

## Our two-var-name reality (important)

We run **two theme systems** ([[project_theme_two_systems]]):
- **Canonical tokens emit `--brand-*`** (`packages/design-tokens/to-css-vars.ts`):
  `--brand-primary`, `--brand-font-heading`, `--brand-radius-md`, …
- **Blocks read the legacy `--dw-*`** vars; a **bridge** maps `--brand-*` → `--dw-*`.
  So you set tokens once (as `--brand-*` via the theme) and every block picks them
  up through the bridge. **Never** put a hex in block code — use the token (with a
  neutral fallback, `var(--dw-primary, #…)`).

## The contract

### 1. System color slots (10) — fill hex, do NOT rename or remove
`primary · secondary · accent · text · muted · background · border · surface ·
onDark · onDarkMuted` (`packages/design-tokens/src/schema.ts`
`systemColorTokensSchema`). Each maps to `--brand-{slot}`. The design supplies the
values; the roles are ours.

| slot | drives |
|------|--------|
| `primary` | primary buttons, links, active states |
| `secondary` | deeper brand tone — footer / emphasis band (church tone: still light, **not** a black band) |
| `accent` | eyebrows, small emphasis (may equal primary) |
| `text` | body + heading ink |
| `muted` | captions, secondary text |
| `background` | page background (white / warm off-white) |
| `border` | hairlines, card borders, dividers |
| `surface` | alt band / card tint (subtle warm) |
| `onDark` | ink over a **photo/overlay hero** (light) — used sparingly |
| `onDarkMuted` | muted ink over a photo/overlay hero |

- **`--brand-{slot}-fg`** foregrounds are **auto-paired for WCAG AA** by
  `contrast.ts` — do NOT assign them. Operator custom `{slot}-fg` wins if set.

### 2. ⛪ Church tone — NO dark/black background bands
Unlike a B2B site, church sites stay **light and warm**. Do NOT design
dark-on-dark bands. `onDark` / `onDarkMuted` exist only for text sitting on a
**hero background photo + overlay** — not for whole dark sections. If a section
needs contrast, use `surface` (warm tint), not a black band.

### 3. Customs — open-ended, NOT system slots
Any extra color (category-badge tones, a highlight) is a named **custom token**
(`colors.custom`, emitted as `--brand-{name}`) OR supplied **per-block in props**
(`badgeColor`/`highlightColor`/…). Never a new system slot, never hardcoded.

### 4. Typography — 11 scales, fill the ones you use
`h1–h6 · body · caption · overline · label · button`
(`typographyScaleNames`), each with `size` (per desktop/tablet/mobile) / `weight`
(100–900) / `lineHeight` (unitless) / `letterSpacing` (px, negative ok) /
optional `transform`. Font families: `heading`, `body`, `korean` (Pretendard).
Emitted as `--brand-{scale}` (+ `-weight` / `-line-height` / `-letter-spacing` /
`-transform`).

### 5. Radius / rhythm
Radius: `sm` / `md` / `lg` / `full` → `--brand-radius-*`. Section vertical rhythm:
`--brand-section-py` (from `spacing`, sm/md/lg). Express the design's radius +
section padding as these, not fixed px.

---

## Styleguide → theme mapping (how STEP 1 runs)

1. Read the design's **styleguide** (DesignSync / DW-MCP) — palette as named
   roles + hex, type scale, button/chip specs, radius, spacing.
2. Build the tenant **theme** object — `colors` (the 10 slots + customs), `fonts`,
   `typography` (the scales), optionally `header` / `footer`, and the full
   `tokensV2` (the DesignTokens shape). The DesignTokens object is the source of
   truth; `colors`/`fonts`/`typography` mirror it for the legacy editor.
3. `PUT /api/v1/theme` (auth: super-admin or the tenant owner) — **before** any page.
4. Verify the emitted CSS vars live on the storefront (`--brand-primary`,
   `--brand-font-heading`, `--brand-h1`, …) and that blocks pick them up via the
   `--dw-*` bridge.

## Rules (live-safe)

- **No hardcoded hex in block code** — tokens only, neutral fallback.
- **New/semantic tokens emit conditionally** — a tenant that didn't set them is
  byte-for-byte unchanged (`verify-live-unchanged.ts` must PASS on the live
  tenants you pick, e.g. wakechurch / dasom).
- **Chips / badges carry their colors in props**, never in block code.
- **Theme is per-tenant** — applying a theme recolors only that tenant.
