import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { prisma } from '../../config/database.js';
import { uploadFile, deleteFile } from '../../config/r2.js';

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

  const ext = extname(filename) || '.bin';
  const uuid = randomUUID();
  const storageKey = `tenant_${tenantSlug}/${entityType}/${uuid}${ext}`;

  const url = await uploadFile(storageKey, buffer, contentType);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".files (original_name, storage_key, url, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    filename,
    storageKey,
    url,
    contentType,
    buffer.length,
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

export async function remove(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ storage_key: string }[]>(
    `SELECT storage_key FROM "${schema}".files WHERE id = $1::uuid`, id,
  );

  if (rows.length === 0) return false;

  await deleteFile(rows[0]!.storage_key);
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".files WHERE id = $1::uuid`, id);
  return true;
}

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
