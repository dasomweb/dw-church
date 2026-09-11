/** Unit tests — live-unchanged fingerprint (deterministic + volatile-tolerant). */
import { describe, it, expect } from 'vitest';
import { fingerprint } from '../verify-live-unchanged.js';

const HTML = `<!doctype html><html><body>
  <section data-dw-section data-block-type="hero_banner"><h1>환영합니다</h1></section>
  <section data-block-type="recent_sermons">설교</section>
  <script nonce="abc123">console.log(1)</script>
</body></html>`;

describe('fingerprint', () => {
  it('is deterministic for identical input', () => {
    expect(fingerprint(HTML).hash).toBe(fingerprint(HTML).hash);
  });

  it('extracts the ordered block types', () => {
    expect(fingerprint(HTML).blocks).toEqual(['hero_banner', 'recent_sermons']);
  });

  it('ignores volatile bits (nonce, build id, whitespace) → same hash', () => {
    const a = fingerprint(HTML);
    const b = fingerprint(
      HTML.replace('nonce="abc123"', 'nonce="zzz999"')
        .replace('환영합니다', '환영합니다')
        .replace(/\n\s+/g, '\n   '),           // whitespace churn
    );
    expect(b.hash).toBe(a.hash);
  });

  it('detects a real structural change (added block) → different hash', () => {
    const changed = HTML.replace('</body>', '<section data-block-type="board">게시판</section></body>');
    expect(fingerprint(changed).hash).not.toBe(fingerprint(HTML).hash);
    expect(fingerprint(changed).blocks).toContain('board');
  });
});
