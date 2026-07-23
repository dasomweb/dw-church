/**
 * Sermon YouTube URL canonicalization — the share-menu gives /live/<id>?si=…
 * (and youtu.be / shorts / embed) which the sermon field used to reject as an
 * invalid URL. normalizeYoutubeUrl rewrites every recognizable shape to the
 * clean watch?v=<id> form and leaves everything else untouched.
 */
import { describe, it, expect } from 'vitest';
import { normalizeYoutubeUrl } from '../../modules/sermons/service.js';

const ID = '6tBY4opFXEU';
const CANON = `https://www.youtube.com/watch?v=${ID}`;

describe('normalizeYoutubeUrl', () => {
  it('converts a share-menu /live/<id>?si=… URL to watch?v=', () => {
    expect(normalizeYoutubeUrl(`https://www.youtube.com/live/${ID}?si=Vaq-A4sNnPlkyRkZ`)).toBe(CANON);
  });

  it('handles youtu.be, shorts, embed, and bare watch URLs', () => {
    expect(normalizeYoutubeUrl(`https://youtu.be/${ID}?si=abc`)).toBe(CANON);
    expect(normalizeYoutubeUrl(`https://www.youtube.com/shorts/${ID}`)).toBe(CANON);
    expect(normalizeYoutubeUrl(`https://www.youtube.com/embed/${ID}`)).toBe(CANON);
    expect(normalizeYoutubeUrl(`https://www.youtube.com/watch?v=${ID}&t=30s`)).toBe(CANON);
  });

  it('is idempotent on an already-canonical URL', () => {
    expect(normalizeYoutubeUrl(CANON)).toBe(CANON);
  });

  it('leaves non-YouTube / empty input unchanged', () => {
    expect(normalizeYoutubeUrl('https://vimeo.com/12345')).toBe('https://vimeo.com/12345');
    expect(normalizeYoutubeUrl('')).toBe('');
    expect(normalizeYoutubeUrl(null)).toBe(null);
  });
});
