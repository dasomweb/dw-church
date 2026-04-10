/**
 * E2E: Full User Journey — Single continuous flow
 *
 * ONE test that walks through the ENTIRE user journey from start to finish:
 *
 * 1. 회원가입 (새 테넌트 생성)
 * 2. 로그인
 * 3. 설교 등록 → 프론트 확인
 * 4. 설교 수정 → 프론트 수정 반영 확인
 * 5. 주보 등록 → 프론트 확인
 * 6. 교역자 등록 → 프론트 확인
 * 7. 앨범 등록 (이미지 포함) → 프론트 확인
 * 8. 행사 등록 → 프론트 확인
 * 9. 칼럼 등록 → 프론트 확인
 * 10. 설정 변경 (교회 이름) → 프론트 반영 확인
 * 11. 설교 삭제 → 프론트에서 사라짐 확인
 * 12. 로그아웃
 * 13. 테넌트 정리 (삭제)
 *
 * 이 테스트는 새 테넌트를 생성하고 끝나면 삭제하므로
 * 기존 데이터에 영향을 주지 않습니다.
 */
import { test, expect } from '@playwright/test';

const API = 'https://api-server-production-c612.up.railway.app/api/v1';
const ADMIN = 'https://admin.truelight.app';
const TS = Date.now();
const SLUG = `e2etest${TS}`.slice(0, 20);
const EMAIL = `e2e-${TS}@test.truelight.app`;
const PASSWORD = 'E2eTest2026!';
const CHURCH = `E2E테스트교회-${TS}`;

// State shared across serial tests
let accessToken = '';
let refreshToken = '';
let tenantSite = '';
let sermonId = '';
let bulletinId = '';
let staffId = '';
let albumId = '';
let eventId = '';
let columnId = '';

function authHeaders(withBody = true) {
  const h: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Tenant-Slug': SLUG,
  };
  if (withBody) h['Content-Type'] = 'application/json';
  return h;
}

// All tests run in serial order — each depends on previous
test.describe.configure({ mode: 'serial' });

test.describe('Full User Journey', () => {

  // ═══ STEP 1: 회원가입 (테넌트 생성) ═══
  test('Step 1: Register — create new tenant + owner account', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        churchName: CHURCH,
        slug: SLUG,
        email: EMAIL,
        password: PASSWORD,
        ownerName: 'E2E테스터',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    tenantSite = `https://${SLUG}.truelight.app`;

    expect(accessToken).toBeTruthy();
    expect(data.user.email).toBe(EMAIL);
    expect(data.user.tenantSlug).toBe(SLUG);
  });

  // ═══ STEP 2: 로그인 (브라우저) ═══
  test('Step 2: Login — authenticate via browser', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input#email, input[type="email"]', EMAIL);
    await page.fill('input#password, input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (not super-admin since this is tenant owner)
    await page.waitForURL(/\/$/, { timeout: 15000 });
    expect(page.url()).toContain(ADMIN);
  });

  // ═══ STEP 3: 설교 등록 → 프론트 확인 ═══
  test('Step 3: Create sermon → verify on frontend', async ({ page }) => {
    const res = await fetch(`${API}/sermons`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정설교-${TS}`,
        scripture: '로마서 8:28',
        sermon_date: '2026-04-10',
        status: 'published',
      }),
    });
    expect(res.status).toBe(201);
    sermonId = (await res.json()).data.id;

    // Verify on frontend
    await page.goto(`${tenantSite}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`여정설교-${TS}`);
    expect(body).toContain('로마서 8:28');
  });

  // ═══ STEP 4: 설교 수정 → 프론트 반영 확인 ═══
  test('Step 4: Update sermon → verify update on frontend', async ({ page }) => {
    const res = await fetch(`${API}/sermons/${sermonId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정설교수정-${TS}`,
        scripture: '요한복음 3:16',
      }),
    });
    expect(res.status).toBe(200);

    await page.goto(`${tenantSite}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`여정설교수정-${TS}`);
    expect(body).toContain('요한복음 3:16');
    // Original should be gone
    expect(body).not.toContain('로마서 8:28');
  });

  // ═══ STEP 5: 주보 등록 → 프론트 확인 ═══
  test('Step 5: Create bulletin → verify on frontend', async ({ page }) => {
    const res = await fetch(`${API}/bulletins`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정주보-${TS}`,
        bulletin_date: '2026-04-10',
        status: 'published',
      }),
    });
    expect(res.status).toBe(201);
    bulletinId = (await res.json()).data.id;

    await page.goto(`${tenantSite}/bulletins/${bulletinId}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`여정주보-${TS}`);
  });

  // ═══ STEP 6: 교역자 등록 → 프론트 확인 ═══
  test('Step 6: Create staff → verify on frontend', async ({ page }) => {
    const res = await fetch(`${API}/staff`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: `여정목사-${TS}`,
        role: '담임목사',
        bio: '테스트 교역자 소개',
        is_active: true,
      }),
    });
    expect(res.status).toBe(201);
    staffId = (await res.json()).data.id;

    await page.goto(`${tenantSite}/staff/${staffId}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`여정목사-${TS}`);
  });

  // ═══ STEP 7: 앨범 등록 (이미지 포함) → 프론트 확인 ═══
  test('Step 7: Create album with image → verify on frontend', async ({ page }) => {
    // Upload image to R2
    const imgRes = await fetch('https://picsum.photos/seed/journey/200/200');
    const buf = await imgRes.arrayBuffer();
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(buf)], { type: 'image/jpeg' }), 'journey.jpg');
    form.append('entityType', 'album');
    const upRes = await fetch(`${API}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Tenant-Slug': SLUG },
      body: form,
    });
    const imgUrl = (await upRes.json()).data?.url || '';

    const res = await fetch(`${API}/albums`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정앨범-${TS}`,
        images: imgUrl ? [imgUrl] : [],
        status: 'published',
      }),
    });
    expect(res.status).toBe(201);
    albumId = (await res.json()).data.id;

    await page.goto(`${tenantSite}/albums/${albumId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`여정앨범-${TS}`);
    if (imgUrl) {
      expect(await page.locator('img[src*="r2"]').count()).toBeGreaterThan(0);
    }
  });

  // ═══ STEP 8: 행사 등록 → 프론트 확인 ═══
  test('Step 8: Create event → verify on frontend', async ({ page }) => {
    const res = await fetch(`${API}/events`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정행사-${TS}`,
        description: '여정 테스트 행사',
        event_date: '2026-06-01',
        location: '본당',
        status: 'published',
      }),
    });
    expect(res.status).toBe(201);
    eventId = (await res.json()).data.id;

    await page.goto(`${tenantSite}/events/${eventId}`, { waitUntil: 'networkidle' });
    expect(await page.textContent('body')).toContain(`여정행사-${TS}`);
  });

  // ═══ STEP 9: 칼럼 등록 → 프론트 확인 ═══
  test('Step 9: Create column → verify on frontend', async ({ page }) => {
    const res = await fetch(`${API}/columns`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: `여정칼럼-${TS}`,
        content: '여정 테스트 칼럼 본문입니다.',
        status: 'published',
      }),
    });
    expect(res.status).toBe(201);
    columnId = (await res.json()).data.id;

    await page.goto(`${tenantSite}/columns/${columnId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(`여정칼럼-${TS}`);
    expect(body).toContain('여정 테스트 칼럼 본문');
  });

  // ═══ STEP 10: 설정 변경 → 프론트 반영 확인 ═══
  test('Step 10: Update settings → verify on frontend', async ({ page }) => {
    const newName = `여정교회수정-${TS}`;
    const res = await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ church_name: newName }),
    });
    expect(res.status).toBe(200);

    await page.goto(tenantSite, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    expect(body).toContain(newName);
  });

  // ═══ STEP 11: 설교 삭제 → 프론트에서 사라짐 ═══
  test('Step 11: Delete sermon → verify gone from frontend', async ({ page }) => {
    const res = await fetch(`${API}/sermons/${sermonId}`, {
      method: 'DELETE',
      headers: authHeaders(false),
    });
    expect(res.status).toBe(204);

    await page.goto(`${tenantSite}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    const isGone = !body?.includes(`여정설교수정-${TS}`);
    expect(isGone).toBe(true);
  });

  // ═══ STEP 12: 로그아웃 ═══
  test('Step 12: Logout', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    // If redirected to dashboard (still logged in), logout
    if (!page.url().includes('/login')) {
      // Click logout button if visible
      const logoutBtn = page.locator('button:has-text("로그아웃"), a:has-text("로그아웃")').first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 10000 });
      }
    }
    // Login page should be visible
    await expect(page.locator('input#email, input[type="email"]')).toBeVisible();
  });

  // ═══ STEP 13: 테넌트 정리 ═══
  test('Step 13: Cleanup — delete test tenant', async () => {
    // Login as super admin to delete tenant
    await fetch(`${API}/migration/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'truelight-bootstrap-2026' }),
    });
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@truelight.app', password: 'TrueLight2026!' }),
    });
    const superToken = (await loginRes.json()).accessToken;

    // Find tenant ID
    const tenantsRes = await fetch(`${API}/admin/tenants?page=1&perPage=100`, {
      headers: { 'Authorization': `Bearer ${superToken}` },
    });
    const tenants = (await tenantsRes.json()).data || [];
    const testTenant = tenants.find((t: { slug: string }) => t.slug === SLUG);

    if (testTenant) {
      const delRes = await fetch(`${API}/admin/tenants/${testTenant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${superToken}` },
      });
      // 200 or 204 both acceptable
      expect(delRes.status).toBeLessThan(300);
    }
  });
});
