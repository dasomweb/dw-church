import { prisma } from '../../config/database.js';
import type { CreateContactInput, UpdateContactInput, ImportContactsInput, ListQuery } from './schema.js';

const TABLE = '"marketing_contacts"';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** JS string[] → a Postgres array literal (safe for `$n::text[]`). */
function toPgTextArray(arr: string[]): string {
  return `{${arr.map((t) => `"${String(t).replace(/(["\\])/g, '\\$1')}"`).join(',')}}`;
}

function normTags(tags?: string[] | null): string[] {
  return Array.from(new Set((tags ?? []).map((t) => t.trim()).filter(Boolean)));
}

export async function getStats(): Promise<{ total: number; subscribed: number; unsubscribed: number }> {
  const rows = await prisma.$queryRawUnsafe<{ status: string; n: number }[]>(
    `SELECT status, count(*)::int AS n FROM ${TABLE} GROUP BY status`,
  );
  let subscribed = 0;
  let unsubscribed = 0;
  for (const r of rows) {
    if (r.status === 'subscribed') subscribed = r.n;
    else if (r.status === 'unsubscribed') unsubscribed = r.n;
  }
  return { total: subscribed + unsubscribed, subscribed, unsubscribed };
}

export async function listTags(): Promise<{ tag: string; count: number }[]> {
  return prisma.$queryRawUnsafe<{ tag: string; count: number }[]>(
    `SELECT tag, count(*)::int AS count
       FROM ${TABLE}, unnest(tags) AS tag
      GROUP BY tag ORDER BY count DESC, tag ASC`,
  );
}

export async function listContacts(q: ListQuery): Promise<{ items: unknown[]; total: number; page: number; perPage: number }> {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? 50;
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q.status && q.status !== 'all') { where.push(`status = $${i++}`); params.push(q.status); }
  if (q.tag) { where.push(`$${i++} = ANY(tags)`); params.push(q.tag); }
  if (q.q) { where.push(`(email ILIKE $${i} OR name ILIKE $${i})`); params.push(`%${q.q}%`); i++; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM ${TABLE} ${whereSql}`, ...params,
  );
  const total = totalRows[0]?.n ?? 0;

  const items = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT id, email, name, tags, status, source, note, created_at, updated_at
       FROM ${TABLE} ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
    ...params, perPage, (page - 1) * perPage,
  );
  return { items, total, page, perPage };
}

export async function createContact(input: CreateContactInput): Promise<unknown> {
  const tags = normTags(input.tags);
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `INSERT INTO ${TABLE} (email, name, tags, status, source, note)
     VALUES ($1, $2, $3::text[], $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE ${TABLE}.name END,
       tags = (SELECT array(SELECT DISTINCT unnest(${TABLE}.tags || excluded.tags))),
       status = excluded.status,
       note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE ${TABLE}.note END,
       updated_at = NOW()
     RETURNING *`,
    input.email, input.name ?? '', toPgTextArray(tags), input.status ?? 'subscribed', input.source ?? 'manual', input.note ?? '',
  );
  return rows[0];
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<unknown | null> {
  const set: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.email !== undefined) { set.push(`email = $${i++}`); params.push(input.email); }
  if (input.name !== undefined) { set.push(`name = $${i++}`); params.push(input.name); }
  if (input.tags !== undefined) { set.push(`tags = $${i++}::text[]`); params.push(toPgTextArray(normTags(input.tags))); }
  if (input.status !== undefined) { set.push(`status = $${i++}`); params.push(input.status); }
  if (input.note !== undefined) { set.push(`note = $${i++}`); params.push(input.note); }
  if (set.length === 0) {
    const cur = await prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM ${TABLE} WHERE id = $1::uuid`, id);
    return cur[0] ?? null;
  }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...params, id,
  );
  return rows[0] ?? null;
}

export async function deleteContact(id: string): Promise<boolean> {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
  return n > 0;
}

/** Parse a raw CSV/pasted blob into {email,name,tags[]} rows (header auto-detected). */
function parseCsv(csv: string): { email: string; name: string; tags: string[] }[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let k = 0; k < line.length; k++) {
      const ch = line[k];
      if (inQ) {
        if (ch === '"' && line[k + 1] === '"') { cur += '"'; k++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  let emailIdx = 0, nameIdx = 1, tagsIdx = 2;
  let start = 0;
  const first = splitLine(lines[0]!).map((s) => s.toLowerCase());
  const looksLikeHeader = first.some((c) => c === 'email' || c === 'e-mail' || c === '이메일');
  if (looksLikeHeader) {
    start = 1;
    const idxOf = (names: string[]) => first.findIndex((c) => names.includes(c));
    const e = idxOf(['email', 'e-mail', '이메일']); if (e >= 0) emailIdx = e;
    const n = idxOf(['name', 'fullname', '이름', '성명']); nameIdx = n; // may be -1
    const t = idxOf(['tags', 'tag', '태그', 'group', 'list', '그룹']); tagsIdx = t; // may be -1
  }

  const rows: { email: string; name: string; tags: string[] }[] = [];
  for (let li = start; li < lines.length; li++) {
    const cols = splitLine(lines[li]!);
    const email = (cols[emailIdx] ?? '').trim();
    if (!email) continue;
    const name = nameIdx >= 0 ? (cols[nameIdx] ?? '').trim() : '';
    const tagRaw = tagsIdx >= 0 ? (cols[tagsIdx] ?? '').trim() : '';
    const tags = tagRaw ? tagRaw.split(/[;|]/).map((s) => s.trim()).filter(Boolean) : [];
    rows.push({ email, name, tags });
  }
  return rows;
}

export async function importContacts(
  input: ImportContactsInput,
): Promise<{ received: number; imported: number; invalid: number; invalidSamples: string[] }> {
  const defaultTags = normTags(input.tags);
  const source = input.source || 'import';

  // Gather raw rows from csv or rows[].
  const raw: { email: string; name: string; tags: string[] }[] = [];
  if (input.csv) raw.push(...parseCsv(input.csv));
  if (input.rows) {
    for (const r of input.rows) {
      const tags = Array.isArray(r.tags) ? r.tags : typeof r.tags === 'string' ? r.tags.split(/[;|,]/) : [];
      raw.push({ email: (r.email ?? '').trim(), name: (r.name ?? '').trim(), tags: tags.map((s) => s.trim()).filter(Boolean) });
    }
  }

  // Normalize + validate + dedupe by email (merge tags, keep first non-empty name).
  const byEmail = new Map<string, { email: string; name: string; tags: Set<string> }>();
  let invalid = 0;
  const invalidSamples: string[] = [];
  for (const r of raw) {
    const email = r.email.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      invalid++;
      if (invalidSamples.length < 5) invalidSamples.push(r.email);
      continue;
    }
    const existing = byEmail.get(email);
    if (existing) {
      for (const t of r.tags) existing.tags.add(t);
      if (!existing.name && r.name) existing.name = r.name;
    } else {
      byEmail.set(email, { email, name: r.name, tags: new Set([...defaultTags, ...r.tags]) });
    }
  }
  const contacts = [...byEmail.values()];

  // Chunked multi-row upsert (tag union on conflict).
  const CHUNK = 200;
  let imported = 0;
  for (let c = 0; c < contacts.length; c += CHUNK) {
    const group = contacts.slice(c, c + CHUNK);
    const valueSql: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const g of group) {
      valueSql.push(`($${i++}, $${i++}, $${i++}::text[], 'subscribed', $${i++})`);
      params.push(g.email, g.name, toPgTextArray([...g.tags]), source);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE} (email, name, tags, status, source)
       VALUES ${valueSql.join(', ')}
       ON CONFLICT (email) DO UPDATE SET
         name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE ${TABLE}.name END,
         tags = (SELECT array(SELECT DISTINCT unnest(${TABLE}.tags || excluded.tags))),
         updated_at = NOW()`,
      ...params,
    );
    imported += group.length;
  }

  return { received: raw.length, imported, invalid, invalidSamples };
}

/** Subscribed emails for a broadcast, optionally filtered to any of `tags`. */
export async function subscribedEmails(tags?: string[]): Promise<string[]> {
  const clean = normTags(tags);
  if (clean.length > 0) {
    const rows = await prisma.$queryRawUnsafe<{ email: string }[]>(
      `SELECT email FROM ${TABLE} WHERE status = 'subscribed' AND tags && $1::text[]`,
      toPgTextArray(clean),
    );
    return rows.map((r) => r.email);
  }
  const rows = await prisma.$queryRawUnsafe<{ email: string }[]>(
    `SELECT email FROM ${TABLE} WHERE status = 'subscribed'`,
  );
  return rows.map((r) => r.email);
}
