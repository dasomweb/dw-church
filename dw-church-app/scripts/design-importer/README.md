# Claude Design Importer (True Light / DW Church)

Turn a **Claude Design** canvas into True Light **block sections** — a separate
system from the AI website builder and from URL migration. Adapted from the
b2bsmart design-importer playbook, fitted to our registry, tokens, and church tone.

| | AI Builder | URL Migration | **Claude Design Importer** |
|---|---|---|---|
| Input | business description | a live source site | a finished Claude Design canvas |
| Logic | generative (LLM) | crawl → classify structure | **deterministic** analyse → match → skin |
| Output | invented sections | the source's structure as blocks | the design, faithfully, as blocks |
| Entry | live wizard | super-admin 🚚 마이그레이션 | authoring-time (`scripts/design-importer/`) |

All three share **only the storefront block renderer** (`packages/blocks`, one
renderer by physical necessity). The importer never calls the AI builder.

---

## The 3 required deliverables (playbook §1 — "없으면 시작 금지")

1. **Capabilities Catalog** — `gen-catalog.ts` reads `packages/blocks/src/registry.json`
   → emits `CLAUDE-DESIGN-CATALOG.md` (+`.json`). Attach to the Claude Design prompt
   so it maps sections to our REAL block names, not guesses. **Regenerate after
   adding a block.**
2. **Token Contract** — [CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md): the 10
   system slots (`--brand-*`, `--dw-*` bridge), church-tone rule (no dark bands),
   "theme STEP 1" via `PUT /api/v1/theme`.
3. **Prep Prompt** — [CLAUDE-DESIGN-PREP-PROMPT.md](./CLAUDE-DESIGN-PREP-PROMPT.md):
   paste into Claude Design **with the two files above** → get a STRUCTURED SPEC back
   (`match`/`skin`/`new` pre-classified, `NEEDS_BLOCK` for gaps).

Then work the [import guide](./CLAUDE-DESIGN-IMPORT-GUIDE.md) loop: one page at a
time — re-fetch → read verbatim → match/skin/new → compose → live-verify → ledger.

## Method — analyse → match → skin → new

1. **match** — an existing block+variant fits → set values.
2. **skin** — function fits but the visual pattern is new → add a `variant`.
3. **new** — no block has the structure → a new block (5-point wiring, `isHidden`).
4. **dev queue** — the capability itself is missing → `NEEDS_BLOCK`, a person decides.

**Colour is never hardcoded** — skins reference theme tokens; the palette lives in
the tenant **theme** (STEP 1). The same skin re-themes cleanly for the next church.

## Isolation (authoring-time, live-safe)

- **No new runtime service / route.** The importer runs at authoring time; composed
  sections are written through the **existing** pages + theme APIs.
- **`scripts/` is in no Docker build** (server/web/admin images COPY specific
  apps/packages, not `scripts/`) → editing this directory **deploys nothing**.
- **New blocks are additive + gated** (`registry.json flags.isHidden`): invisible in
  every tenant's palette, rendered only when explicitly placed. Adding to the shared
  renderer redeploys `apps/web` (one renderer) — mitigated by additivity + no change
  to existing block paths. After adding a block, **re-run `gen-catalog.ts`**.
- **Compose into a sandbox / demo tenant** (e.g. `dasom`, nightly-reset) first;
  promote into the real tenant only on explicit approval. Never test on a live
  church tenant.
- **Verify live unchanged** — when shared code changes, a fingerprint harness
  (`verify-live-unchanged.ts`, P1) must PASS on chosen live tenants before shipping.

## Files

| file | role |
|------|------|
| `gen-catalog.ts` | catalog generator (registry-derived) — **run:** `pnpm dlx tsx scripts/design-importer/gen-catalog.ts` |
| `CLAUDE-DESIGN-CATALOG.md` / `.json` | generated block + token + module catalog (prompt attachment) |
| `CLAUDE-DESIGN-TOKENS.md` | token contract + STEP 1 pre-apply |
| `CLAUDE-DESIGN-PREP-PROMPT.md` | paste-in prompt for the Claude Design side |
| `CLAUDE-DESIGN-IMPORT-GUIDE.md` | work-unit loop + progress ledger |
| `README.md` | this map |

## Status

- **P0 — foundation (done):** catalog generator + generated catalog + token
  contract + prep prompt + import guide. No runtime/deploy impact.
- **P1 — per-import (as needed):** `verify-live-unchanged.ts` harness, per-tenant
  deterministic compose script(s), and any `new` blocks (5-point wiring, `isHidden`)
  a specific design requires. Build these when a real design is imported.

---

### 요약 한 문장
> 디자인 측엔 "우리 카탈로그·토큰에 매핑해 스펙을 달라", 엔지니어(Claude Code)엔
> "페이지 단위로 토큰부터·verbatim·라이브(샌드박스) 검증·결정은 사람에게" — 교회 톤
> (밝고 따뜻, 다크밴드 금지)·한국어 우선을 지키며.
