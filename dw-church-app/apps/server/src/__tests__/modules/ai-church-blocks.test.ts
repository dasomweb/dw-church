/**
 * AI builder ↔ church content-module integration test.
 *
 * Guards the path the "전수 점검" closed: the AI page builder must be able
 * to generate the church content blocks (설교/주보/칼럼/영상/앨범/교역자/
 * 연혁/행사/예배·모임/게시판 + 담임목사 인사말 / 새가족 안내), not just the
 * generic B2B blocks. Three drift traps this pins:
 *
 *   1. mapSectionToBlock must translate each church sectionType (and its
 *      planner gutenbergPattern alias) to the right block_type with sane
 *      display props — NOT silently fall through to text_only.
 *   2. Every block_type the mapper can emit must be in pages/schema.ts's
 *      `blockTypes` whitelist, or createSection 400s at apply time.
 *   3. Church DATA blocks have no AI-authored items, so they must survive
 *      the mapper's empty-content guard on a title alone.
 */
import { describe, it, expect } from 'vitest';
import { mapSectionToBlock, type SectionSpec } from '../../modules/ai/build-pages/pattern-map.js';
import { blockTypes } from '../../modules/pages/schema.js';

const whitelist = new Set<string>(blockTypes);

// (sectionType the copywriter writes, gutenbergPattern SECTION_TO_PATTERN
// emits, expected block_type). Both input forms must resolve identically.
const CHURCH_CASES: Array<{ sectionType: string; pattern: string; block: string }> = [
  { sectionType: 'sermons',          pattern: 'recent-sermons',   block: 'recent_sermons' },
  { sectionType: 'bulletins',        pattern: 'recent-bulletins', block: 'recent_bulletins' },
  { sectionType: 'columns',          pattern: 'recent-columns',   block: 'recent_columns' },
  { sectionType: 'videos',           pattern: 'video-board',      block: 'video_board' },
  { sectionType: 'albums',           pattern: 'album-gallery',    block: 'album_gallery' },
  { sectionType: 'clergy',           pattern: 'staff-grid',       block: 'staff_grid' },
  { sectionType: 'events',           pattern: 'event-grid',       block: 'event_grid' },
  { sectionType: 'history',          pattern: 'history-timeline', block: 'history_timeline' },
  { sectionType: 'worship-schedule', pattern: 'schedule-board',   block: 'schedule_board' },
  { sectionType: 'board',            pattern: 'board',            block: 'board' },
];

describe('AI builder — church data blocks', () => {
  it.each(CHURCH_CASES)(
    'maps sectionType "$sectionType" → $block',
    ({ sectionType, block }) => {
      const mapped = mapSectionToBlock({ sectionType, title: '최근 설교' });
      expect(mapped).not.toBeNull();
      expect(mapped!.blockType).toBe(block);
    },
  );

  it.each(CHURCH_CASES)(
    'maps gutenbergPattern "$pattern" → $block (planner alias)',
    ({ pattern, block }) => {
      const mapped = mapSectionToBlock({ gutenbergPattern: pattern, title: '제목' });
      expect(mapped).not.toBeNull();
      expect(mapped!.blockType).toBe(block);
    },
  );

  it('emits a DATA block from a title alone (no AI-authored items)', () => {
    // The generic empty-content guard drops sections without items/desc;
    // church data blocks must bypass it — only a title is present here.
    const mapped = mapSectionToBlock({ sectionType: 'sermons', title: '설교' });
    expect(mapped).not.toBeNull();
    expect(mapped!.blockType).toBe('recent_sermons');
  });

  it('every church block_type the mapper emits is in the schema whitelist', () => {
    for (const { sectionType, block } of CHURCH_CASES) {
      const mapped = mapSectionToBlock({ sectionType, title: 't' });
      expect(mapped, sectionType).not.toBeNull();
      expect(whitelist.has(mapped!.blockType), `${mapped!.blockType} missing from blockTypes`).toBe(true);
    }
  });

  it('honors AI variant + limit hints on data blocks', () => {
    const mapped = mapSectionToBlock({
      sectionType: 'sermons',
      title: '설교',
      // SectionSpec carries arbitrary extra keys through its index signature.
      variant: 'grid-4',
      limit: 9,
    } as SectionSpec);
    expect(mapped!.props.variant).toBe('grid-4');
    expect(mapped!.props.limit).toBe(9);
  });

  it('rejects an out-of-whitelist variant, falling back to the default grid', () => {
    const mapped = mapSectionToBlock({ sectionType: 'sermons', title: '설교', variant: 'nonsense' } as SectionSpec);
    expect(mapped!.props.variant).toBe('grid-3');
  });
});

describe('AI builder — static church blocks (AI authors copy)', () => {
  it('maps pastor-message with authored greeting → pastor_message', () => {
    const mapped = mapSectionToBlock({
      sectionType: 'pastor-message',
      title: '환영합니다',
      description: '저희 교회에 오신 것을 환영합니다.',
    });
    expect(mapped!.blockType).toBe('pastor_message');
    expect(mapped!.props.message).toBe('저희 교회에 오신 것을 환영합니다.');
    expect(whitelist.has('pastor_message')).toBe(true);
  });

  it('refuses an empty pastor-message (no placeholder church block)', () => {
    const mapped = mapSectionToBlock({ sectionType: 'pastor-message' });
    expect(mapped).toBeNull();
  });

  it('maps newcomer + CTA → newcomer_info', () => {
    const mapped = mapSectionToBlock({
      sectionType: 'newcomer',
      title: '처음 오셨나요?',
      buttonText: '새가족 등록',
      buttonUrl: '/newcomer',
    });
    expect(mapped!.blockType).toBe('newcomer_info');
    expect(mapped!.props.buttonText).toBe('새가족 등록');
    expect(whitelist.has('newcomer_info')).toBe(true);
  });
});

describe('AI builder — generic blocks still work (no regression)', () => {
  it('still maps hero → hero_banner', () => {
    const mapped = mapSectionToBlock({ sectionType: 'hero', title: 'Welcome' });
    expect(mapped!.blockType).toBe('hero_banner');
  });

  it('still maps team → team_members (NOT hijacked by church clergy mapping)', () => {
    const mapped = mapSectionToBlock({
      sectionType: 'team',
      title: 'Our Team',
      items: [{ name: 'A', role: 'CEO' }],
    });
    expect(mapped!.blockType).toBe('team_members');
  });
});
