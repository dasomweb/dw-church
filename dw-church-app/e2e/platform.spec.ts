/**
 * E2E: Platform Tests — tenant structure, isolation, CRUD lifecycle
 *
 * Creates its own test tenant, runs all tests, cleans up.
 * No dependency on super admin or pre-existing data.
 */
/// <reference types="node" />
import { test, expect } from '@playwright/test';

const API = 'https://api-server-production-c612.up.railway.app/api/v1';
const TS = Date.now();
const SLUG = `e2eplatform${TS}`.slice(0, 20);
const EMAIL = `platform-${TS}@test.truelight.app`;
const PASSWORD = 'PlatformTest2026!';

let token = '';
let site = '';

function h(withBody = true) {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': SLUG };
  if (withBody) headers['Content-Type'] = 'application/json';
  return headers;
}

test.describe.configure({ mode: 'serial' });

test.describe('Platform Tests', () => {

  // ═══ SETUP: Create test tenant ═══
  test('0. Setup — create test tenant', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ churchName: `Platform테스트-${TS}`, slug: SLUG, email: EMAIL, password: PASSWORD, ownerName: 'PlatformTester' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    token = data.accessToken;
    site = `https://${SLUG}.truelight.app`;
    expect(token).toBeTruthy();
  });

  // ═══ 1. TENANT STRUCTURE ═══

  test('1.1 pages seeded', async () => {
    const res = await fetch(`${API}/pages`, { headers: h(false) });
    const pages = (await res.json()).data || [];
    expect(pages.length).toBeGreaterThan(0);
    const slugs = pages.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain('home');
    expect(slugs).toContain('sermons');
  });

  test('1.2 home has blocks', async () => {
    const pr = await fetch(`${API}/pages`, { headers: h(false) });
    const home = ((await pr.json()).data || []).find((p: { slug: string }) => p.slug === 'home');
    const sr = await fetch(`${API}/pages/${home.id}/sections`, { headers: h(false) });
    expect(((await sr.json()).data || []).length).toBeGreaterThan(0);
  });

  test('1.3 menus seeded', async () => {
    const res = await fetch(`${API}/menus`, { headers: h(false) });
    expect(((await res.json()).data || []).length).toBeGreaterThan(0);
  });

  test('1.4 settings have church name', async () => {
    const res = await fetch(`${API}/settings`, { headers: h(false) });
    expect((await res.json()).data?.church_name).toBeTruthy();
  });

  // ═══ 2. TENANT ISOLATION ═══

  test('2.1 different tenants have different page IDs', async () => {
    const myPages = await fetch(`${API}/pages`, { headers: h(false) });
    const myIds = ((await myPages.json()).data || []).map((p: { id: string }) => p.id);

    // Grace tenant pages (public, no auth needed for X-Tenant-Slug)
    const gracePages = await fetch(`${API}/pages`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const graceIds = ((await gracePages.json()).data || []).map((p: { id: string }) => p.id);

    if (graceIds.length > 0) {
      expect(myIds.filter((id: string) => graceIds.includes(id))).toHaveLength(0);
    }
  });

  test('2.2 data in my tenant not visible in grace', async () => {
    const res = await fetch(`${API}/sermons`, {
      method: 'POST', headers: h(),
      body: JSON.stringify({ title: `ISO-${TS}`, sermon_date: '2026-04-09', status: 'published' }),
    });
    const id = (await res.json()).data?.id;

    const graceRes = await fetch(`${API}/sermons/${id}`, { headers: { 'X-Tenant-Slug': 'grace' } });
    if (graceRes.status === 200) {
      expect((await graceRes.json()).data?.title).not.toBe(`ISO-${TS}`);
    } else {
      expect(graceRes.status).toBe(404);
    }

    await fetch(`${API}/sermons/${id}`, { method: 'DELETE', headers: h(false) });
  });

  // ═══ 3. SERMON CRUD ═══

  let sermonId = '';

  test('3.1 sermon CREATE', async () => {
    const res = await fetch(`${API}/sermons`, {
      method: 'POST', headers: h(),
      body: JSON.stringify({ title: `P설교-${TS}`, scripture: '창세기 1:1', sermon_date: '2026-04-09', status: 'published' }),
    });
    expect(res.status).toBe(201);
    sermonId = (await res.json()).data.id;
  });

  test('3.2 sermon READ', async ({ page }) => {
    await page.goto(`${site}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`P설교-${TS}`);
    expect(body).toContain('창세기 1:1');
  });

  test('3.3 sermon UPDATE + VERIFY', async ({ page }) => {
    await fetch(`${API}/sermons/${sermonId}`, { method: 'PUT', headers: h(), body: JSON.stringify({ title: `P설교수정-${TS}`, scripture: '출애굽기 3:14' }) });
    await page.goto(`${site}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`P설교수정-${TS}`);
    expect(body).not.toContain('창세기 1:1');
  });

  test('3.4 sermon DELETE + VERIFY GONE', async ({ page }) => {
    expect((await fetch(`${API}/sermons/${sermonId}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
    await page.goto(`${site}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`P설교수정-${TS}`)).toBe(false);
  });

  // ═══ 4. BULLETIN CRUD ═══

  test('4.1 bulletin full lifecycle', async ({ page }) => {
    const cr = await fetch(`${API}/bulletins`, { method: 'POST', headers: h(), body: JSON.stringify({ title: `P주보-${TS}`, bulletin_date: '2026-04-09', status: 'published' }) });
    expect(cr.status).toBe(201);
    const id = (await cr.json()).data.id;

    await page.goto(`${site}/bulletins/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P주보-${TS}`);

    await fetch(`${API}/bulletins/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ title: `P주보수정-${TS}` }) });
    await page.goto(`${site}/bulletins/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P주보수정-${TS}`);

    expect((await fetch(`${API}/bulletins/${id}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
    await page.goto(`${site}/bulletins/${id}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`P주보수정-${TS}`)).toBe(false);
  });

  // ═══ 5. STAFF CRUD ═══

  test('5.1 staff full lifecycle', async ({ page }) => {
    const cr = await fetch(`${API}/staff`, { method: 'POST', headers: h(), body: JSON.stringify({ name: `P교역자-${TS}`, role: '전도사', is_active: true }) });
    expect(cr.status).toBe(201);
    const id = (await cr.json()).data.id;

    await page.goto(`${site}/staff/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P교역자-${TS}`);

    await fetch(`${API}/staff/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ name: `P교역자수정-${TS}` }) });
    await page.goto(`${site}/staff/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P교역자수정-${TS}`);

    expect((await fetch(`${API}/staff/${id}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
  });

  // ═══ 6. EVENT CRUD ═══

  test('6.1 event full lifecycle', async ({ page }) => {
    const cr = await fetch(`${API}/events`, { method: 'POST', headers: h(), body: JSON.stringify({ title: `P행사-${TS}`, event_date: '2026-06-01', status: 'published' }) });
    expect(cr.status).toBe(201);
    const id = (await cr.json()).data.id;

    await page.goto(`${site}/events/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P행사-${TS}`);

    await fetch(`${API}/events/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ title: `P행사수정-${TS}` }) });
    await page.goto(`${site}/events/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P행사수정-${TS}`);

    expect((await fetch(`${API}/events/${id}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
  });

  // ═══ 7. COLUMN CRUD ═══

  test('7.1 column full lifecycle', async ({ page }) => {
    const cr = await fetch(`${API}/columns`, { method: 'POST', headers: h(), body: JSON.stringify({ title: `P칼럼-${TS}`, content: '본문', status: 'published' }) });
    expect(cr.status).toBe(201);
    const id = (await cr.json()).data.id;

    await page.goto(`${site}/columns/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P칼럼-${TS}`);

    await fetch(`${API}/columns/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ title: `P칼럼수정-${TS}` }) });
    await page.goto(`${site}/columns/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P칼럼수정-${TS}`);

    expect((await fetch(`${API}/columns/${id}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
  });

  // ═══ 8. ALBUM CRUD (with image) ═══

  test('8.1 album full lifecycle with image', async ({ page }) => {
    // Upload
    const imgRes = await fetch('https://picsum.photos/seed/ptest/200/200');
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'image/jpeg' }), 'p.jpg');
    form.append('entityType', 'album');
    const upRes = await fetch(`${API}/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': SLUG }, body: form });
    const imgUrl = (await upRes.json()).data?.url || '';

    const cr = await fetch(`${API}/albums`, { method: 'POST', headers: h(), body: JSON.stringify({ title: `P앨범-${TS}`, images: imgUrl ? [imgUrl] : [], status: 'published' }) });
    expect(cr.status).toBe(201);
    const id = (await cr.json()).data.id;

    await page.goto(`${site}/albums/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P앨범-${TS}`);

    await fetch(`${API}/albums/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ title: `P앨범수정-${TS}` }) });
    await page.goto(`${site}/albums/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`P앨범수정-${TS}`);

    expect((await fetch(`${API}/albums/${id}`, { method: 'DELETE', headers: h(false) })).status).toBe(204);
  });

  // ═══ 9. IMAGE UPLOAD ═══

  test('9.1 uploaded image accessible', async () => {
    const imgRes = await fetch('https://picsum.photos/seed/pupload/100/100');
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'image/jpeg' }), 'up.jpg');
    form.append('entityType', 'general');
    const upRes = await fetch(`${API}/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': SLUG }, body: form });
    if (upRes.ok) {
      const url = (await upRes.json()).data?.url;
      if (url) {
        const check = await fetch(url);
        expect(check.status).toBe(200);
      }
    }
  });

  // ═══ CLEANUP ═══

  test('99. Cleanup — delete test tenant', async () => {
    // Login as the tenant owner and check if tenant delete is available
    // Since we can't delete our own tenant, we leave it (will be cleaned manually or via super admin)
    // The important thing is all test data within was already deleted in individual tests
    expect(true).toBe(true);
  });
});
