/**
 * E2E: Tenant Isolation Tests
 *
 * Verifies that tenant data is properly isolated:
 * - Tenant A cannot access Tenant B's data
 * - X-Tenant-Slug header is respected
 * - Cross-tenant API calls are blocked
 * - Each tenant has independent data
 *
 * Uses bethelfaith + grace tenants on live Railway
 */
import { test, expect } from '@playwright/test';

const API = 'https://api-server-production-c612.up.railway.app/api/v1';

async function getTokenForTenant(tenantSlug: string): Promise<string> {
  // Bootstrap + login
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
  const loginData = await loginRes.json();
  const switchRes = await fetch(`${API}/auth/switch-tenant`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${loginData.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantSlug }),
  });
  return (await switchRes.json()).accessToken;
}

test.describe('Tenant Isolation — API Level', () => {
  test('different tenants return different settings', async () => {
    const graceRes = await fetch(`${API}/settings`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const graceSettings = (await graceRes.json()).data || {};

    const bethelRes = await fetch(`${API}/settings`, { headers: { 'X-Tenant-Slug': 'bethelfaith' } });
    const bethelSettings = (await bethelRes.json()).data || {};

    // Both should have church_name but different values
    if (graceSettings.church_name && bethelSettings.church_name) {
      expect(graceSettings.church_name).not.toBe(bethelSettings.church_name);
    }
  });

  test('different tenants return different pages', async () => {
    const graceRes = await fetch(`${API}/pages`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const gracePages = (await graceRes.json()).data || [];

    const bethelRes = await fetch(`${API}/pages`, { headers: { 'X-Tenant-Slug': 'bethelfaith' } });
    const bethelPages = (await bethelRes.json()).data || [];

    // Both should have pages but with different IDs
    expect(gracePages.length).toBeGreaterThan(0);
    expect(bethelPages.length).toBeGreaterThan(0);

    const graceIds = gracePages.map((p: { id: string }) => p.id);
    const bethelIds = bethelPages.map((p: { id: string }) => p.id);

    // No ID overlap between tenants
    const overlap = graceIds.filter((id: string) => bethelIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test('different tenants return different sermons', async () => {
    const graceRes = await fetch(`${API}/sermons`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const graceSermons = (await graceRes.json()).data || [];

    const bethelRes = await fetch(`${API}/sermons`, { headers: { 'X-Tenant-Slug': 'bethelfaith' } });
    const bethelSermons = (await bethelRes.json()).data || [];

    // Sermon IDs should not overlap
    if (graceSermons.length > 0 && bethelSermons.length > 0) {
      const graceIds = graceSermons.map((s: { id: string }) => s.id);
      const bethelIds = bethelSermons.map((s: { id: string }) => s.id);
      const overlap = graceIds.filter((id: string) => bethelIds.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });

  test('different tenants return different staff', async () => {
    const graceRes = await fetch(`${API}/staff`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const graceStaff = (await graceRes.json()).data || [];

    const bethelRes = await fetch(`${API}/staff`, { headers: { 'X-Tenant-Slug': 'bethelfaith' } });
    const bethelStaff = (await bethelRes.json()).data || [];

    if (graceStaff.length > 0 && bethelStaff.length > 0) {
      const graceIds = graceStaff.map((s: { id: string }) => s.id);
      const bethelIds = bethelStaff.map((s: { id: string }) => s.id);
      const overlap = graceIds.filter((id: string) => bethelIds.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });

  test('data created in tenant A is not visible in tenant B', async () => {
    const graceToken = await getTokenForTenant('grace');

    // Create a sermon in grace
    const createRes = await fetch(`${API}/sermons`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${graceToken}`, 'X-Tenant-Slug': 'grace', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ISOLATION-TEST-격리검증', sermon_date: '2026-04-09', status: 'published' }),
    });
    const sermonId = (await createRes.json()).data?.id;

    try {
      // Try to read it from bethelfaith — should NOT be found
      const bethelRes = await fetch(`${API}/sermons/${sermonId}`, {
        headers: { 'X-Tenant-Slug': 'bethelfaith' },
      });
      // Should be 404 or the sermon should not exist
      if (bethelRes.status === 200) {
        const data = (await bethelRes.json()).data;
        // Even if 200, the title should NOT match
        expect(data?.title).not.toBe('ISOLATION-TEST-격리검증');
      } else {
        expect(bethelRes.status).toBe(404);
      }
    } finally {
      // Cleanup
      await fetch(`${API}/sermons/${sermonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${graceToken}`, 'X-Tenant-Slug': 'grace' },
      });
    }
  });

  test('invalid tenant slug returns error', async () => {
    const res = await fetch(`${API}/sermons`, {
      headers: { 'X-Tenant-Slug': 'nonexistent-tenant-xyz' },
    });
    // Should fail — either 404 or 500 (tenant not found)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('request without tenant slug on tenant-required endpoint fails', async () => {
    // Hitting a tenant-scoped route without X-Tenant-Slug and without subdomain
    const res = await fetch(`${API}/sermons`);
    // Should fail since no tenant context
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Tenant Isolation — Frontend Level', () => {
  test('grace site shows grace data, not bethelfaith', async ({ page }) => {
    await page.goto('https://grace.truelight.app/staff', { waitUntil: 'networkidle' });
    const graceContent = await page.textContent('body') || '';

    await page.goto('https://bethelfaith.truelight.app/staff', { waitUntil: 'networkidle' });
    const bethelContent = await page.textContent('body') || '';

    // Content should be different (different churches)
    if (graceContent.length > 100 && bethelContent.length > 100) {
      expect(graceContent).not.toBe(bethelContent);
    }
  });

  test('grace site menu matches grace tenant menus', async ({ page }) => {
    // Get grace menus from API
    const menuRes = await fetch(`${API}/menus`, { headers: { 'X-Tenant-Slug': 'grace' } });
    const menus = (await menuRes.json()).data || [];
    const topLabels = menus.filter((m: { parent_id: string | null }) => !m.parent_id).map((m: { label: string }) => m.label);

    // Load grace site
    await page.goto('https://grace.truelight.app', { waitUntil: 'networkidle' });
    const navText = await page.locator('nav').first().textContent() || '';

    // At least some menu labels should appear in nav
    const matchCount = topLabels.filter((label: string) => navText.includes(label)).length;
    expect(matchCount).toBeGreaterThan(0);
  });
});
