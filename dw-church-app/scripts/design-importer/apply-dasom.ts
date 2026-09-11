#!/usr/bin/env tsx
/**
 * apply-dasom — deterministic compose demo against the DEMO tenant `dasom`
 * (golden snapshot + nightly reset — safe, reversible; NEVER a live church).
 *
 * Proves the importer pipeline end-to-end: STEP 1 theme tokens → then a page
 * composed from existing (match) blocks, all through the existing server APIs.
 * No new blocks, no shared-code change → zero deploy impact, verify-live-unchanged
 * stays trivially green.
 *
 * Run (creds via ENV — never commit them):
 *   TL_SUPER_EMAIL=... TL_SUPER_PASSWORD=... \
 *   pnpm dlx tsx scripts/design-importer/apply-dasom.ts
 */
import { makeHttpClient } from './api.js';
import { applyImport, type ImportSpec } from './lib.js';

const TENANT = 'dasom';
const PAGE_SLUG = 'design-import-test';

// A warm, light church styleguide — NO dark bands (교회 톤). Demo values only.
const SPEC: ImportSpec = {
  styleguide: {
    name: 'True Light — warm light demo',
    colors: {
      primary: '#1e5a8a',      // deep reverent blue
      secondary: '#2c3e50',    // slate footer tone (not black)
      accent: '#c08a2d',       // warm gold
      text: '#1f2937',
      muted: '#6b7280',
      background: '#ffffff',
      surface: '#f7f4ee',      // warm off-white band
      border: '#e5e7eb',
      onDark: '#ffffff',
      onDarkMuted: 'rgba(255,255,255,0.85)',
    },
    fonts: { heading: 'Pretendard', body: 'Pretendard', korean: 'Pretendard' },
  },
  pages: [
    {
      name: '[임포터 테스트] 디자인 임포트',
      slug: PAGE_SLUG,
      sections: [
        { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'md',
          title: '은혜와 진리가 충만한 교회', subtitle: '디자인 임포터 파이프라인 데모' } },
        { blockType: 'text_image', props: { title: '담임목사 인사말', layout: 'left', imageUrl: '',
          content: '<p>주님의 은혜와 평강이 여러분과 함께하시기를 바랍니다. 이 페이지는 Claude Design 임포터가 결정적으로 조합한 데모입니다.</p>' } },
        { blockType: 'features_grid', props: { title: '이런 교회입니다', columns: 3, items: [
          { title: '말씀 중심', description: '성경을 삶의 기준으로' },
          { title: '기도하는 공동체', description: '함께 무릎 꿇는 교회' },
          { title: '섬김과 나눔', description: '이웃을 향한 사랑' },
        ] } },
        { blockType: 'worship_schedule', props: { title: '예배 시간', items: [
          { label: '주일 1부 예배', time: '오전 9:00', place: '본당' },
          { label: '주일 2부 예배', time: '오전 11:00', place: '본당' },
          { label: '수요 예배', time: '오후 7:30', place: '본당' },
        ] } },
        { blockType: 'call_to_action', props: { title: '새가족을 환영합니다',
          buttonText: '새가족 등록', buttonUrl: '/newcomer' } },
      ],
    },
  ],
};

async function main(): Promise<void> {
  console.log(`▶ apply-dasom — composing "${PAGE_SLUG}" into tenant "${TENANT}" (demo, nightly-reset)`);
  const client = await makeHttpClient(TENANT);

  const existing = await client.getPage(PAGE_SLUG);
  if (existing) {
    console.error(`✗ page "${PAGE_SLUG}" already exists on ${TENANT} (id ${existing.id}, ${existing.sections.length} sections).`);
    console.error('  Skipping to avoid duplicate sections. Delete it (or wait for the 3AM reset) and re-run.');
    process.exit(1);
  }

  const result = await applyImport(client, SPEC, (m) => console.log('  ' + m));
  console.log(`✓ done — theme applied=${result.themeApplied}, pages=${result.pages.length}`);
  for (const p of result.pages) console.log(`   ${p.slug}: ${p.sections} sections (id ${p.id})`);

  // Read back to confirm the sections landed in order.
  const back = await client.getPage(PAGE_SLUG);
  console.log(`   read-back: ${back?.sections.length ?? 0} sections → [${(back?.sections ?? []).map((s) => s.block_type).join(', ')}]`);
  console.log(`\n확인: https://${TENANT}.truelight.app/${PAGE_SLUG} (테마 반영 + 블록 렌더)`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
