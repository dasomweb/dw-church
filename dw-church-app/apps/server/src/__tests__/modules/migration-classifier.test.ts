import { describe, it, expect } from 'vitest';
import { classify } from '../../modules/migration/classifier.js';
import type { RawExtractedData } from '../../modules/migration/types.js';
import { emptyRawData } from '../../modules/migration/types.js';

function makeRaw(overrides: Partial<RawExtractedData> = {}): RawExtractedData {
  return {
    ...emptyRawData(),
    source: { url: 'https://example-church.com', type: 'html', scrapedAt: '2026-01-01' },
    ...overrides,
  };
}

describe('classify — church info extraction', () => {
  it('extracts church name from home page title', () => {
    const raw = makeRaw({
      pages: [{ url: 'https://example-church.com/', title: '은혜한인교회 - Welcome', textContent: '', images: [], links: [] }],
    });
    const result = classify(raw);
    expect(result.churchInfo.name).toBe('은혜한인교회');
  });

  it('extracts phone number', () => {
    const raw = makeRaw({
      pages: [{ url: 'https://example-church.com/', title: 'Test', textContent: '연락처: 770-555-1234 오시는 길', images: [], links: [] }],
    });
    const result = classify(raw);
    expect(result.churchInfo.phone).toBe('770-555-1234');
  });

  it('extracts email', () => {
    const raw = makeRaw({
      pages: [{ url: 'https://example-church.com/', title: 'Test', textContent: 'Email: info@grace.church 로 연락주세요', images: [], links: [] }],
    });
    const result = classify(raw);
    expect(result.churchInfo.email).toBe('info@grace.church');
  });

  it('extracts Korean address', () => {
    const raw = makeRaw({
      pages: [{ url: 'https://example-church.com/', title: 'Test', textContent: '서울시 강남구 역삼동 123번지', images: [], links: [] }],
    });
    const result = classify(raw);
    expect(result.churchInfo.address).toContain('강남구');
  });

  it('extracts English address', () => {
    const raw = makeRaw({
      pages: [{ url: 'https://example-church.com/', title: 'Test', textContent: '1234 Grace Ave Atlanta GA 30329', images: [], links: [] }],
    });
    const result = classify(raw);
    expect(result.churchInfo.address).toContain('Grace Ave');
  });
});

describe('classify — YouTube video extraction', () => {
  it('converts youtube videos to sermons', () => {
    const raw = makeRaw({
      youtubeVideos: [
        { title: '주일설교', videoId: 'abc123', date: '2026-01-01', thumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg' },
      ],
    });
    const result = classify(raw);
    expect(result.sermons).toHaveLength(1);
    expect(result.sermons[0]!.youtubeUrl).toBe('https://www.youtube.com/watch?v=abc123');
    expect(result.sermons[0]!.title).toBe('주일설교');
  });

  it('extracts YouTube URLs from page links', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/sermons',
        title: '설교',
        textContent: '',
        images: [],
        links: [{ text: '설교', href: 'https://www.youtube.com/watch?v=xyz789' }],
      }],
    });
    const result = classify(raw);
    expect(result.sermons.some((s) => s.youtubeUrl.includes('xyz789'))).toBe(true);
  });
});

describe('classify — PDF link extraction', () => {
  it('extracts PDF links as bulletins', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/bulletins',
        title: '주보',
        textContent: '',
        images: [],
        links: [{ text: '2026년 1월 주보', href: 'https://example.com/bulletin.pdf' }],
      }],
    });
    const result = classify(raw);
    expect(result.bulletins).toHaveLength(1);
    expect(result.bulletins[0]!.pdfUrl).toBe('https://example.com/bulletin.pdf');
  });
});

describe('classify — page content mapping', () => {
  it('maps about page to church_intro block', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/about',
        title: '교회 소개',
        textContent: '우리 교회는 1990년에 설립되었습니다. 하나님의 사랑으로 세워진 공동체입니다.',
        images: ['https://example.com/church.jpg'],
        links: [],
      }],
    });
    const result = classify(raw);
    const aboutPage = result.pageContents.find((p) => p.pageSlug === 'about');
    expect(aboutPage).toBeDefined();
    expect(aboutPage!.blocks[0]!.blockType).toBe('church_intro');
    expect(aboutPage!.blocks[0]!.props.content).toContain('1990년');
  });

  it('maps pastor page to pastor_message block', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/pastor-greeting',
        title: '담임목사 인사말',
        textContent: '저희 교회에 오신 것을 환영합니다.',
        images: ['https://example.com/pastor.jpg'],
        links: [],
      }],
    });
    const result = classify(raw);
    const pastorPage = result.pageContents.find((p) => p.pageSlug === 'pastor-greeting');
    expect(pastorPage).toBeDefined();
    expect(pastorPage!.blocks[0]!.blockType).toBe('pastor_message');
  });

  it('maps directions page to location_map + contact_info', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/directions',
        title: '오시는 길',
        textContent: '서울시 강남구 역삼동 123번지 전화 02-1234-5678 이메일 info@church.com',
        images: [],
        links: [],
      }],
    });
    const result = classify(raw);
    const dirPage = result.pageContents.find((p) => p.pageSlug === 'directions');
    expect(dirPage).toBeDefined();
    expect(dirPage!.blocks.some((b) => b.blockType === 'location_map')).toBe(true);
    expect(dirPage!.blocks.some((b) => b.blockType === 'contact_info')).toBe(true);
  });

  it('skips hero_banner from page contents', () => {
    const raw = makeRaw({
      pages: [{
        url: 'https://example-church.com/about',
        title: '교회 소개',
        textContent: '우리 교회 소개입니다. 좋은 교회 입니다. 많은 분들이 오십니다.',
        images: [],
        links: [],
      }],
    });
    const result = classify(raw);
    for (const page of result.pageContents) {
      for (const block of page.blocks) {
        expect(block.blockType).not.toBe('hero_banner');
      }
    }
  });

  it('does not create blocks for dynamic pages (sermons, staff, etc)', () => {
    const raw = makeRaw({
      pages: [
        { url: 'https://example-church.com/sermons', title: '설교', textContent: 'content here', images: [], links: [] },
        { url: 'https://example-church.com/staff', title: '교역자', textContent: 'content', images: [], links: [] },
      ],
    });
    const result = classify(raw);
    const sermonPage = result.pageContents.find((p) => p.pageSlug === 'sermons');
    const staffPage = result.pageContents.find((p) => p.pageSlug === 'staff');
    expect(sermonPage?.blocks.length ?? 0).toBe(0);
    expect(staffPage?.blocks.length ?? 0).toBe(0);
  });
});

describe('classify — image collection', () => {
  it('collects all images from all pages', () => {
    const raw = makeRaw({
      pages: [
        { url: 'https://example-church.com/', title: 'Home', textContent: '', images: ['https://a.com/1.jpg', 'https://a.com/2.jpg'], links: [] },
        { url: 'https://example-church.com/about', title: 'About', textContent: 'content for about page with enough text to pass threshold', images: ['https://a.com/3.jpg'], links: [] },
      ],
    });
    const result = classify(raw);
    expect(result.images).toContain('https://a.com/1.jpg');
    expect(result.images).toContain('https://a.com/2.jpg');
    expect(result.images).toContain('https://a.com/3.jpg');
  });

  it('deduplicates images', () => {
    const raw = makeRaw({
      pages: [
        { url: 'https://example-church.com/', title: 'Home', textContent: '', images: ['https://a.com/1.jpg', 'https://a.com/1.jpg'], links: [] },
      ],
    });
    const result = classify(raw);
    const count = result.images.filter((u) => u === 'https://a.com/1.jpg').length;
    expect(count).toBe(1);
  });
});
