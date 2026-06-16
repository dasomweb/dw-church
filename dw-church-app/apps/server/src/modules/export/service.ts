import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

/**
 * Tenant data export — the SaaS exit guarantee.
 *
 * Produces a single self-describing JSON archive of EVERYTHING a tenant owns:
 * every table in their isolated `tenant_{slug}` schema (pages, sections, menus,
 * theme, settings, and all content-module data) plus a manifest of every R2
 * image URL referenced anywhere in that data.
 *
 * Table names are NOT hardcoded — they're enumerated from information_schema, so
 * new content modules are picked up automatically. Image URLs are self-hosted on
 * R2 and stay reachable at the listed URLs, so the JSON + manifest together let a
 * customer reconstruct their site without us.
 */

export interface TenantExport {
  meta: {
    slug: string;
    churchName: string;
    plan: string;
    exportedAt: string;
    schema: string;
    tableCount: number;
    rowCount: number;
    imageCount: number;
    format: 'truelight-export@1';
  };
  tables: Record<string, unknown[]>;
  images: string[];
}

// Matches absolute http(s) URLs that look like uploaded assets. We keep it broad
// (any http URL) so external-but-referenced media is captured too; dedup later.
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi;
const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|svg|avif|bmp|pdf)(?:\?[^\s"'<>)\]]*)?$/i;

// bigint isn't JSON-serializable; Date should round-trip as ISO. Everything
// else passes through untouched.
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'bigint') out[k] = Number(v);
    else if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

function collectImageUrls(value: unknown, sink: Set<string>): void {
  if (value == null) return;
  if (typeof value === 'string') {
    const matches = value.match(URL_RE);
    if (matches) {
      for (const m of matches) {
        // Keep R2/asset-looking URLs (image/pdf extension) — skip page links.
        if (IMAGE_EXT_RE.test(m)) sink.add(m);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, sink);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectImageUrls(v, sink);
    }
  }
}

export async function exportTenant(
  slug: string,
  churchName: string,
  plan: string,
  exportedAt: string,
): Promise<TenantExport> {
  const schema = validateSchemaName(`tenant_${slug}`);

  // Enumerate every base table in the tenant schema (skip views / sequences).
  const tableRows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    schema,
  );

  const tables: Record<string, unknown[]> = {};
  const images = new Set<string>();
  let rowCount = 0;

  for (const { table_name } of tableRows) {
    // table_name comes from information_schema for our validated schema, but
    // double-quote it anyway so it can never break out of the identifier slot.
    const safeTable = table_name.replace(/"/g, '');
    // Raw DB rows (snake_case) — the faithful source-of-truth representation.
    // JSON.stringify can't serialize bigint, so coerce any bigint columns to a
    // number/string before they reach the response.
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}"."${safeTable}"`,
    );
    const safeRows = rows.map(normalizeRow);
    tables[table_name] = safeRows;
    rowCount += rows.length;
    collectImageUrls(safeRows, images);
  }

  return {
    meta: {
      slug,
      churchName,
      plan,
      exportedAt,
      schema,
      tableCount: tableRows.length,
      rowCount,
      imageCount: images.size,
      format: 'truelight-export@1',
    },
    tables,
    images: Array.from(images).sort(),
  };
}
