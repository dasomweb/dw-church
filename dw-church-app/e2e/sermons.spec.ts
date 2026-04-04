import { test, expect } from '@playwright/test';

test.describe('Sermons page', () => {
  test('displays sermon cards', async ({ page }) => {
    await page.goto('/sermons');

    // Page heading
    await expect(page.locator('h1')).toContainText('설교');

    // Sermon cards are <article role="button"> elements rendered by SermonCard
    const sermonCards = page.locator('article[role="button"]');
    await expect(sermonCards.first()).toBeVisible({ timeout: 10000 });
    expect(await sermonCards.count()).toBeGreaterThan(0);
  });

  test('has a search input', async ({ page }) => {
    await page.goto('/sermons');

    const searchInput = page.locator('input[placeholder*="검색"]');
    await expect(searchInput).toBeVisible();
  });

  test('shows pagination when there are more than 12 sermons', async ({ page }) => {
    await page.goto('/sermons');

    // Check the total count text: "총 N개의 설교"
    const totalText = page.locator('text=총').first();
    await expect(totalText).toBeVisible({ timeout: 10000 });

    const text = await totalText.textContent();
    const match = text?.match(/총\s*(\d+)/);
    const total = match ? parseInt(match[1], 10) : 0;

    if (total > 12) {
      // Pagination links should be visible
      const paginationLinks = page.locator('a[href*="page="]');
      expect(await paginationLinks.count()).toBeGreaterThan(0);
    }
  });

  test('clicking a sermon card navigates to detail page', async ({ page }) => {
    await page.goto('/sermons');

    const firstCard = page.locator('article[role="button"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    await firstCard.click();

    // Wait for navigation to a sermon detail page
    await page.waitForURL(/\/sermons\//, { timeout: 10000 });

    // Detail page should have a title or a YouTube iframe
    const hasTitle = page.locator('h1, h2').first();
    const hasYoutube = page.locator('iframe[src*="youtube"]');

    const titleVisible = await hasTitle.isVisible().catch(() => false);
    const youtubeVisible = await hasYoutube.isVisible().catch(() => false);

    expect(titleVisible || youtubeVisible).toBe(true);
  });
});
