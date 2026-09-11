#!/usr/bin/env tsx
/**
 * Capabilities Catalog generator (P0) — the reference Claude Design composes
 * AGAINST, so it maps its design to our REAL block names / token roles /
 * content modules instead of guessing ("reproduce structurally").
 *
 * Adapted for True Light / DW Church from the b2bsmart design-importer playbook.
 * Single source → derived: the BLOCK list is generated from
 * `packages/blocks/src/registry.json` (the one place block metadata lives), so
 * adding a block auto-updates the catalog on the next run. Token roles + content
 * modules are curated constants below WITH source-file pointers (they change
 * rarely and span several files).
 *
 * Emits two files next to this script:
 *   - CLAUDE-DESIGN-CATALOG.json  (machine-readable)
 *   - CLAUDE-DESIGN-CATALOG.md    (paste into the Claude Design prep prompt)
 *
 * Run:  pnpm dlx tsx scripts/design-importer/gen-catalog.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY = join(HERE, '../../packages/blocks/src/registry.json');

interface RegBlock {
  label?: string;
  group?: string;
  flags?: { isHidden?: boolean; isAlias?: boolean };
  aliasOf?: string;
  defaultProps?: Record<string, unknown>;
  description?: string;
  aiHint?: string;
}
interface Registry {
  version: number;
  groups: Record<string, string>;
  blocks: Record<string, RegBlock>;
}

// ── Token roles — packages/design-tokens/src/schema.ts (systemColorTokensSchema)
//    emitted as `--brand-{slot}` by to-css-vars.ts (+ WCAG `-fg` pairs). Blocks
//    read the legacy `--dw-*` bridge (project_theme_two_systems). 8 core slots +
//    two on-dark roles; extra colors are open-ended CUSTOMS. ─────────────────
const SYSTEM_TOKENS: Array<[string, string, string]> = [
  ['primary', '--brand-primary', 'Brand color — primary buttons, links, active states.'],
  ['secondary', '--brand-secondary', 'Deeper brand tone — footer / accent band (NOT a black dark-band; church tone stays light).'],
  ['accent', '--brand-accent', 'Eyebrows, small emphasis, secondary highlight (may equal primary).'],
  ['text', '--brand-text', 'Body / heading ink.'],
  ['muted', '--brand-muted', 'Secondary / caption text.'],
  ['background', '--brand-background', 'Page background (white / warm off-white).'],
  ['border', '--brand-border', 'Hairlines, card borders, dividers.'],
  ['surface', '--brand-surface', 'Alt band / card surface (subtle warm tint).'],
  ['onDark', '--brand-onDark', 'Text ON a photo/overlay hero (light ink). Used sparingly — see church tone note.'],
  ['onDarkMuted', '--brand-onDarkMuted', 'Muted text on a photo/overlay hero.'],
];
const TYPO_SCALES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'caption', 'overline', 'label', 'button'];
const FONT_ROLES = ['heading', 'body', 'korean'];

// ── Content modules — apps/server/src/modules (data blocks fetch these live).
//    Church modules (not b2b blog/catalog/product). ────────────────────────
const MODULES: Array<[string, string, string]> = [
  ['sermons', 'sermons', '설교 — data blocks: recent_sermons, sermon_feature (+ sermon study fields → sermon_magazine).'],
  ['bulletins', 'bulletins', '주보(weekly bulletin, PDF cover) — data block: recent_bulletins.'],
  ['columns', 'columns_pastoral', '목회칼럼/묵상 — data block: recent_columns.'],
  ['albums', 'albums', '앨범/갤러리 — data block: album_gallery.'],
  ['events', 'events', '행사·소식 — data block: event_grid.'],
  ['staff', 'staff', '교역자/섬기는 이 — data block: staff_grid (opt-in).'],
  ['history', 'history', '교회 연혁 — data block: history_timeline.'],
  ['boards', 'boards / board_posts', '게시판/공지 — data block: board (boardSlug: notices/free/...).'],
  ['banners', 'banners', '메인 배너 슬라이더 — data block: banner_slider (category=main/sub). NOT auto-migrated.'],
  ['cells', 'cells', '목장/소그룹 — data block: cell_grid.'],
  ['schedules', 'schedules', '예배·모임 시간표 — data block: schedule_board (or static worship_schedule block).'],
  ['newcomers', 'newcomers', '새가족 — public FORM block: newcomer_form (+ static newcomer_info).'],
  ['forms', 'form_submissions', '일반 폼 — application_form_embed / form_split / contact_form.'],
];

function trim(s: string | undefined, n = 200): string {
  if (!s) return '';
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

function main(): void {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8')) as Registry;
  const entries = Object.entries(reg.blocks);

  const blocks = entries.map(([type, b]) => ({
    block_type: type,
    label: b.label ?? '',
    group: b.group ?? '',
    surface: b.flags?.isHidden ? 'importer' : b.flags?.isAlias ? 'alias' : 'palette',
    aliasOf: b.aliasOf,
    keyProps: Object.keys(b.defaultProps ?? {}),
    reproduces: trim(b.aiHint || b.description),
  }));

  const palette = blocks.filter((b) => b.surface === 'palette').length;
  const importer = blocks.filter((b) => b.surface === 'importer').length;
  const alias = blocks.filter((b) => b.surface === 'alias').length;

  const catalog = {
    generatedAt: new Date().toISOString().slice(0, 10),
    project: 'True Light / DW Church',
    counts: { total: blocks.length, palette, importer, alias },
    tokens: {
      systemSlots: SYSTEM_TOKENS.map(([role, cssVar, use]) => ({ role, cssVar, use })),
      customsOpenEnded: true,
      autoPairedForegrounds: '`--brand-{slot}-fg` are WCAG-AA auto-paired by contrast.ts — do not assign.',
      typographyScales: TYPO_SCALES,
      fontRoles: FONT_ROLES,
    },
    modules: MODULES.map(([name, table, use]) => ({ name, table, use })),
    themeEndpoint: 'PUT /api/v1/theme (themes/routes.ts) — apply the theme FIRST (STEP 1), before composing pages.',
    groups: reg.groups,
    blocks,
  };

  writeFileSync(join(HERE, 'CLAUDE-DESIGN-CATALOG.json'), JSON.stringify(catalog, null, 2) + '\n');

  // ── Markdown (prompt attachment) ──
  const md: string[] = [];
  md.push('# True Light / DW Church — Capabilities Catalog (for Claude Design import)');
  md.push('');
  md.push(`> Auto-generated ${catalog.generatedAt} by \`scripts/design-importer/gen-catalog.ts\` from`);
  md.push('> `packages/blocks/src/registry.json`. **Do not hand-edit.** Map every section of your');
  md.push('> design to a `block_type` + a `variant` below; assign colors to the TOKEN ROLES (not free');
  md.push('> hex); tag anything with no match as `NEEDS_BLOCK: <what>` so it goes to the dev queue.');
  md.push('');
  md.push('> **교회 톤 (필수):** 밝고 따뜻한 배경. **검정/다크 배경 밴드 금지** — onDark 역할은 사진');
  md.push('> 위 히어로 오버레이 같은 곳에만 최소로. 콘텐츠는 한국어 우선.');
  md.push('');
  md.push(`**Blocks:** ${blocks.length} total — ${palette} palette + ${importer} importer + ${alias} alias (all usable by the importer).`);
  md.push('');
  md.push('## Token roles (assign your palette to these)');
  md.push('');
  md.push('System color slots — fill hex, roles are fixed (emitted as the CSS var; blocks read the legacy `--dw-*` bridge):');
  md.push('');
  md.push('| role | CSS var | use |');
  md.push('|------|---------|-----|');
  for (const [r, v, u] of SYSTEM_TOKENS) md.push(`| \`${r}\` | \`${v}\` | ${u} |`);
  md.push('');
  md.push('- **`--brand-{slot}-fg`** foregrounds are WCAG-AA **auto-paired** (contrast.ts) — you do NOT assign them.');
  md.push('- **Customs are open-ended** — any extra color (e.g. category badge tones) is a named custom token OR supplied per-block in props; it never needs a system slot and is never hardcoded in block code.');
  md.push(`- **Typography scales (${TYPO_SCALES.length}):** ${TYPO_SCALES.map((s) => '`' + s + '`').join(', ')} — each with size / weight / lineHeight / letterSpacing (+ optional transform) per breakpoint (desktop/tablet/mobile).`);
  md.push(`- **Font roles:** ${FONT_ROLES.map((f) => '`' + f + '`').join(', ')} (Pretendard supported for Korean).`);
  md.push('- **Radius:** `sm` / `md` / `lg` / `full`. **Section rhythm:** `--brand-section-py` (sm/md/lg via spacing). Express the design in these, not fixed px.');
  md.push('- **Apply the theme FIRST:** the styleguide → tenant theme via `PUT /api/v1/theme` (STEP 1) before any page, so every block is correct on first render.');
  md.push('');
  md.push('## Content modules (dynamic data → data blocks)');
  md.push('');
  md.push('> The migration/importer places a data-block SHELL; the actual rows are imported per-module (each admin page\'s 📥 URL에서 가져오기). Empty module → the block renders nothing.');
  md.push('');
  md.push('| module | table | use |');
  md.push('|--------|-------|-----|');
  for (const [n, t, u] of MODULES) md.push(`| \`${n}\` | \`${t}\` | ${u} |`);
  md.push('');
  md.push('## Blocks (map your sections to these)');
  md.push('');
  const byGroup = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const g = b.group || 'other';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(b);
  }
  const emitGroup = (label: string, g: string, list: typeof blocks) => {
    md.push(`### ${label} (\`${g}\`)`);
    md.push('');
    md.push('| block_type | label | surface | key props | reproduces |');
    md.push('|------------|-------|---------|-----------|------------|');
    for (const b of list) {
      md.push(`| \`${b.block_type}\` | ${b.label} | ${b.surface} | ${b.keyProps.slice(0, 8).map((p) => '`' + p + '`').join(' ') || '—'} | ${b.reproduces} |`);
    }
    md.push('');
  };
  for (const [g, label] of Object.entries(reg.groups)) {
    const list = byGroup.get(g);
    if (list && list.length) emitGroup(label, g, list);
  }
  for (const [g, list] of byGroup) {
    if (reg.groups[g]) continue;
    emitGroup(g, g, list);
  }

  writeFileSync(join(HERE, 'CLAUDE-DESIGN-CATALOG.md'), md.join('\n'));
  console.log(`✓ catalog generated — ${blocks.length} blocks (${palette} palette + ${importer} importer + ${alias} alias)`);
  console.log('  → scripts/design-importer/CLAUDE-DESIGN-CATALOG.json');
  console.log('  → scripts/design-importer/CLAUDE-DESIGN-CATALOG.md');
}

main();
