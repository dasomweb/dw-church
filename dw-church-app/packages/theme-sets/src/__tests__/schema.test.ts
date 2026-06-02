/**
 * Phase 10-α — sanity tests for the theme-sets package.
 *
 * Pins the contract that every set under `./sets/` parses through the
 * Zod schema. As Phase 10-β adds 9 more sets, this loop catches malformed
 * additions immediately.
 */
import { describe, it, expect } from 'vitest';
import { ALL_THEME_SETS, themeSetSchema, findThemeSet, DEFAULT_THEME_SET_ID } from '../index.js';

describe('theme-sets registry', () => {
  it('every registered set parses against themeSetSchema', () => {
    for (const set of ALL_THEME_SETS) {
      const result = themeSetSchema.safeParse(set);
      if (!result.success) {
        // Make the failure include the set id and the issue list for fast
        // diagnosis of which set's row is bad.
        throw new Error(
          `theme set "${set.meta.id}" failed schema validation: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it('every set has a unique id', () => {
    const ids = ALL_THEME_SETS.map((s) => s.meta.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('DEFAULT_THEME_SET_ID resolves to a real set', () => {
    expect(findThemeSet(DEFAULT_THEME_SET_ID)).not.toBeNull();
  });

  it('findThemeSet returns null for unknown id', () => {
    expect(findThemeSet('does-not-exist')).toBeNull();
  });

  it('every set defines at least the 6 default-enabled page templates (home/vision/history/staff/sermons/contact)', () => {
    const required = ['home', 'vision', 'history', 'staff', 'sermons', 'contact'];
    for (const set of ALL_THEME_SETS) {
      const slugs = set.pageTemplates.filter((t) => t.defaultEnabled).map((t) => t.slug);
      for (const r of required) {
        expect(slugs, `theme set "${set.meta.id}" missing default-enabled template "${r}"`).toContain(r);
      }
    }
  });
});
