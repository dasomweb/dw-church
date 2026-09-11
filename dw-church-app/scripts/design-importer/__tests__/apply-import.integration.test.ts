/**
 * Integration test — applyImport orchestration against a MOCK ImportClient.
 * Verifies the deterministic contract end-to-end without a real server:
 * theme is applied FIRST, then each page is created and its sections added IN
 * ORDER, and the result summary is correct.
 */
import { describe, it, expect } from 'vitest';
import { applyImport, type ImportClient, type ImportSpec, type ComposedPage } from '../lib.js';
import type { DesignTokens } from '@dw-church/design-tokens';

interface Call { kind: 'theme' | 'page' | 'section'; payload: unknown; pageId?: string }

function recordingClient(): { client: ImportClient; calls: Call[] } {
  const calls: Call[] = [];
  let seq = 0;
  const client: ImportClient = {
    async putThemeTokens(tokens: DesignTokens) { calls.push({ kind: 'theme', payload: tokens }); },
    async createPage(page: ComposedPage['page']) {
      const id = `pg_${++seq}`;
      calls.push({ kind: 'page', payload: page });
      return { id };
    },
    async addSection(pageId: string, section: ComposedPage['sections'][number]) {
      calls.push({ kind: 'section', pageId, payload: section });
    },
  };
  return { client, calls };
}

const SPEC: ImportSpec = {
  styleguide: {
    name: 'demo',
    colors: { primary: '#1e5a8a', background: '#ffffff', surface: '#f7f4ee' },
    fonts: { heading: 'Pretendard', body: 'Pretendard', korean: 'Pretendard' },
  },
  pages: [
    {
      name: '홈', slug: 'home',
      sections: [
        { blockType: 'hero_banner', props: { title: 'x' } },
        { blockType: 'features_grid', props: { columns: 3 } },
        { blockType: 'call_to_action', props: { title: 'CTA' } },
      ],
    },
  ],
};

describe('applyImport (integration, mock client)', () => {
  it('applies theme FIRST, then page, then sections in order', async () => {
    const { client, calls } = recordingClient();
    const result = await applyImport(client, SPEC);

    // 1st call is the theme.
    expect(calls[0]!.kind).toBe('theme');
    expect((calls[0]!.payload as DesignTokens).colors.system.primary).toBe('#1e5a8a');

    // then the page, then its 3 sections in order.
    const kinds = calls.map((c) => c.kind);
    expect(kinds).toEqual(['theme', 'page', 'section', 'section', 'section']);
    const sectionBlocks = calls.filter((c) => c.kind === 'section').map((c) => (c.payload as { blockType: string }).blockType);
    expect(sectionBlocks).toEqual(['hero_banner', 'features_grid', 'call_to_action']);

    // sections carry incrementing sortOrder and the created page id.
    const sortOrders = calls.filter((c) => c.kind === 'section').map((c) => (c.payload as { sortOrder: number }).sortOrder);
    expect(sortOrders).toEqual([0, 1, 2]);
    expect(calls.filter((c) => c.kind === 'section').every((c) => c.pageId === 'pg_1')).toBe(true);

    // result summary.
    expect(result.themeApplied).toBe(true);
    expect(result.pages).toEqual([{ slug: 'home', id: 'pg_1', sections: 3 }]);
    expect(result.warnings).toEqual([]); // warm palette + ends in CTA
  });

  it('surfaces warnings (no-CTA page) but still applies', async () => {
    const { client, calls } = recordingClient();
    const noCta: ImportSpec = { ...SPEC, pages: [{ name: 'P', slug: 'p', sections: [{ blockType: 'hero_banner' }] }] };
    const result = await applyImport(client, noCta);
    expect(result.warnings.some((w) => w.includes('CTA'))).toBe(true);
    expect(calls.map((c) => c.kind)).toEqual(['theme', 'page', 'section']);
  });
});
