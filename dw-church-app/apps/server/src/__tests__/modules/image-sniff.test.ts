/**
 * Magic-byte image sniffing — used by files.importFromUrl to recover the real
 * type when a remote host (e.g. some CDNs) sends a wrong/missing content-type.
 */
import { describe, it, expect } from 'vitest';
import { sniffImageMime } from '../../modules/files/service.js';

describe('sniffImageMime', () => {
  it('detects JPEG (FF D8 FF)', () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
  });
  it('detects PNG', () => {
    expect(sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('image/png');
  });
  it('detects GIF', () => {
    expect(sniffImageMime(Buffer.from('GIF89a______', 'ascii'))).toBe('image/gif');
  });
  it('detects WEBP (RIFF....WEBP)', () => {
    const buf = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP', 'ascii')]);
    expect(sniffImageMime(buf)).toBe('image/webp');
  });
  it('returns null for non-image / too-short buffers', () => {
    expect(sniffImageMime(Buffer.from('hello', 'ascii'))).toBeNull();
    expect(sniffImageMime(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
  });
});
