import { prisma } from '../../config/database.js';
import type { CreateSupportTicketInput, UpdateSupportTicketInput } from './schema.js';

const TABLE = 'public.support_tickets';

export async function listTickets(status?: string) {
  const params: unknown[] = [];
  const where = status ? 'WHERE status = $1' : '';
  if (status) params.push(status);
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ${where} ORDER BY
       CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
       created_at DESC`,
    ...params,
  );
}

export async function getTicket(id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createTicket(
  input: CreateSupportTicketInput,
  ctx: { tenantSlug: string; email: string; name: string },
) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (tenant_slug, name, email, subject, message, status)
     VALUES ($1, $2, $3, $4, $5, 'open')
     RETURNING *`,
    ctx.tenantSlug || '',
    input.name || ctx.name || '',
    input.email || ctx.email || '',
    input.subject,
    input.message,
  );
  return rows[0];
}

export async function updateTicket(id: string, input: UpdateSupportTicketInput) {
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.status !== undefined) { set.push(`status = $${i++}`); values.push(input.status); }
  if (input.adminReply !== undefined) { set.push(`admin_reply = $${i++}`); values.push(input.adminReply ?? ''); }
  if (set.length === 0) return getTicket(id);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteTicket(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
}

export async function countOpenTickets(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM ${TABLE} WHERE status IN ('open','in_progress')`,
  );
  return Number(rows[0]?.count ?? 0);
}
