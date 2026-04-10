import { describe, it, expect } from 'vitest';
import { extractVideoId, thumbnailUrl, extractYouTubeUrlsFromPage } from '../../modules/migration/extractors/youtube.js';

describe('extractVideoId', () => {
  it('extracts from youtube.com/watch?v=', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be/', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com/embed/', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com/v/', () => {
    expect(extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('handles URL with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractVideoId('https://example.com/video')).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBe(null);
  });

  it('handles YouTube URL without www', () => {
    expect(extractVideoId('https://youtube.com/watch?v=abc12345678')).toBe('abc12345678');
  });
});

describe('thumbnailUrl', () => {
  it('generates maxresdefault thumbnail URL', () => {
    expect(thumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });

  it('generates correct URL for any video ID', () => {
    const url = thumbnailUrl('abc123');
    expect(url).toContain('abc123');
    expect(url).toContain('maxresdefault');
  });
});

describe('extractYouTubeUrlsFromPage', () => {
  it('extracts from links', () => {
    const links = [
      { text: '설교', href: 'https://www.youtube.com/watch?v=abc123' },
      { text: '찬양', href: 'https://youtu.be/def456' },
    ];
    const urls = extractYouTubeUrlsFromPage('', links);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('abc123');
    expect(urls[1]).toContain('def456');
  });

  it('extracts from text content', () => {
    const text = '설교 영상: https://www.youtube.com/watch?v=xyz789 을 참고하세요';
    const urls = extractYouTubeUrlsFromPage(text, []);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('xyz789');
  });

  it('deduplicates across links and text', () => {
    const text = 'https://www.youtube.com/watch?v=same123';
    const links = [{ text: 'Video', href: 'https://www.youtube.com/watch?v=same123' }];
    const urls = extractYouTubeUrlsFromPage(text, links);
    expect(urls).toHaveLength(1);
  });

  it('returns empty for no YouTube content', () => {
    const urls = extractYouTubeUrlsFromPage('no videos here', [{ text: 'Link', href: 'https://example.com' }]);
    expect(urls).toHaveLength(0);
  });
});
