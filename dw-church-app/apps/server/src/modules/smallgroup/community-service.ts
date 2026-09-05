import { prisma } from '../../config/database.js';
import type {
  CreateNoticeInput, UpdateNoticeInput, CreateResourceInput, UpdateResourceInput,
} from './schema.js';

/**
 * 스몰그룹 STEP 4 — 공지(NT) + 자료실(LB). 실제 알림톡/SMS/이메일 발송은 교회
 * 발송 계정(SG-02)이 있어야 나가므로, 여기서는 공지 저장 + 발송 플래그(어떤 채널로
 * 안내했는지 기록)만 관리한다. 자료실은 R2 업로드된 파일 URL 을 참조한다.
 */

// ── 공지(group_notices) ───────────────────────────────────
export async function listNotices(schema: string) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "${schema}".group_notices ORDER BY is_pinned DESC, created_at DESC LIMIT 300`);
}

export async function createNotice(schema: string, input: CreateNoticeInput) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".group_notices
       (title, body, target, is_pinned, publish_from, publish_to, send_alrimtalk, send_email, send_sms)
     VALUES ($1, $2, $3::jsonb, $4, $5::date, $6::date, $7, $8, $9) RETURNING *`,
    input.title, input.body ?? '', JSON.stringify(input.target ?? { scope: 'all' }),
    !!input.isPinned, input.publishFrom || null, input.publishTo || null,
    !!input.sendAlrimtalk, !!input.sendEmail, !!input.sendSms);
  return rows[0];
}

export async function updateNotice(schema: string, id: string, input: UpdateNoticeInput) {
  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const map: Record<string, { col: string; jsonb?: boolean; date?: boolean }> = {
    title: { col: 'title' }, body: { col: 'body' }, target: { col: 'target', jsonb: true },
    isPinned: { col: 'is_pinned' }, publishFrom: { col: 'publish_from', date: true }, publishTo: { col: 'publish_to', date: true },
    sendAlrimtalk: { col: 'send_alrimtalk' }, sendEmail: { col: 'send_email' }, sendSms: { col: 'send_sms' },
  };
  for (const [key, m] of Object.entries(map)) {
    const v = (input as any)[key];
    if (v === undefined) continue;
    if (m.jsonb) { set.push(`"${m.col}" = $${i++}::jsonb`); vals.push(JSON.stringify(v)); }
    else if (m.date) { set.push(`"${m.col}" = $${i++}::date`); vals.push(v || null); }
    else { set.push(`"${m.col}" = $${i++}`); vals.push(v); }
  }
  if (!set.length) { const c = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".group_notices WHERE id = $1::uuid`, id); return c[0] ?? null; }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".group_notices SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id);
  return rows[0] ?? null;
}

export async function deleteNotice(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".group_notices WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

// ── 자료실(group_resources) ───────────────────────────────
export async function listResources(schema: string, category?: string) {
  const where = category ? 'WHERE category = $1' : '';
  const params = category ? [category] : [];
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "${schema}".group_resources ${where} ORDER BY teaching_date DESC NULLS LAST, created_at DESC LIMIT 500`, ...params);
}

export async function createResource(schema: string, input: CreateResourceInput) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".group_resources
       (title, category, file_url, file_name, file_size, view_permission, teaching_date, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8) RETURNING *`,
    input.title, input.category ?? '', input.fileUrl ?? '', input.fileName ?? '', input.fileSize ?? 0,
    input.viewPermission ?? 'leaders', input.teachingDate || null, input.note ?? '');
  return rows[0];
}

export async function updateResource(schema: string, id: string, input: UpdateResourceInput) {
  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const map: Record<string, { col: string; date?: boolean }> = {
    title: { col: 'title' }, category: { col: 'category' }, fileUrl: { col: 'file_url' },
    fileName: { col: 'file_name' }, fileSize: { col: 'file_size' }, viewPermission: { col: 'view_permission' },
    teachingDate: { col: 'teaching_date', date: true }, note: { col: 'note' },
  };
  for (const [key, m] of Object.entries(map)) {
    const v = (input as any)[key];
    if (v === undefined) continue;
    if (m.date) { set.push(`"${m.col}" = $${i++}::date`); vals.push(v || null); }
    else { set.push(`"${m.col}" = $${i++}`); vals.push(v); }
  }
  if (!set.length) { const c = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".group_resources WHERE id = $1::uuid`, id); return c[0] ?? null; }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".group_resources SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id);
  return rows[0] ?? null;
}

export async function deleteResource(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".group_resources WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}
