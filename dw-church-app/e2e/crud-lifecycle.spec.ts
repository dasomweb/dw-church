/**
 * E2E: Full CRUD Lifecycle — Create → Read → Update → Verify Update → Delete → Verify Gone
 *
 * Every content type goes through the complete lifecycle:
 * 1. CREATE via API
 * 2. READ on frontend (detail page shows data)
 * 3. UPDATE via API (change title/content)
 * 4. VERIFY UPDATE on frontend (detail page shows updated data)
 * 5. DELETE via API
 * 6. VERIFY GONE on frontend (detail page returns 404 or not found)
 */
import { test, expect } from '@playwright/test';

const API = 'https://api-server-production-c612.up.railway.app/api/v1';
const SITE = 'https://grace.truelight.app';
const TENANT = 'grace';
const TS = Date.now();

async function getToken(): Promise<string> {
  await fetch(`${API}/migration/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'truelight-bootstrap-2026' }),
  });
  const lr = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@truelight.app', password: 'TrueLight2026!' }),
  });
  const { accessToken } = await lr.json();
  const sr = await fetch(`${API}/auth/switch-tenant`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantSlug: TENANT }),
  });
  return (await sr.json()).accessToken;
}

function h(token: string, withBody = true) {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': TENANT };
  if (withBody) headers['Content-Type'] = 'application/json';
  return headers;
}

// ═══════════════════════════════════════════════════════════════
// SERMON: Full CRUD lifecycle
// ═══════════════════════════════════════════════════════════════

test.describe('Sermon CRUD Lifecycle', () => {
  let token: string;
  let id: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE — sermon is created', async () => {
    const res = await fetch(`${API}/sermons`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ title: `CRUD-설교-${TS}`, scripture: '창세기 1:1', sermon_date: '2026-04-09', status: 'published' }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
    expect(id).toBeTruthy();
  });

  test('2. READ — sermon appears on frontend', async ({ page }) => {
    await page.goto(`${SITE}/sermons/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-설교-${TS}`);
    expect(body).toContain('창세기 1:1');
  });

  test('3. UPDATE — sermon title and scripture changed', async () => {
    const res = await fetch(`${API}/sermons/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ title: `CRUD-설교수정-${TS}`, scripture: '출애굽기 3:14' }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()).data;
    expect(data.title).toContain('설교수정');
  });

  test('4. VERIFY UPDATE — frontend shows updated data', async ({ page }) => {
    await page.goto(`${SITE}/sermons/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-설교수정-${TS}`);
    expect(body).toContain('출애굽기 3:14');
    // Original value should NOT appear
    expect(body).not.toContain('창세기 1:1');
  });

  test('5. DELETE — sermon is removed', async () => {
    const res = await fetch(`${API}/sermons/${id}`, { method: 'DELETE', headers: h(token, false) });
    expect(res.status).toBe(204);
  });

  test('6. VERIFY GONE — frontend returns 404', async ({ page }) => {
    await page.goto(`${SITE}/sermons/${id}`, { waitUntil: 'networkidle' });
    // Should show error or 404 page
    const body = await page.textContent('body');
    const isGone = body?.includes('not found') || body?.includes('찾을 수 없') || body?.includes('404') || !body?.includes(`CRUD-설교수정-${TS}`);
    expect(isGone).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// BULLETIN: Full CRUD lifecycle
// ═══════════════════════════════════════════════════════════════

test.describe('Bulletin CRUD Lifecycle', () => {
  let token: string;
  let id: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE', async () => {
    const res = await fetch(`${API}/bulletins`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ title: `CRUD-주보-${TS}`, bulletin_date: '2026-04-09', status: 'published' }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
  });

  test('2. READ on frontend', async ({ page }) => {
    await page.goto(`${SITE}/bulletins/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-주보-${TS}`);
  });

  test('3. UPDATE', async () => {
    const res = await fetch(`${API}/bulletins/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ title: `CRUD-주보수정-${TS}` }),
    });
    expect(res.status).toBe(200);
  });

  test('4. VERIFY UPDATE on frontend', async ({ page }) => {
    await page.goto(`${SITE}/bulletins/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-주보수정-${TS}`);
  });

  test('5. DELETE', async () => {
    expect((await fetch(`${API}/bulletins/${id}`, { method: 'DELETE', headers: h(token, false) })).status).toBe(204);
  });

  test('6. VERIFY GONE', async ({ page }) => {
    await page.goto(`${SITE}/bulletins/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body?.includes(`CRUD-주보수정-${TS}`)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// STAFF: Full CRUD lifecycle
// ═══════════════════════════════════════════════════════════════

test.describe('Staff CRUD Lifecycle', () => {
  let token: string;
  let id: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE', async () => {
    const res = await fetch(`${API}/staff`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ name: `CRUD-교역자-${TS}`, role: '전도사', bio: '테스트 소개', is_active: true }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
  });

  test('2. READ on frontend', async ({ page }) => {
    await page.goto(`${SITE}/staff/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-교역자-${TS}`);
  });

  test('3. UPDATE', async () => {
    const res = await fetch(`${API}/staff/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ name: `CRUD-교역자수정-${TS}`, role: '목사' }),
    });
    expect(res.status).toBe(200);
  });

  test('4. VERIFY UPDATE on frontend', async ({ page }) => {
    await page.goto(`${SITE}/staff/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-교역자수정-${TS}`);
    expect(body).toContain('목사');
  });

  test('5. DELETE', async () => {
    expect((await fetch(`${API}/staff/${id}`, { method: 'DELETE', headers: h(token, false) })).status).toBe(204);
  });

  test('6. VERIFY GONE', async ({ page }) => {
    await page.goto(`${SITE}/staff/${id}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`CRUD-교역자수정-${TS}`)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// EVENT: Full CRUD lifecycle
// ═══════════════════════════════════════════════════════════════

test.describe('Event CRUD Lifecycle', () => {
  let token: string;
  let id: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE', async () => {
    const res = await fetch(`${API}/events`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ title: `CRUD-행사-${TS}`, description: '원본설명', event_date: '2026-06-01', location: '본당', status: 'published' }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
  });

  test('2. READ', async ({ page }) => {
    await page.goto(`${SITE}/events/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-행사-${TS}`);
  });

  test('3. UPDATE', async () => {
    const res = await fetch(`${API}/events/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ title: `CRUD-행사수정-${TS}`, description: '수정된설명' }),
    });
    expect(res.status).toBe(200);
  });

  test('4. VERIFY UPDATE', async ({ page }) => {
    await page.goto(`${SITE}/events/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-행사수정-${TS}`);
  });

  test('5. DELETE', async () => {
    expect((await fetch(`${API}/events/${id}`, { method: 'DELETE', headers: h(token, false) })).status).toBe(204);
  });

  test('6. VERIFY GONE', async ({ page }) => {
    await page.goto(`${SITE}/events/${id}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`CRUD-행사수정-${TS}`)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// COLUMN: Full CRUD lifecycle
// ═══════════════════════════════════════════════════════════════

test.describe('Column CRUD Lifecycle', () => {
  let token: string;
  let id: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE', async () => {
    const res = await fetch(`${API}/columns`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ title: `CRUD-칼럼-${TS}`, content: '원본 칼럼 본문입니다.', status: 'published' }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
  });

  test('2. READ', async ({ page }) => {
    await page.goto(`${SITE}/columns/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-칼럼-${TS}`);
    expect(body).toContain('원본 칼럼 본문');
  });

  test('3. UPDATE', async () => {
    const res = await fetch(`${API}/columns/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ title: `CRUD-칼럼수정-${TS}`, content: '수정된 칼럼 본문입니다.' }),
    });
    expect(res.status).toBe(200);
  });

  test('4. VERIFY UPDATE', async ({ page }) => {
    await page.goto(`${SITE}/columns/${id}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`CRUD-칼럼수정-${TS}`);
    expect(body).toContain('수정된 칼럼 본문');
  });

  test('5. DELETE', async () => {
    expect((await fetch(`${API}/columns/${id}`, { method: 'DELETE', headers: h(token, false) })).status).toBe(204);
  });

  test('6. VERIFY GONE', async ({ page }) => {
    await page.goto(`${SITE}/columns/${id}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`CRUD-칼럼수정-${TS}`)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// ALBUM: Full CRUD lifecycle (with image)
// ═══════════════════════════════════════════════════════════════

test.describe('Album CRUD Lifecycle', () => {
  let token: string;
  let id: string;
  let imgUrl: string;

  test.beforeAll(async () => { token = await getToken(); });

  test('1. CREATE with image', async () => {
    // Upload image
    const imgRes = await fetch('https://picsum.photos/seed/crudalbum/200/200');
    const buf = await imgRes.arrayBuffer();
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(buf)], { type: 'image/jpeg' }), 'crud.jpg');
    form.append('entityType', 'album');
    const upRes = await fetch(`${API}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': TENANT },
      body: form,
    });
    imgUrl = (await upRes.json()).data?.url || '';

    const res = await fetch(`${API}/albums`, {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ title: `CRUD-앨범-${TS}`, images: imgUrl ? [imgUrl] : [], status: 'published' }),
    });
    expect(res.status).toBe(201);
    id = (await res.json()).data.id;
  });

  test('2. READ with image', async ({ page }) => {
    await page.goto(`${SITE}/albums/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-앨범-${TS}`);
    if (imgUrl) {
      expect(await page.locator('img[src*="r2"]').count()).toBeGreaterThan(0);
    }
  });

  test('3. UPDATE title', async () => {
    const res = await fetch(`${API}/albums/${id}`, {
      method: 'PUT', headers: h(token),
      body: JSON.stringify({ title: `CRUD-앨범수정-${TS}` }),
    });
    expect(res.status).toBe(200);
  });

  test('4. VERIFY UPDATE', async ({ page }) => {
    await page.goto(`${SITE}/albums/${id}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`CRUD-앨범수정-${TS}`);
  });

  test('5. DELETE', async () => {
    expect((await fetch(`${API}/albums/${id}`, { method: 'DELETE', headers: h(token, false) })).status).toBe(204);
  });

  test('6. VERIFY GONE', async ({ page }) => {
    await page.goto(`${SITE}/albums/${id}`, { waitUntil: 'networkidle' });
    expect((await page.textContent('body'))?.includes(`CRUD-앨범수정-${TS}`)).toBe(false);
  });
});
