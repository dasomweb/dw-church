/**
 * 스몰그룹 프리셋 순수 로직 — 운영모델 4종의 용어·계층·규칙, 용어 병합.
 * 기획안 §11: 프리셋은 표를 바꾸지 않고 용어와 규칙만 바꾼다.
 */
import { describe, it, expect } from 'vitest';
import { PRESETS, presetPayload, resolveTerminology } from '../../modules/smallgroup/presets.js';

describe('smallgroup presets', () => {
  it('has all four operating models A~D', () => {
    expect(Object.keys(PRESETS).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('model A = 가정교회 목장 용어', () => {
    const t = PRESETS.A.terminology;
    expect(t.org).toBe('목장');
    expect(t.leader).toBe('목자');
    expect(t.subleader).toBe('목녀');
    expect(t.member).toBe('목원');
  });

  it('only model D allows multi-membership', () => {
    expect(PRESETS.A.allowMulti).toBe(false);
    expect(PRESETS.B.allowMulti).toBe(false);
    expect(PRESETS.C.allowMulti).toBe(false);
    expect(PRESETS.D.allowMulti).toBe(true);
  });

  it('level defs never exceed 3 levels and are ordered', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.levelDefs.length).toBeGreaterThanOrEqual(1);
      expect(p.levelDefs.length).toBeLessThanOrEqual(3);
      p.levelDefs.forEach((d, idx) => expect(d.level).toBe(idx + 1));
    }
  });

  it('model C is single-level (셀)', () => {
    expect(PRESETS.C.levelDefs).toHaveLength(1);
    expect(PRESETS.C.levelDefs[0].leaderTitle).toBe('셀리더');
  });

  it('all report items share the 5 default fields incl. private care', () => {
    for (const p of Object.values(PRESETS)) {
      const keys = p.reportItems.map((r) => r.key);
      expect(keys).toContain('attendance');
      expect(keys).toContain('summary');
      const care = p.reportItems.find((r) => r.key === 'care');
      expect(care?.private).toBe(true);
    }
  });

  it('presetPayload returns the storable shape', () => {
    const pl = presetPayload('A');
    expect(pl.model).toBe('A');
    expect(pl.terminology.org).toBe('목장');
    expect(Array.isArray(pl.levelDefs)).toBe(true);
    expect(Array.isArray(pl.reportItems)).toBe(true);
  });

  it('resolveTerminology: override wins, missing keys fall back to model base', () => {
    const t = resolveTerminology('A', { org: '사랑방', leader: '방장' });
    expect(t.org).toBe('사랑방');   // overridden
    expect(t.leader).toBe('방장');  // overridden
    expect(t.member).toBe('목원');  // fallback to model A base
  });

  it('resolveTerminology: null override → pure model base', () => {
    expect(resolveTerminology('B', null).org).toBe('구역');
    expect(resolveTerminology('C', undefined).leader).toBe('셀리더');
  });

  it('unknown model falls back to A base (defensive)', () => {
    expect(resolveTerminology('X' as never, null).org).toBe('목장');
  });
});
