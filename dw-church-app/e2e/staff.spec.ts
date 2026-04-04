import { test, expect } from '@playwright/test';

test.describe('Staff page', () => {
  test('displays staff members', async ({ page }) => {
    await page.goto('/staff');

    // Page heading
    await expect(page.locator('h1')).toContainText('교역자');

    const main = page.locator('main#main-content');

    // Staff members should be rendered (cards with names/images)
    // StaffCard or StaffFeatured renders staff info
    const staffElements = main.locator('img, [class*="staff"], article, h3, h2').first();
    await expect(staffElements).toBeVisible({ timeout: 10000 });
  });

  test('has a featured section for lead pastor', async ({ page }) => {
    await page.goto('/staff');

    const main = page.locator('main#main-content');

    // The StaffGrid with layout='featured' renders lead pastor (담임목사) separately
    // Look for the featured role text or a larger card section
    const featuredText = main.locator('text=담임목사');
    const hasFeatured = await featuredText.isVisible({ timeout: 10000 }).catch(() => false);

    // Also check for Senior Pastor / Lead Pastor in English
    const featuredEn = main.locator('text=/Senior Pastor|Lead Pastor/i');
    const hasFeaturedEn = await featuredEn.isVisible().catch(() => false);

    // At least one form of featured pastor should exist
    expect(hasFeatured || hasFeaturedEn).toBe(true);
  });
});
