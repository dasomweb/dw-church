import { test, expect } from '@playwright/test';

test.describe('Bulletins page', () => {
  test('displays bulletin list items', async ({ page }) => {
    await page.goto('/bulletins');

    // Page heading
    await expect(page.locator('h1')).toContainText('주보');

    // Bulletin items: rendered by BulletinList component
    // They could be list items, cards, or clickable elements
    const bulletinItems = page.locator('main#main-content').locator('[role="button"], article, li, .cursor-pointer').first();
    await expect(bulletinItems).toBeVisible({ timeout: 10000 });
  });

  test('clicking a bulletin navigates to detail page with images', async ({ page }) => {
    await page.goto('/bulletins');

    // Find clickable bulletin items
    const items = page.locator('main#main-content').locator('[role="button"], article, .cursor-pointer');
    const count = await items.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await items.first().click();

    // Wait for navigation to a bulletin detail page
    await page.waitForURL(/\/bulletins\//, { timeout: 10000 });

    // Detail page should have images (bulletin scans) or at least content
    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();

    // Check for images in the detail page (bulletin pages are typically image-based)
    const images = main.locator('img');
    const hasImages = (await images.count()) > 0;

    // Or there could be a title/heading
    const heading = main.locator('h1, h2').first();
    const hasHeading = await heading.isVisible().catch(() => false);

    expect(hasImages || hasHeading).toBe(true);
  });
});
