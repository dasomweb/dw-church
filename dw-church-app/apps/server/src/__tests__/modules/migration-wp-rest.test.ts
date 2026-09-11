/**
 * WP REST bulk collector — mapping logic (extractors/wp-rest.ts).
 * Verifies category → Content Module routing + date/image/youtube/pdf
 * extraction from WP post `content.rendered`, and that unrecognised
 * categories fall through to a board (never silently dropped).
 */
import { describe, it, expect } from 'vitest';
import { mapPostsToModules, type WpPost } from '../../modules/migration/extractors/wp-rest.js';

function post(category: string, over: Partial<WpPost> = {}): WpPost {
  return {
    id: Math.floor(Math.random() * 1e6),
    date: '2024-03-15T09:00:00',
    link: `https://old.example.org/?p=${Math.floor(Math.random() * 1000)}`,
    title: { rendered: '제목' },
    content: { rendered: '<p>본문</p>' },
    _embedded: {
      'wp:term': [[{ taxonomy: 'category', name: category, slug: category.toLowerCase() }]],
    },
    ...over,
  };
}

describe('mapPostsToModules — category routing', () => {
  it('주보 → bulletins (+ PDF + date + sourceUrl)', () => {
    const out = mapPostsToModules([
      post('주보', {
        title: { rendered: '3월 셋째 주 주보' },
        content: { rendered: '<a href="https://old.example.org/wp/jubo-0315.pdf">다운로드</a>' },
        link: 'https://old.example.org/jubo/315',
      }),
    ]);
    expect(out.bulletins).toHaveLength(1);
    expect(out.bulletins[0]!.title).toBe('3월 셋째 주 주보');
    expect(out.bulletins[0]!.pdfUrl).toBe('https://old.example.org/wp/jubo-0315.pdf');
    expect(out.bulletins[0]!.date).toBe('2024-03-15');            // ISO → YYYY-MM-DD
    expect(out.bulletins[0]!.sourceUrl).toBe('https://old.example.org/jubo/315');
  });

  it('설교/말씀 → sermons (+ youtube + featured thumbnail)', () => {
    const out = mapPostsToModules([
      post('주일설교', {
        content: { rendered: '<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>' },
        _embedded: {
          'wp:term': [[{ taxonomy: 'category', name: '주일설교', slug: 'sermon' }]],
          'wp:featuredmedia': [{ source_url: 'https://old.example.org/thumb.jpg' }],
        },
      }),
    ]);
    expect(out.sermons).toHaveLength(1);
    expect(out.sermons[0]!.youtubeUrl).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(out.sermons[0]!.thumbnailUrl).toBe('https://old.example.org/thumb.jpg');
  });

  it('앨범/갤러리 → albums (all content images + featured first)', () => {
    const out = mapPostsToModules([
      post('사진갤러리', {
        content: { rendered: '<img src="https://old.example.org/a.jpg"><img src="https://old.example.org/b.png">' },
        _embedded: {
          'wp:term': [[{ taxonomy: 'category', name: '사진갤러리', slug: 'gallery' }]],
          'wp:featuredmedia': [{ source_url: 'https://old.example.org/cover.jpg' }],
        },
      }),
    ]);
    expect(out.albums).toHaveLength(1);
    expect(out.albums[0]!.images[0]).toBe('https://old.example.org/cover.jpg'); // featured unshifted
    expect(out.albums[0]!.images).toContain('https://old.example.org/a.jpg');
    expect(out.albums[0]!.images).toContain('https://old.example.org/b.png');
  });

  it('칼럼/묵상 → columns (html stripped to text)', () => {
    const out = mapPostsToModules([
      post('목회칼럼', { content: { rendered: '<p>첫째 줄</p><p>둘째 줄</p>' } }),
    ]);
    expect(out.columns).toHaveLength(1);
    expect(out.columns[0]!.content).toContain('첫째 줄');
    expect(out.columns[0]!.content).not.toContain('<p>');
  });

  it('행사/공지 → events', () => {
    const out = mapPostsToModules([post('교회소식')]);
    expect(out.events).toHaveLength(1);
  });

  it('unrecognised category → board keyed by that category (never dropped)', () => {
    const out = mapPostsToModules([
      post('자유게시판', { title: { rendered: '안녕하세요' } }),
      post('자유게시판', { title: { rendered: '반갑습니다' } }),
    ]);
    expect(out.bulletins).toHaveLength(0);
    expect(out.boards).toHaveLength(1);
    expect(out.boards[0]!.boardTitle).toBe('자유게시판');
    expect(out.boards[0]!.posts).toHaveLength(2);
  });

  it('collects every content image into images[] across posts', () => {
    const out = mapPostsToModules([
      post('목회칼럼', { content: { rendered: '<img src="https://x/1.jpg">' } }),
      post('교회소식', { content: { rendered: '<img src="https://x/2.jpg">' } }),
    ]);
    expect(out.images).toContain('https://x/1.jpg');
    expect(out.images).toContain('https://x/2.jpg');
  });

  it('data: URIs and svg are excluded from images', () => {
    const out = mapPostsToModules([
      post('목회칼럼', { content: { rendered: '<img src="data:image/png;base64,AAAA"><img src="https://x/logo.svg"><img src="https://x/real.jpg">' } }),
    ]);
    expect(out.images).toEqual(['https://x/real.jpg']);
  });
});
