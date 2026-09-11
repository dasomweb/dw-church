#!/usr/bin/env tsx
/**
 * reset-tenant — back up a tenant's pages + theme to a local JSON, then (only
 * with --confirm) DELETE ALL its pages via the authenticated pages API, leaving
 * an empty tenant ready for a fresh Claude Design import.
 *
 * ⚠ DESTRUCTIVE. Use ONLY on a sandbox/staging tenant (never a live church).
 * The backup makes it recoverable — restore by re-creating pages + sections from
 * the JSON (or with a restore script).
 *
 * Usage (creds + backup dir via ENV — never commit creds):
 *   TL_SUPER_EMAIL=.. TL_SUPER_PASSWORD=.. TL_BACKUP_DIR=/path \
 *   pnpm dlx tsx scripts/design-importer/reset-tenant.ts <slug> [--confirm]
 *
 * Without --confirm: DRY RUN — backs up + lists what WOULD be deleted, deletes nothing.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = process.env.TL_API_BASE || 'https://api-server-production-c612.up.railway.app';

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  const b = (await res.json()) as { accessToken?: string; data?: { accessToken?: string } };
  const t = b.accessToken ?? b.data?.accessToken;
  if (!t) throw new Error('login: no accessToken');
  return t;
}

interface PageRow { id: string; slug: string; title: string; is_home?: boolean }
interface FullPage { page: PageRow; sections: unknown[] }

async function main(): Promise<void> {
  const slug = process.argv[2];
  const confirm = process.argv.includes('--confirm');
  if (!slug || slug.startsWith('--')) { console.error('usage: reset-tenant.ts <slug> [--confirm]'); process.exit(2); }

  const email = process.env.TL_SUPER_EMAIL, password = process.env.TL_SUPER_PASSWORD;
  if (!email || !password) throw new Error('TL_SUPER_EMAIL / TL_SUPER_PASSWORD must be set (never commit them).');
  const backupDir = process.env.TL_BACKUP_DIR || process.cwd();

  const token = await login(email, password);
  const baseHeaders: Record<string, string> = { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug };
  // Only set Content-Type when there's a JSON body — a JSON content-type with an
  // empty body makes Fastify reject the request (FST_ERR_CTP_EMPTY_JSON_BODY),
  // which is what broke DELETE (no body).
  const req = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const headers = { ...baseHeaders };
    let payload: string | undefined;
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
    if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return (await res.json().catch(() => ({}))) as T;
  };

  // 1. list pages
  const listRaw = await req<{ data?: PageRow[] } | PageRow[]>('GET', '/api/v1/pages');
  const pages = Array.isArray(listRaw) ? listRaw : (listRaw.data ?? []);
  console.log(`▶ ${slug} — ${pages.length} pages found`);

  // 2. back up each page's full content + the theme
  const full: FullPage[] = [];
  for (const p of pages) {
    const one = await req<{ page: PageRow; sections: unknown[] }>('GET', `/api/v1/pages/${encodeURIComponent(p.slug)}`);
    full.push({ page: one.page ?? p, sections: one.sections ?? [] });
  }
  const theme = await req<unknown>('GET', '/api/v1/theme/tokens').catch(() => null);
  const backup = { tenant: slug, backedUpAt: new Date().toISOString(), theme, pages: full };
  const outFile = join(backupDir, `reset-backup-${slug}-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(backup, null, 2) + '\n');
  const totalSections = full.reduce((s, p) => s + p.sections.length, 0);
  console.log(`💾 backup → ${outFile}  (${full.length} pages, ${totalSections} sections, theme=${theme ? 'yes' : 'no'})`);

  if (!confirm) {
    console.log('\n[DRY RUN] would delete these pages (pass --confirm to actually delete):');
    for (const p of pages) console.log(`   - ${p.slug}  (${p.title})${p.is_home ? ' [home]' : ''}`);
    console.log(`\n(재실행: 동일 명령에 --confirm 추가)`);
    return;
  }

  // 3. delete every page
  console.log('\n🗑  deleting all pages…');
  let ok = 0; const failed: string[] = [];
  for (const p of pages) {
    try { await req('DELETE', `/api/v1/pages/${p.id}`); ok++; console.log(`   ✓ ${p.slug}`); }
    catch (e) { failed.push(`${p.slug}: ${e instanceof Error ? e.message : e}`); console.error(`   ✗ ${p.slug} — ${e instanceof Error ? e.message : e}`); }
  }
  // 4. verify empty
  const after = await req<{ data?: PageRow[] } | PageRow[]>('GET', '/api/v1/pages');
  const remaining = Array.isArray(after) ? after : (after.data ?? []);
  console.log(`\n✓ deleted ${ok}/${pages.length}. remaining: ${remaining.length}${remaining.length ? ' → ' + remaining.map((r) => r.slug).join(', ') : ' (empty)'}`);
  if (failed.length) { console.error(`⚠ ${failed.length} failed:\n  ${failed.join('\n  ')}`); }
  console.log(`\n복구가 필요하면 백업 파일에서 페이지·섹션을 재생성하세요: ${outFile}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
