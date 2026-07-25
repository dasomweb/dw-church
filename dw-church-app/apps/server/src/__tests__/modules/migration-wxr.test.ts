/**
 * WordPress WXR extractor — turns a WP export into RawExtractedData for the
 * existing classify()/applyAll() pipeline. Lock: only page/post publish/draft
 * items become pages, CDATA + entities are unwrapped, images are pulled from the
 * item HTML, and content becomes structured plain text.
 */
import { describe, it, expect } from 'vitest';
import { parseWxr, htmlToText, imagesFromHtml } from '../../modules/migration/extractors/wxr.js';

const WXR = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <item>
    <title><![CDATA[교회 소개]]></title>
    <link>https://old.example.org/about</link>
    <wp:post_type><![CDATA[page]]></wp:post_type>
    <wp:status><![CDATA[publish]]></wp:status>
    <content:encoded><![CDATA[<p>우리 교회는 1990년에 세워졌습니다.</p><p><img src="https://old.example.org/wp-content/uploads/church.jpg" /></p>]]></content:encoded>
  </item>
  <item>
    <title>주일 설교 &amp; 말씀</title>
    <link>https://old.example.org/sermon-1</link>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <wp:status><![CDATA[publish]]></wp:status>
    <content:encoded><![CDATA[<p>첫째 줄<br/>둘째 줄</p>]]></content:encoded>
  </item>
  <item>
    <title><![CDATA[숨김 페이지]]></title>
    <wp:post_type><![CDATA[page]]></wp:post_type>
    <wp:status><![CDATA[trash]]></wp:status>
    <content:encoded><![CDATA[<p>삭제됨</p>]]></content:encoded>
  </item>
  <item>
    <title><![CDATA[logo.png]]></title>
    <wp:post_type><![CDATA[attachment]]></wp:post_type>
    <wp:status><![CDATA[inherit]]></wp:status>
    <wp:attachment_url>https://old.example.org/wp-content/uploads/logo.png</wp:attachment_url>
  </item>
</channel></rss>`;

describe('parseWxr', () => {
  const raw = parseWxr(WXR);

  it('imports only page/post publish/draft items (skips trash + attachment)', () => {
    expect(raw.pages).toHaveLength(2);
    expect(raw.pages.map((p) => p.title).sort()).toEqual(['교회 소개', '주일 설교 & 말씀']);
  });

  it('unwraps CDATA + decodes entities in titles', () => {
    expect(raw.pages.some((p) => p.title === '주일 설교 & 말씀')).toBe(true);
  });

  it('pulls images from the item HTML', () => {
    const about = raw.pages.find((p) => p.title === '교회 소개')!;
    expect(about.images).toEqual(['https://old.example.org/wp-content/uploads/church.jpg']);
  });

  it('converts content to structured plain text', () => {
    const about = raw.pages.find((p) => p.title === '교회 소개')!;
    expect(about.textContent).toContain('1990년');
    expect(about.textContent).not.toContain('<p>');
  });

  it('sets a manual source (not a crawl)', () => {
    expect(raw.source.type).toBe('manual');
    expect(raw.source.url).toBe('wxr-upload');
  });
});

describe('htmlToText / imagesFromHtml', () => {
  it('turns <br> and block closes into newlines', () => {
    expect(htmlToText('<p>a<br/>b</p><p>c</p>')).toBe('a\nb\nc');
  });
  it('ignores data: URIs', () => {
    expect(imagesFromHtml('<img src="data:image/png;base64,xxx"><img src="https://x/y.jpg">')).toEqual(['https://x/y.jpg']);
  });
});
