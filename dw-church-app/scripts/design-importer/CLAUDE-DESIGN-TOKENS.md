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

## Claude Design 산출 ↔ 우리 토큰 매핑 (어휘 통일)

Claude Design 이 만드는 "디자인 시스템" 페이지는 우리와 **다른 라벨**을 쓴다(페이지제목/섹션제목/…, --brand/--fg/…, --area-*). 아래 표로 **우리 이름(H 시스템 등)으로 환산**해서 theme(tokensV2)에 넣는다. 값(px·weight·hex)은 디자인이 정한 그대로.

**타입 — 우리는 H 시스템(h1~h6). Claude Design 라벨 → 우리 스케일:**
| Claude Design | 우리 토큰 | 비고 |
|---|---|---|
| 페이지 제목 | `h1` | 예 52/800/-0.05em |
| 섹션 제목 | `h2` | 예 38/800/-0.045em |
| 하위 제목 | `h3` | 예 24/800/-0.04em |
| (더 작은 제목) | `h4·h5·h6` | 필요 시 |
| 본문 | `body` | 예 17/400/1.7 |
| 보조 설명 | `caption` | 예 14/400 |
| EYEBROW·섹션 라벨 | `overline` | 예 11.5/800/+0.14em, transform uppercase |
| 라벨·버튼 텍스트 | `label` / `button` | 중간굵기 500·600 |

**색 — Claude Design var → 우리 슬롯/커스텀:**
| Claude Design | 우리 |
|---|---|
| `--brand` | `primary` |
| `--fg` | `text` |
| `--fg-muted` | `muted` |
| `--surface` | `surface` |
| `--border` | `border` |
| 배경(흰색) | `background` |
| 딥 네이비(어두운 밴드·풋터) | custom **`deep-navy`** (→ `--brand-deep-navy`). 풋터/다크밴드에만. 교회 톤 유지(넓은 섹션 다크금지). |
| `--area-design/saas/platform/production/development` | custom **`area-design` 등** (→ `--brand-area-*`). 분류 배지·상단 액센트에만(넓은 면 금지). |

**radius — Claude Design 4단계 → 우리 4슬롯:**
`sm`=배지·작은입력(8) · `md`=버튼·입력(11) · `lg`=컨테이너(16) · `full`=칩 pill(≥100). 값은 디자인대로.

**여백 — Claude Design → 우리 spacing:**
좌우 페이지여백 → `containerPaddingX`(예 48) · 섹션 상하 → `sectionPaddingY`(예 80–88) · 카드 사이 → `gapGrid`(예 16) · 본문 최대폭 → `containerMax`(예 1000). (2단 사이 간격(예 44)은 별도 토큰 없음 → 블록 레이아웃에서 처리.)

**버튼·폼 치수**(height 48 · radius 11 · 폼 세로여백 14 등)는 현재 블록이 고정으로 렌더 — 토큰화 대상 아님(radius 는 위 md 로 반영). 필요해지면 별도 controls 토큰으로 확장.

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
