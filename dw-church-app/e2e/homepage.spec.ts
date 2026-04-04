import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('has a title containing the church name', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/베델믿음|Bethel|Faith/i);
  });

  test('header has navigation links', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header[role="banner"]');
    await expect(header).toBeVisible();

    // Desktop nav should contain standard menu items
    const nav = header.locator('nav[aria-label="주 메뉴"]');
    // At least one nav link should exist (could be hidden on mobile)
    const navLinks = nav.locator('a');
    expect(await navLinks.count()).toBeGreaterThan(0);
  });

  test('footer has "Powered by" text', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Powered by DW Church');
  });

  test('sermon section is visible on homepage', async ({ page }) => {
    await page.goto('/');
    // The homepage renders block sections; look for sermon-related content
    // RecentSermonsBlock renders sermon cards or a section with sermon keyword
    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();

    // Look for sermon cards (article elements with role="button") or a heading mentioning sermons
    const sermonSection = main.locator('article[role="button"], h2:has-text("설교"), [class*="sermon"]').first();
    await expect(sermonSection).toBeVisible({ timeout: 10000 });
  });
});
