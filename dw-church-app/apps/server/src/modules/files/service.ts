import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { prisma } from '../../config/database.js';
import { uploadFile, deleteFile, listObjectsByPrefix } from '../../config/r2.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';

// ─── Upload Limits ──────────────────────────────────────────
// Image resizing is done CLIENT-SIDE (browser Canvas API) to avoid
// server CPU load and reduce upload traffic. Server only validates size.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;        // 5MB per image (client resizes first)
// Documents (주보 PDF 등) can't be client-resized and scanned bulletins are
// commonly 10–20MB, so non-image files get a higher ceiling.
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;    // 25MB per non-image file
const MAX_IMAGES_PER_UPLOAD = 20;              // Max images in a single album upload

function maxSizeFor(contentType: string): number {
  return contentType.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
}

// Keep a document's ORIGINAL filename but strip path separators and the few
// characters that break R2 keys / URLs / Content-Disposition headers. Unicode
// (한글 등) is preserved — the public URL percent-encodes it (see r2.uploadFile)
// and the browser decodes it back on download. Used only for non-image files so
// 주보 PDF 등 download with a meaningful name instead of a uuid.
function safeDocumentName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() || 'file';
  const cleaned = base
    .replace(/[<>:"|?*\/]+/g, '') // filesystem/URL-hostile chars
    .replace(/\s+/g, '_')                       // spaces → underscores for tidy URLs
    .replace(/^\.+/, '');                       // no leading dots (hidden-file/relative)
  return cleaned.slice(0, 200) || 'file';
}

// ─── Upload ─────────────────────────────────────────────────

interface UploadParams {
  tenantSlug: string;
  schema: string;
  entityType: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
  /** 'upload' (default media) | 'reference' (AI-builder reference photo). */
  kind?: string;
  /** Reference-photo tags that drive AI image matching. */
  tags?: string[];
  description?: string;
}

export async function upload(params: UploadParams) {
  const { tenantSlug, schema, entityType, filename, contentType, buffer } = params;
  const kind = params.kind ?? 'upload';
  const tags = params.tags ?? null;
  const description = params.description ?? null;

  // File size check — images are held to a tighter cap than documents.
  const maxSize = maxSizeFor(contentType);
  if (buffer.length > maxSize) {
    throw new AppError(
      'FILE_TOO_LARGE',
      400,
      `File size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds the ${maxSize / 1024 / 1024}MB limit.`,
    );
  }

  // Images are uuid-named — they're derivative/resized, the original name is
  // irrelevant, and a flat key keeps the media-library backfill simple. Non-image
  // documents (주보 PDF 등) keep their ORIGINAL filename so downloads/links stay
  // meaningful; a per-file uuid *folder* guarantees uniqueness so two uploads
  // named the same never collide.
  const isImage = contentType.startsWith('image/');
  const uuid = randomUUID();
  const storageKey = isImage
    ? `tenant_${tenantSlug}/${entityType}/${uuid}${extname(filename) || '.bin'}`
    : `tenant_${tenantSlug}/${entityType}/${uuid}/${safeDocumentName(filename)}`;

  const url = await uploadFile(storageKey, buffer, contentType);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".files
       (original_name, storage_key, url, mime_type, size_bytes, entity_type, kind, tags, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    filename,
    storageKey,
    url,
    contentType,
    buffer.length,
    entityType,
    kind,
    tags,
    description,
  );

  // Convert BigInt values to Number for JSON serialization
  const row = rows[0];
  if (row) {
    for (const key of Object.keys(row)) {
      if (typeof row[key] === 'bigint') row[key] = Number(row[key]);
    }
  }
  return row;
}

// ─── Bulk Upload (albums) ───────────────────────────────────

interface BulkUploadParams {
  tenantSlug: string;
  schema: string;
  entityType: string;
  files: { filename: string; contentType: string; buffer: Buffer }[];
}

export async function uploadBulk(params: BulkUploadParams) {
  const { files } = params;

  if (files.length > MAX_IMAGES_PER_UPLOAD) {
    throw new AppError(
      'TOO_MANY_FILES',
      400,
      `Maximum ${MAX_IMAGES_PER_UPLOAD} files per upload. You sent ${files.length}.`,
    );
  }

  const results = [];
  for (const file of files) {
    const result = await upload({
      ...params,
      filename: file.filename,
      contentType: file.contentType,
      buffer: file.buffer,
    });
    results.push(result);
  }
  return results;
}

// ─── Backfill migration images ──────────────────────────────
// Images can land in R2 under tenant_<slug>/ via paths that never create a
// `files` row: the WordPress migration (…/migration/), one-off import scripts
// (…/general/), and any future bulk path. The media library lists ONLY `files`
// rows, so those images are invisible until registered. This scans the WHOLE
// tenant prefix (not just migration/) and registers every image that has no
// `files` row yet. Idempotent — re-running only adds what's missing.

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

export async function backfillMigration(
  schema: string,
  tenantSlug: string,
): Promise<{ added: number; total: number }> {
  // Scan the entire tenant prefix so general/ (import-script) uploads and any
  // other sub-path are caught — not only migration/.
  const prefix = `tenant_${tenantSlug}/`;
  const objects = await listObjectsByPrefix(prefix);
  if (objects.length === 0) return { added: 0, total: 0 };

  const existing = await prisma.$queryRawUnsafe<{ storage_key: string }[]>(
    `SELECT storage_key FROM "${schema}".files WHERE storage_key LIKE $1`,
    `${prefix}%`,
  );
  const have = new Set(existing.map((e) => e.storage_key));

  let added = 0;
  let imageCount = 0;
  for (const obj of objects) {
    const ext = (obj.key.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue; // only register images (skip PDFs / unknown)
    imageCount++;
    if (have.has(obj.key)) continue;
    const url = `${env.R2_PUBLIC_URL}/${obj.key}`;
    const name = obj.key.split('/').pop() ?? 'image';
    // entity_type = the sub-path segment after the tenant prefix
    // (migration / general / sermons / …) so the operator can tell where an
    // image came from; falls back to 'import'.
    const subPath = obj.key.slice(prefix.length).split('/')[0] || 'import';
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".files
           (original_name, storage_key, url, mime_type, size_bytes, entity_type, kind, tags, description)
         VALUES ($1, $2, $3, $4, $5, $6, 'upload', NULL, $7)`,
        name, obj.key, url, mime, obj.size, subPath, 'R2에서 등록한 이미지',
      );
      added++;
    } catch { /* skip a single failed row */ }
  }
  // total = images under the prefix (not raw object count, which includes PDFs).
  return { added, total: imageCount };
}

// ─── Delete ─────────────────────────────────────────────────

export async function remove(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ storage_key: string }[]>(
    `SELECT storage_key FROM "${schema}".files WHERE id = $1::uuid`, id,
  );

  if (rows.length === 0) return false;

  await deleteFile(rows[0]!.storage_key);
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".files WHERE id = $1::uuid`, id);
  return true;
}

// ─── List ───────────────────────────────────────────────────

interface ListParams {
  page: number;
  perPage: number;
  entityType?: string;
  kind?: string;
}

export async function listFiles(schema: string, params: ListParams) {
  const { page, perPage, entityType, kind } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (entityType) {
    whereClause += ` AND entity_type = $${paramIndex++}`;
    values.push(entityType);
  }
  if (kind) {
    whereClause += ` AND kind = $${paramIndex++}`;
    values.push(kind);
  }

  const [rawRows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".files ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".files ${whereClause}`,
      ...values,
    ),
  ]);

  // size_bytes is BIGINT → Prisma returns it as BigInt, which JSON.stringify
  // can't serialize → 500. Convert any BigInt fields to Number.
  const data = rawRows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const k of Object.keys(out)) {
      if (typeof out[k] === 'bigint') out[k] = Number(out[k]);
    }
    return out;
  });

  return { data, total: countResult[0].total };
}
