import { test, expect } from '@playwright/test';

const NAV_ITEMS = [
  { label: '설교', path: '/sermons' },
  { label: '주보', path: '/bulletins' },
  { label: '앨범', path: '/albums' },
  { label: '행사', path: '/events' },
  { label: '교역자', path: '/staff' },
  { label: '칼럼', path: '/columns' },
  { label: '연혁', path: '/history' },
];

test.describe('Navigation - desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const { label, path } of NAV_ITEMS) {
    test(`clicking "${label}" navigates to ${path} without error`, async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav[aria-label="주 메뉴"]');
      const link = nav.locator(`a:has-text("${label}")`).first();

      // Link may or may not exist if menu was customized; skip if not present
      if (!(await link.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await link.click();
      await page.waitForLoadState('domcontentloaded');

      // Should not be a 500 or 404 error page
      const url = page.url();
      expect(url).toContain(path);

      // No server error text
      const body = await page.locator('body').textContent();
      expect(body).not.toContain('500 Internal Server Error');
      expect(body).not.toContain('Application error');
    });
  }
});

test.describe('Navigation - mobile menu', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.goto('/');

    // Hamburger button
    const openButton = page.locator('button[aria-label="Open navigation menu"]');
    await expect(openButton).toBeVisible();

    // Open the menu
    await openButton.click();

    // The slide-out panel should become visible
    const menuPanel = page.locator('#mobile-menu-panel');
    await expect(menuPanel).toBeVisible();

    // Nav links should be visible inside the panel
    const menuLinks = menuPanel.locator('nav a');
    expect(await menuLinks.count()).toBeGreaterThan(0);

    // Close the menu
    const closeButton = menuPanel.locator('button[aria-label="Close navigation menu"]');
    await closeButton.click();

    // Panel should slide away (translate-x-full makes it hidden)
    await expect(menuPanel).toHaveClass(/translate-x-full/);
  });

  test('mobile menu links navigate correctly', async ({ page }) => {
    await page.goto('/');

    const openButton = page.locator('button[aria-label="Open navigation menu"]');
    await openButton.click();

    const menuPanel = page.locator('#mobile-menu-panel');
    const firstLink = menuPanel.locator('nav a').first();
    const href = await firstLink.getAttribute('href');

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Should have navigated
    if (href) {
      expect(page.url()).toContain(href);
    }
  });
});
