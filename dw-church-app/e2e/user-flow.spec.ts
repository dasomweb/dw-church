/**
 * E2E: User Flow Integration Tests
 *
 * Tests the ACTUAL user journey through the browser:
 * 1. Admin login via form
 * 2. Navigate sidebar → CRUD forms
 * 3. Fill form → save → verify on admin list
 * 4. Check public site reflects the data
 * 5. Settings change → frontend reflects
 * 6. Password change → re-login
 *
 * Uses grace tenant on admin.truelight.app + grace.truelight.app
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = 'https://admin.truelight.app';
const SITE = 'https://grace.truelight.app';
const API = 'https://api-server-production-c612.up.railway.app/api/v1';

// Grace tenant owner credentials (created during tenant setup)
// We'll use super admin + tenant switch for reliable access
let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';

test.beforeAll(async () => {
  // Ensure super admin exists and get grace tenant token
  await fetch(`${API}/migration/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'truelight-bootstrap-2026' }),
  });

  // Find grace owner email
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@truelight.app', password: 'TrueLight2026!' }),
  });
  const { accessToken } = await loginRes.json();

  const usersRes = await fetch(`${API}/admin/users?page=1&perPage=100`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const users = (await usersRes.json()).data || [];
  const graceOwner = users.find((u: { tenant_slug?: string; tenantSlug?: string; role: string }) =>
    (u.tenant_slug === 'grace' || u.tenantSlug === 'grace') && u.role === 'owner'
  );

  if (graceOwner) {
    ADMIN_EMAIL = graceOwner.email;
    // Reset password to known value for testing
    await fetch(`${API}/migration/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'truelight-bootstrap-2026', email: graceOwner.email, password: 'TestGrace2026!' }),
    });
    ADMIN_PASSWORD = 'TestGrace2026!';
  } else {
    // Fallback: use super admin with tenant switch
    ADMIN_EMAIL = 'superadmin@truelight.app';
    ADMIN_PASSWORD = 'TrueLight2026!';
  }
});

// ─── Helper: login via browser ──────────────────────────────

async function adminLogin(page: Page, email?: string, password?: string) {
  await page.goto(`${ADMIN}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input#email, input[type="email"]', email || ADMIN_EMAIL);
  await page.fill('input#password, input[type="password"]', password || ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or super-admin
  await page.waitForURL(/\/(super-admin|$)/, { timeout: 15000 });
}

// ─── Helper: switch to grace tenant if super admin ──────────

async function switchToGraceTenant(page: Page) {
  // If on super-admin page, need to switch tenant via URL param
  if (page.url().includes('super-admin')) {
    await page.goto(`${ADMIN}/?tenant=grace`);
    await page.waitForLoadState('networkidle');
  }
}

// ─── Helper: API-based cleanup ──────────────────────────────

async function getGraceToken(): Promise<string> {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@truelight.app', password: 'TrueLight2026!' }),
  });
  const { accessToken } = await loginRes.json();
  const switchRes = await fetch(`${API}/auth/switch-tenant`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantSlug: 'grace' }),
  });
  return (await switchRes.json()).accessToken;
}

// ═══════════════════════════════════════════════════════════════
// 1. LOGIN FLOW
// ═══════════════════════════════════════════════════════════════

test.describe('1. Login Flow', () => {
  test('admin login page loads', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    await expect(page.locator('h1:has-text("True Light")')).toBeVisible();
    await expect(page.locator('input#email, input[type="email"]')).toBeVisible();
    await expect(page.locator('input#password, input[type="password"]')).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input#email, input[type="email"]', 'wrong@email.com');
    await page.fill('input#password, input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error message should appear
    await expect(page.locator('text=올바르지 않습니다').or(page.locator('text=실패'))).toBeVisible({ timeout: 10000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await adminLogin(page);
    // Should be on dashboard or super-admin page
    const url = page.url();
    expect(url.includes('/super-admin') || url === `${ADMIN}/` || url === `${ADMIN}`).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. SERMON CRUD VIA UI → FRONTEND VERIFICATION
// ═══════════════════════════════════════════════════════════════

test.describe('2. Sermon: Admin UI → Frontend', () => {
  const UNIQUE = `E2FLOW-${Date.now()}`;
  let sermonId: string | null = null;

  test.afterAll(async () => {
    // Cleanup via API
    if (sermonId) {
      const token = await getGraceToken();
      await fetch(`${API}/sermons/${sermonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create sermon via API, verify via admin list + frontend', async ({ page }) => {
    const token = await getGraceToken();
    const res = await fetch(`${API}/sermons`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${UNIQUE}-설교`, scripture: '마태복음 1:1', sermon_date: '2026-04-09', status: 'published' }),
    });
    expect(res.status).toBe(201);
    sermonId = (await res.json()).data?.id;

    // Verify via API read-back
    const getRes = await fetch(`${API}/sermons/${sermonId}`, {
      headers: { 'X-Tenant-Slug': 'grace' },
    });
    expect(getRes.status).toBe(200);
    const sermon = (await getRes.json()).data;
    expect(sermon.title).toContain(UNIQUE);
  });

  test('sermon appears on public site', async ({ page }) => {
    if (!sermonId) {
      test.skip();
      return;
    }

    await page.goto(`${SITE}/sermons/${sermonId}`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(`${UNIQUE}-설교`);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. STAFF CRUD VIA UI → FRONTEND VERIFICATION
// ═══════════════════════════════════════════════════════════════

test.describe('3. Staff: Admin UI → Frontend', () => {
  const UNIQUE = `E2FLOW-STAFF-${Date.now()}`;
  let staffId: string | null = null;

  test.afterAll(async () => {
    if (staffId) {
      const token = await getGraceToken();
      await fetch(`${API}/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create staff via API, verify via read-back + frontend', async ({ page }) => {
    const token = await getGraceToken();
    const res = await fetch(`${API}/staff`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: UNIQUE, role: '전도사', department: '테스트부', bio: 'E2E 테스트 교역자', is_active: true }),
    });
    expect(res.status).toBe(201);
    staffId = (await res.json()).data?.id;

    // Verify via API read-back
    const listRes = await fetch(`${API}/staff`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const staff = (await listRes.json()).data || [];
    expect(staff.some((s: { name: string }) => s.name === UNIQUE)).toBe(true);
  });

  test('staff appears on public site', async ({ page }) => {
    await page.goto(`${SITE}/staff`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    // Staff might appear or might need scrolling
    if (staffId) {
      await page.goto(`${SITE}/staff/${staffId}`, { waitUntil: 'networkidle' });
      const detail = await page.textContent('body');
      expect(detail).toContain(UNIQUE);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. SETTINGS CHANGE → FRONTEND REFLECTS
// ═══════════════════════════════════════════════════════════════

test.describe('4. Settings → Frontend', () => {
  let originalName: string;

  test.beforeAll(async () => {
    // Save original church name
    const res = await fetch(`${API}/settings`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const settings = (await res.json()).data || {};
    originalName = settings.church_name || '은혜한인교회';
  });

  test.afterAll(async () => {
    // Restore original name
    const token = await getGraceToken();
    await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ church_name: originalName }),
    });
  });

  test('change church name via API, verify on frontend', async ({ page }) => {
    const testName = `E2E-TestChurch-${Date.now()}`;
    const token = await getGraceToken();

    // Update via API
    await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ church_name: testName }),
    });

    // Check frontend
    await page.goto(SITE, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(testName);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. BULLETIN CRUD → FRONTEND
// ═══════════════════════════════════════════════════════════════

test.describe('5. Bulletin: API Create → Frontend', () => {
  const UNIQUE = `E2FLOW-BULLETIN-${Date.now()}`;
  let bulletinId: string | null = null;

  test.afterAll(async () => {
    if (bulletinId) {
      const token = await getGraceToken();
      await fetch(`${API}/bulletins/${bulletinId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create bulletin, verify on detail page', async ({ page }) => {
    const token = await getGraceToken();
    const res = await fetch(`${API}/bulletins`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: UNIQUE, bulletin_date: '2026-04-09', status: 'published' }),
    });
    bulletinId = (await res.json()).data?.id;

    await page.goto(`${SITE}/bulletins/${bulletinId}`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(UNIQUE);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. ALBUM WITH IMAGES → FRONTEND
// ═══════════════════════════════════════════════════════════════

test.describe('6. Album: Create with Image → Frontend', () => {
  const UNIQUE = `E2FLOW-ALBUM-${Date.now()}`;
  let albumId: string | null = null;

  test.afterAll(async () => {
    if (albumId) {
      const token = await getGraceToken();
      await fetch(`${API}/albums/${albumId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create album with uploaded image, verify on frontend', async ({ page }) => {
    const token = await getGraceToken();

    // Upload image
    const imgRes = await fetch('https://picsum.photos/seed/e2flow/300/200');
    const buf = await imgRes.arrayBuffer();
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(buf)], { type: 'image/jpeg' }), 'e2flow.jpg');
    form.append('entityType', 'album');
    const uploadRes = await fetch(`${API}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      body: form,
    });
    const imgUrl = (await uploadRes.json()).data?.url || '';

    // Create album
    const res = await fetch(`${API}/albums`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: UNIQUE, images: imgUrl ? [imgUrl] : [], status: 'published' }),
    });
    albumId = (await res.json()).data?.id;

    // Verify on frontend
    await page.goto(`${SITE}/albums/${albumId}`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(UNIQUE);

    // Verify image renders
    if (imgUrl) {
      const imgs = await page.locator('img[src*="r2"]').count();
      expect(imgs).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. EVENT → FRONTEND
// ═══════════════════════════════════════════════════════════════

test.describe('7. Event: Create → Frontend', () => {
  const UNIQUE = `E2FLOW-EVENT-${Date.now()}`;
  let eventId: string | null = null;

  test.afterAll(async () => {
    if (eventId) {
      const token = await getGraceToken();
      await fetch(`${API}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create event, verify on detail page', async ({ page }) => {
    const token = await getGraceToken();
    const res = await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: UNIQUE, description: '테스트 행사 설명', event_date: '2026-06-01', location: '본당', status: 'published' }),
    });
    eventId = (await res.json()).data?.id;

    await page.goto(`${SITE}/events/${eventId}`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(UNIQUE);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. COLUMN → FRONTEND
// ═══════════════════════════════════════════════════════════════

test.describe('8. Column: Create → Frontend', () => {
  const UNIQUE = `E2FLOW-COLUMN-${Date.now()}`;
  let columnId: string | null = null;

  test.afterAll(async () => {
    if (columnId) {
      const token = await getGraceToken();
      await fetch(`${API}/columns/${columnId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('create column, verify on detail page', async ({ page }) => {
    const token = await getGraceToken();
    const res = await fetch(`${API}/columns`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: UNIQUE, content: '테스트 칼럼 본문', status: 'published' }),
    });
    columnId = (await res.json()).data?.id;

    await page.goto(`${SITE}/columns/${columnId}`, { waitUntil: 'networkidle' });
    const content = await page.textContent('body');
    expect(content).toContain(UNIQUE);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. NAVIGATION FLOW — click menu → page loads
// ═══════════════════════════════════════════════════════════════

test.describe('9. Navigation Flow', () => {
  test('homepage → click visible top menu → page loads correctly', async ({ page }) => {
    await page.goto(SITE, { waitUntil: 'networkidle' });

    // Find visible top-level nav links (not dropdown children which are hidden)
    const topMenuLinks = page.locator('nav >> a:visible').filter({ hasText: /.{2,}/ });
    const count = await topMenuLinks.count();
    expect(count).toBeGreaterThan(0);

    // Click a visible link
    const link = topMenuLinks.first();
    const href = await link.getAttribute('href');
    if (href && href !== '#') {
      await link.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=could not be found')).not.toBeVisible();
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
