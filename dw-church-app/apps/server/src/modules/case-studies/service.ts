import { prisma } from '../../config/database.js';

// 포트폴리오 / 케이스 스터디 — operator-curated showcase of churches we've built.
// Platform-level (public schema), super-admin curated, public marketing page reads
// only the published ones.

export interface CaseStudyInput {
  churchName?: string;
  tagline?: string | null;
  screenshotUrl?: string | null;
  liveUrl?: string | null;
  tags?: string[] | null;
  sortOrder?: number | null;
  isPublished?: boolean;
}

interface Row {
  id: string;
  church_name: string;
  tagline: string | null;
  screenshot_url: string | null;
  live_url: string | null;
  tags: unknown;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export function toClient(row: Row) {
  return {
    id: row.id,
    churchName: row.church_name,
    tagline: row.tagline,
    screenshotUrl: row.screenshot_url,
    liveUrl: row.live_url,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Published case studies, ordered for the public portfolio page. */
export async function listPublished() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM public.case_studies WHERE is_published = true
     ORDER BY sort_order ASC, created_at DESC`,
  );
  return rows.map(toClient);
}

/** All case studies (super-admin), including drafts. */
export async function listAll() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM public.case_studies ORDER BY sort_order ASC, created_at DESC`,
  );
  return rows.map(toClient);
}

export async function create(input: CaseStudyInput) {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO public.case_studies
       (church_name, tagline, screenshot_url, live_url, tags, sort_order, is_published)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING *`,
    input.churchName ?? '',
    input.tagline ?? null,
    input.screenshotUrl ?? null,
    input.liveUrl ?? null,
    JSON.stringify(input.tags ?? []),
    input.sortOrder ?? 0,
    input.isPublished ?? false,
  );
  return toClient(rows[0]!);
}

const COLUMN_MAP: Record<string, string> = {
  churchName: 'church_name',
  tagline: 'tagline',
  screenshotUrl: 'screenshot_url',
  liveUrl: 'live_url',
  sortOrder: 'sort_order',
  isPublished: 'is_published',
};

export async function update(id: string, input: CaseStudyInput) {
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) { set.push(`"${col}" = $${i++}`); vals.push(v ?? null); }
  }
  // tags is jsonb — handle separately so it gets the ::jsonb cast.
  if (input.tags !== undefined) { set.push(`tags = $${i++}::jsonb`); vals.push(JSON.stringify(input.tags ?? [])); }
  if (set.length === 0) {
    const rows = await prisma.$queryRawUnsafe<Row[]>(`SELECT * FROM public.case_studies WHERE id = $1::uuid`, id);
    return rows[0] ? toClient(rows[0]) : null;
  }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `UPDATE public.case_studies SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...vals, id,
  );
  return rows[0] ? toClient(rows[0]) : null;
}

export async function remove(id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM public.case_studies WHERE id = $1::uuid`, id);
}
