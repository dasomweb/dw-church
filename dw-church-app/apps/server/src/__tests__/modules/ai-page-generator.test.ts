/**
 * AI Page Generator tests — validates prompt→block structure logic.
 * Mocks Gemini API to test parsing and validation.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the AI service
vi.mock('../../modules/ai/service.js', () => ({
  generateText: vi.fn(),
}));

// Mock pages service (not needed for preview, but needed for create)
vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));

import { generatePageFromPrompt } from '../../modules/ai/page-generator.js';
import { generateText } from '../../modules/ai/service.js';

const mockGenerateText = vi.mocked(generateText);

describe('generatePageFromPrompt', () => {
  it('parses valid AI response', async () => {
    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '교회 소개',
      slug: 'about',
      blocks: [
        { blockType: 'hero_banner', props: { title: '교회 소개', subtitle: '환영합니다', height: 'md', layout: 'full' } },
        { blockType: 'church_intro', props: { title: '교회 소개', content: '우리 교회는...' } },
      ],
    }));

    const result = await generatePageFromPrompt('교회 소개 페이지 만들어줘');
    expect(result.title).toBe('교회 소개');
    expect(result.slug).toBe('about');
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]!.blockType).toBe('hero_banner');
    expect(result.blocks[1]!.blockType).toBe('church_intro');
  });

  it('디자인 시스템 울타리(C): 허용 밖 variant + 임의 스타일 props 제거', async () => {
    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '설교', slug: 'sermons',
      blocks: [
        // variant grid-5 는 허용 밖 → 제거(기본값), color/fontSize 임의 스타일 → 제거
        { blockType: 'recent_sermons', props: { title: '최근 설교', limit: 6, variant: 'grid-5', color: '#ff0000', fontSize: '20px' } },
        // 허용 variant + 컨텐츠는 유지
        { blockType: 'event_grid', props: { title: '행사', variant: 'cards-3', backgroundColor: '#000' } },
      ],
    }));
    const result = await generatePageFromPrompt('설교 페이지');
    const sermons = result.blocks.find((b) => b.blockType === 'recent_sermons')!;
    expect(sermons.props.variant).toBeUndefined();  // grid-5 제거
    expect(sermons.props.color).toBeUndefined();     // 임의 스타일 제거
    expect(sermons.props.fontSize).toBeUndefined();
    expect(sermons.props.title).toBe('최근 설교');    // 컨텐츠 유지
    expect(sermons.props.limit).toBe(6);
    const events = result.blocks.find((b) => b.blockType === 'event_grid')!;
    expect(events.props.variant).toBe('cards-3');     // 허용 variant 유지
    expect(events.props.backgroundColor).toBeUndefined(); // 임의 스타일 제거
  });

  it('strips markdown code blocks from response', async () => {
    mockGenerateText.mockResolvedValue('```json\n{"title":"테스트","slug":"test","blocks":[{"blockType":"text_only","props":{"title":"테스트","content":"내용"}}]}\n```');

    const result = await generatePageFromPrompt('테스트 페이지');
    expect(result.title).toBe('테스트');
    expect(result.blocks).toHaveLength(1);
  });

  it('filters out invalid block types', async () => {
    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '테스트',
      slug: 'test',
      blocks: [
        { blockType: 'hero_banner', props: { title: '히어로' } },
        { blockType: 'invalid_block_xyz', props: {} },
        { blockType: 'text_only', props: { title: '텍스트' } },
      ],
    }));

    const result = await generatePageFromPrompt('테스트');
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.every((b) => b.blockType !== 'invalid_block_xyz')).toBe(true);
  });

  it('throws on empty blocks after filtering', async () => {
    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '빈 페이지',
      slug: 'empty',
      blocks: [{ blockType: 'nonexistent', props: {} }],
    }));

    await expect(generatePageFromPrompt('빈 페이지')).rejects.toThrow('유효한 블록이 생성되지 않았습니다');
  });

  it('throws on invalid JSON', async () => {
    mockGenerateText.mockResolvedValue('이것은 JSON이 아닙니다');
    await expect(generatePageFromPrompt('잘못된 응답')).rejects.toThrow('파싱할 수 없습니다');
  });

  it('cleans slug', async () => {
    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '특수 문자 테스트',
      slug: 'Test Page!!  #Special',
      blocks: [{ blockType: 'text_only', props: { title: 'test' } }],
    }));

    const result = await generatePageFromPrompt('특수 문자 slug');
    expect(result.slug).not.toContain('!');
    expect(result.slug).not.toContain('#');
    expect(result.slug).not.toContain(' ');
  });

  it('keeps only valid block types from schema', async () => {
    // Use a subset of known valid types from pages/schema.ts
    const validBlocks = ['hero_banner', 'text_image', 'text_only', 'pastor_message',
      'church_intro', 'mission_vision', 'worship_times', 'location_map',
      'contact_info', 'newcomer_info', 'divider', 'video', 'quote_block', 'board'];

    mockGenerateText.mockResolvedValue(JSON.stringify({
      title: '블록 테스트',
      slug: 'block-test',
      blocks: validBlocks.map((bt) => ({ blockType: bt, props: { title: bt } })),
    }));

    const result = await generatePageFromPrompt('블록 테스트');
    // All these are valid blockTypes from schema, so none should be filtered
    expect(result.blocks.length).toBe(validBlocks.length);
  });
});
