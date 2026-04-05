import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import sharp from 'sharp';
import { prisma } from '../../config/database.js';
import { uploadFile, deleteFile } from '../../config/r2.js';
import { AppError } from '../../middleware/error-handler.js';

// ─── Upload Limits ──────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024;      // 10MB per file
const MAX_IMAGE_DIMENSION = 1920;              // Resize images to max 1920px
const IMAGE_QUALITY = 80;                      // JPEG/WebP quality
const MAX_IMAGES_PER_UPLOAD = 20;              // Max images in a single album upload
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Resize image if it exceeds max dimensions.
 * Returns the processed buffer and final content type.
 */
async function processImage(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!IMAGE_TYPES.has(contentType)) {
    return { buffer, contentType };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // Skip if already within limits
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      // Still compress quality
      const processed = await image
        .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
        .toBuffer();
      return { buffer: processed, contentType: 'image/jpeg' };
    }

    // Resize to fit within max dimensions
    const processed = await image
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
      .toBuffer();

    return { buffer: processed, contentType: 'image/jpeg' };
  } catch {
    // If sharp fails (e.g., corrupted image), return original
    return { buffer, contentType };
  }
}

// ─── Upload ─────────────────────────────────────────────────

interface UploadParams {
  tenantSlug: string;
  schema: string;
  entityType: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export async function upload(params: UploadParams) {
  const { tenantSlug, schema, entityType, filename, contentType, buffer } = params;

  // File size check
  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError(
      'FILE_TOO_LARGE',
      400,
      `File size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`,
    );
  }

  // Process image (resize + compress)
  const processed = await processImage(buffer, contentType);

  const ext = IMAGE_TYPES.has(contentType) ? '.jpg' : (extname(filename) || '.bin');
  const uuid = randomUUID();
  const storageKey = `tenant_${tenantSlug}/${entityType}/${uuid}${ext}`;

  const url = await uploadFile(storageKey, processed.buffer, processed.contentType);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".files (original_name, storage_key, url, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    filename,
    storageKey,
    url,
    processed.contentType,
    processed.buffer.length,
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
}

export async function listFiles(schema: string, params: ListParams) {
  const { page, perPage, entityType } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (entityType) {
    whereClause += ` AND entity_type = $${paramIndex++}`;
    values.push(entityType);
  }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".files ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".files ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}
