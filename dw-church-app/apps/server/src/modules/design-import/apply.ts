/**
 * Apply an ImportSpec (from map.ts) to a tenant — theme + pages + images→R2.
 * Reuses the migration appliers (page/section insert, image re-host) and the
 * themes + backups services, so it inherits their tested behavior (idempotent
 * per-slug section replace, hero normalization, R2 self-hosting, hex→uuid casts).
 *
 * SAFETY: backup FIRST (always), and — per the operator's "딴데 하면 안된다" —
 * a hard tenant allowlist so a stray apply can't touch a live church. Widen
 * ALLOWED_TENANTS (or make it env-driven) once the console flow is trusted.
 */
import { DEFAULT_DESIGN_TOKENS, type DesignTokens } from '@dw-church/design-tokens';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { updateThemeTokens } from '../themes/service.js';
import { applyPageContents } from '../migration/appliers/pages.js';
import { migrateImages } from '../migration/appliers/images.js';
import { createBackup } from '../backups/service.js';
import { canvasImageUrls, type ImportSpec, type Styleguide } from './map.js';

/** Hard guard — only these tenants may receive an apply right now. */
export const ALLOWED_TENANTS = new Set(['mdemmauschurch']);

export type ApplyMode = '전면개편' | '부분추가';

export interface ApplyResult {
  themeApplied: boolean;
  pages: { slug: string; sections: number }[];
  images: number;
  backupId: string;
  warnings: string[];
}

function prune<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v != null && v !== '') (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Full, schema-valid DesignTokens from a styleguide (defaults fill the rest). */
export function buildChurchTheme(sg: Styleguide): DesignTokens {
  const t = structuredClone(DEFAULT_DESIGN_TOKENS) as DesignTokens;
  const sys = t.colors.system as Record<string, unknown>;
  t.colors.system = { ...sys, ...prune(sg.colors) } as typeof t.colors.system;
  if (sg.fonts) {
    const fam = t.typography.families as Record<string, unknown>;
    t.typography.families = { ...fam, ...prune(sg.fonts) } as typeof t.typography.families;
  }
  // Apply the design's TYPE SCALE (else imports keep the 72px default → huge heads).
  if (sg.scale) {
    const scales = t.typography.scales as Record<string, { size: { desktop: number; tablet?: number; mobile?: number }; weight: number }>;
    for (const [name, v] of Object.entries(sg.scale)) {
      if (!v || !scales[name]) continue;
      const desktop = Math.max(10, Math.round(v.size));
      scales[name] = {
        ...scales[name],
        size: { desktop, tablet: Math.max(11, Math.round(desktop * 0.88)), mobile: Math.max(11, Math.round(desktop * 0.76)) },
        ...(v.weight ? { weight: v.weight } : {}),
      };
    }
  }
  return t;
}

/** Recursively collect http(s) image URLs from a props object. */
function collectPropUrls(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /\.(jpe?g|png|webp|gif|svg|avif)(\?|#|$)/i.test(value)) out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectPropUrls(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectPropUrls(v, out);
  }
}

export interface ApplyProgress { (step: string, done: boolean): void }

export async function applyImportSpec(
  tenantSlug: string,
  spec: ImportSpec,
  canvasHtml: string,
  mode: ApplyMode,
  onProgress: ApplyProgress = () => {},
): Promise<ApplyResult> {
  if (!ALLOWED_TENANTS.has(tenantSlug)) {
    throw new AppError('FORBIDDEN', 403, `Claude Design 반영은 현재 [${[...ALLOWED_TENANTS].join(', ')}] 에만 가능합니다.`);
  }
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  const warnings = [...spec.warnings];

  // 1. Backup FIRST — reversible even for 전면개편.
  onProgress('백업', false);
  const backup = await createBackup(tenantSlug, { note: `Claude Design 반영 (${mode})`, kind: 'auto' });
  onProgress('백업', true);

  // 2. Images → R2 (canvas + any in props). Hero backgrounds get the 1920px path.
  onProgress('이미지 R2 업로드', false);
  const urls = new Set<string>(canvasImageUrls(canvasHtml));
  const bg = new Set<string>();
  for (const p of spec.pages) for (const s of p.sections) {
    collectPropUrls(s.props, urls);
    const b = s.props.backgroundImageUrl;
    if (typeof b === 'string' && b) bg.add(b);
  }
  const urlMap = urls.size > 0 ? await migrateImages([...urls], tenantSlug, undefined, bg) : new Map<string, string>();
  onProgress('이미지 R2 업로드', true);

  // 3. Theme tokens.
  onProgress('테마 적용', false);
  await updateThemeTokens(schema, buildChurchTheme(spec.styleguide));
  onProgress('테마 적용', true);

  // 4. 전면개편 → clear existing pages so only the new design remains.
  if (mode === '전면개편') {
    onProgress('기존 페이지 정리', false);
    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".page_sections`);
    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".pages`);
    onProgress('기존 페이지 정리', true);
    warnings.push('전면개편: 기존 메뉴가 새 페이지와 어긋날 수 있습니다(메뉴 재구성은 후속).');
  }

  // 5. Pages + sections (reuses migration applier: hero normalize + R2 swap).
  onProgress('페이지 생성', false);
  await applyPageContents(
    tenantSlug,
    spec.pages.map((p) => ({ pageSlug: p.slug, blocks: p.sections.map((s) => ({ blockType: s.blockType, props: s.props })) })),
    urlMap,
  );
  onProgress('페이지 생성', true);

  return {
    themeApplied: true,
    pages: spec.pages.map((p) => ({ slug: p.slug, sections: p.sections.length })),
    images: urlMap.size,
    backupId: backup.id,
    warnings,
  };
}
