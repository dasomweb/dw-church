import { describe, it, expect } from 'vitest';
import { replaceImageUrls } from '../../modules/migration/appliers/images.js';

describe('replaceImageUrls', () => {
  const urlMap = new Map([
    ['https://old.com/photo.jpg', 'https://r2.dev/tenant_grace/migration/abc.jpg'],
    ['https://old.com/thumb.jpg', 'https://r2.dev/tenant_grace/migration/def.jpg'],
    ['https://old.com/img1.jpg', 'https://r2.dev/tenant_grace/migration/111.jpg'],
    ['https://old.com/img2.jpg', 'https://r2.dev/tenant_grace/migration/222.jpg'],
  ]);

  it('replaces imageUrl field', () => {
    const props = { title: 'Test', imageUrl: 'https://old.com/photo.jpg' };
    const result = replaceImageUrls(props, urlMap);
    expect(result.imageUrl).toBe('https://r2.dev/tenant_grace/migration/abc.jpg');
  });

  it('replaces photoUrl field', () => {
    const props = { photoUrl: 'https://old.com/photo.jpg' };
    const result = replaceImageUrls(props, urlMap);
    expect(result.photoUrl).toBe('https://r2.dev/tenant_grace/migration/abc.jpg');
  });

  it('replaces thumbnailUrl field', () => {
    const props = { thumbnailUrl: 'https://old.com/thumb.jpg' };
    const result = replaceImageUrls(props, urlMap);
    expect(result.thumbnailUrl).toBe('https://r2.dev/tenant_grace/migration/def.jpg');
  });

  it('replaces images array', () => {
    const props = { images: ['https://old.com/img1.jpg', 'https://old.com/img2.jpg'] };
    const result = replaceImageUrls(props, urlMap);
    expect(result.images).toEqual([
      'https://r2.dev/tenant_grace/migration/111.jpg',
      'https://r2.dev/tenant_grace/migration/222.jpg',
    ]);
  });

  it('keeps URLs not in map unchanged', () => {
    const props = { imageUrl: 'https://other.com/notmapped.jpg' };
    const result = replaceImageUrls(props, urlMap);
    expect(result.imageUrl).toBe('https://other.com/notmapped.jpg');
  });

  it('preserves non-image props', () => {
    const props = { title: 'Test', content: 'Hello', imageUrl: 'https://old.com/photo.jpg' };
    const result = replaceImageUrls(props, urlMap);
    expect(result.title).toBe('Test');
    expect(result.content).toBe('Hello');
  });

  it('handles empty props', () => {
    const result = replaceImageUrls({}, urlMap);
    expect(result).toEqual({});
  });

  it('handles empty urlMap', () => {
    const props = { imageUrl: 'https://old.com/photo.jpg' };
    const result = replaceImageUrls(props, new Map());
    expect(result.imageUrl).toBe('https://old.com/photo.jpg');
  });
});
