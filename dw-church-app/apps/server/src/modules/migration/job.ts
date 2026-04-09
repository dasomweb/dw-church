/**
 * Migration job persistence — CRUD for migration_jobs table in public schema.
 * Supports save/resume across sessions.
 */

import { prisma } from '../../config/database.js';
import type {
  MigrationJob,
  MigrationStatus,
  RawExtractedData,
  ClassifiedData,
  ApplyResult,
} from './types.js';
import { emptyRawData, emptyClassifiedData, emptyApplyResult } from './types.js';

// ─── Ensure table exists ────────────────────────────────────

export async function ensureMigrationJobsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS migration_jobs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_slug     VARCHAR(100) NOT NULL,
      source_url      VARCHAR(500),
      youtube_channel_url VARCHAR(500),
      status          VARCHAR(20) DEFAULT 'draft',
      raw_data        JSONB DEFAULT '{}',
      classified_data JSONB DEFAULT '{}',
      apply_result    JSONB DEFAULT '{}',
      error_message   TEXT,
      created_by      UUID,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── Row → MigrationJob mapper ──────────────────────────────

interface JobRow {
  id: string;
  tenant_slug: string;
  source_url: string | null;
  youtube_channel_url: string | null;
  status: string;
  raw_data: unknown;
  classified_data: unknown;
  apply_result: unknown;
  error_message: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToJob(row: JobRow): MigrationJob {
  return {
    id: row.id,
    tenantSlug: row.tenant_slug,
    sourceUrl: row.source_url,
    youtubeChannelUrl: row.youtube_channel_url,
    status: row.status as MigrationStatus,
    rawData: (row.raw_data as RawExtractedData) || emptyRawData(),
    classifiedData: (row.classified_data as ClassifiedData) || emptyClassifiedData(),
    applyResult: (row.apply_result as ApplyResult) || emptyApplyResult(),
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ─── CRUD ───────────────────────────────────────────────────

export async function createJob(
  tenantSlug: string,
  sourceUrl: string,
  youtubeChannelUrl: string | null,
  createdBy: string | null,
): Promise<MigrationJob> {
  const rows = await prisma.$queryRawUnsafe<JobRow[]>(
    `INSERT INTO migration_jobs (tenant_slug, source_url, youtube_channel_url, created_by)
     VALUES ($1, $2, $3, $4::uuid)
     RETURNING *`,
    tenantSlug,
    sourceUrl || null,
    youtubeChannelUrl || null,
    createdBy,
  );
  return rowToJob(rows[0]!);
}

export async function getJob(id: string): Promise<MigrationJob | null> {
  const rows = await prisma.$queryRawUnsafe<JobRow[]>(
    `SELECT * FROM migration_jobs WHERE id = $1::uuid`,
    id,
  );
  return rows.length > 0 ? rowToJob(rows[0]!) : null;
}

export async function listJobs(tenantSlug?: string): Promise<MigrationJob[]> {
  const rows = tenantSlug
    ? await prisma.$queryRawUnsafe<JobRow[]>(
        `SELECT * FROM migration_jobs WHERE tenant_slug = $1 ORDER BY created_at DESC`,
        tenantSlug,
      )
    : await prisma.$queryRawUnsafe<JobRow[]>(
        `SELECT * FROM migration_jobs ORDER BY created_at DESC LIMIT 50`,
      );
  return rows.map(rowToJob);
}

export async function updateJobStatus(
  id: string,
  status: MigrationStatus,
  errorMessage?: string,
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE migration_jobs SET status = $1, error_message = $2, updated_at = NOW()
     WHERE id = $3::uuid`,
    status,
    errorMessage || null,
    id,
  );
}

export async function updateJobRawData(
  id: string,
  rawData: RawExtractedData,
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE migration_jobs SET raw_data = $1::jsonb, status = 'extracted', updated_at = NOW()
     WHERE id = $2::uuid`,
    JSON.stringify(rawData),
    id,
  );
}

export async function updateJobClassifiedData(
  id: string,
  classifiedData: ClassifiedData,
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE migration_jobs SET classified_data = $1::jsonb, status = 'classified', updated_at = NOW()
     WHERE id = $2::uuid`,
    JSON.stringify(classifiedData),
    id,
  );
}

export async function updateJobApplyResult(
  id: string,
  applyResult: ApplyResult,
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE migration_jobs SET apply_result = $1::jsonb, status = 'done', updated_at = NOW()
     WHERE id = $2::uuid`,
    JSON.stringify(applyResult),
    id,
  );
}

export async function deleteJob(id: string): Promise<void> {
  await prisma.$queryRawUnsafe(
    `DELETE FROM migration_jobs WHERE id = $1::uuid`,
    id,
  );
}
