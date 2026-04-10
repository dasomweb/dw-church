import { describe, it, expect } from 'vitest';
import { emptyRawData, emptyClassifiedData, emptyApplyResult } from '../../modules/migration/types.js';

describe('emptyRawData', () => {
  it('returns valid structure', () => {
    const raw = emptyRawData();
    expect(raw.source).toBeDefined();
    expect(raw.source.url).toBe('');
    expect(raw.source.type).toBe('html');
    expect(raw.pages).toEqual([]);
    expect(raw.youtubeVideos).toEqual([]);
  });

  it('returns new object each call', () => {
    const a = emptyRawData();
    const b = emptyRawData();
    expect(a).not.toBe(b);
    a.pages.push({ url: 'test', title: '', textContent: '', images: [], links: [] });
    expect(b.pages).toHaveLength(0);
  });
});

describe('emptyClassifiedData', () => {
  it('returns all arrays empty', () => {
    const cd = emptyClassifiedData();
    expect(cd.sermons).toEqual([]);
    expect(cd.bulletins).toEqual([]);
    expect(cd.columns).toEqual([]);
    expect(cd.events).toEqual([]);
    expect(cd.albums).toEqual([]);
    expect(cd.boards).toEqual([]);
    expect(cd.staff).toEqual([]);
    expect(cd.history).toEqual([]);
    expect(cd.worshipTimes).toEqual([]);
    expect(cd.menus).toEqual([]);
    expect(cd.pageContents).toEqual([]);
    expect(cd.images).toEqual([]);
  });

  it('returns empty churchInfo', () => {
    const cd = emptyClassifiedData();
    expect(cd.churchInfo.name).toBe('');
    expect(cd.churchInfo.phone).toBe('');
  });
});

describe('emptyApplyResult', () => {
  it('returns all counts as 0', () => {
    const r = emptyApplyResult();
    expect(r.images).toBe(0);
    expect(r.settings).toBe(0);
    expect(r.sermons).toBe(0);
    expect(r.staff).toBe(0);
    expect(r.pages).toBe(0);
  });
});
