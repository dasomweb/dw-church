/**
 * `gen-design-import-catalog.ts` 의 순수 함수 단위 테스트.
 *
 * ⚠ 이 폴더는 `pnpm test`(pnpm -r test, 워크스페이스 패키지만)에 **포함되지 않는다** —
 * scripts/ 는 패키지가 아니다. 실행:
 *   cd apps/server && npx vitest run --root ../.. scripts/design-importer/__tests__
 * 생성 **결과**의 드리프트는 `pnpm test` 가 도는
 * `apps/server/src/__tests__/modules/block-registry-drift.test.ts` 가 막는다.
 */
import { describe, it, expect } from 'vitest';
import { buildAliases, measureHardcodedType, readPlaceable, readKnown } from '../gen-design-import-catalog.js';

describe('buildAliases — 놓을 수 없는 이름 → 놓을 수 있는 이름', () => {
  const reg = {
    blocks: {
      cta_section: {},
      call_to_action: { aliasOf: 'cta_section' },
      location_map: {},
      map_embed: { aliasOf: 'location_map' },
      hero_banner: {},
      hero_full_width: { aliasOf: 'hero_banner' },
      ghost: { aliasOf: 'does_not_exist' },
    },
  };

  it('별칭만 팔레트에 있으면 정식 이름을 별칭으로 돌린다', () => {
    const a = buildAliases(reg, new Set(['call_to_action', 'location_map', 'map_embed', 'hero_banner']));
    expect(a.cta_section).toBe('call_to_action');
  });

  it('정식 이름만 팔레트에 있으면 별칭을 정식 이름으로 돌린다', () => {
    const a = buildAliases(reg, new Set(['hero_banner']));
    expect(a.hero_full_width).toBe('hero_banner');
  });

  it('양쪽 다 놓을 수 있으면 건드리지 않는다 (둘 다 유효하다)', () => {
    const a = buildAliases(reg, new Set(['location_map', 'map_embed']));
    expect(a.location_map).toBeUndefined();
    expect(a.map_embed).toBeUndefined();
  });

  it('존재하지 않는 대상을 가리키는 aliasOf 는 무시한다', () => {
    const a = buildAliases(reg, new Set(['ghost']));
    expect(a.does_not_exist).toBeUndefined();
  });
});

describe('measureHardcodedType — 테마 타이포를 무시하는 선언만 센다', () => {
  it('고정 px·Tailwind 크기·인라인 숫자를 센다', () => {
    const src = `
      <p className="text-[13px] text-sm">a</p>
      <p style={{ fontSize: 18 }}>b</p>
      <p style={{ fontSize: '20px' }}>c</p>`;
    expect(measureHardcodedType(src)).toBe(4);
  });

  it('CSS 변수로 쓴 크기는 세지 않는다 (토큰을 따르는 블록)', () => {
    const src = `<p style={{ fontSize: 'var(--ko-summary, 16px)' }}>a</p>
      <p style={{ fontSize: 'var(--fs-h2)' }}>b</p>`;
    expect(measureHardcodedType(src)).toBe(0);
  });

  it('색·여백 같은 다른 Tailwind 클래스는 세지 않는다', () => {
    expect(measureHardcodedType('className="text-white px-4 max-w-7xl gap-6"')).toBe(0);
  });
});

describe('소스 파싱 — 형태가 바뀌면 조용히 통과하지 않는다', () => {
  it('BLOCK_DEFS 를 못 읽으면 던진다 (0개로 통과하면 카탈로그가 비어버린다)', () => {
    expect(() => readPlaceable("const BLOCK_DEFS = [{ type: 'hero_banner' }]")).toThrow(/BLOCK_DEFS 파싱 실패/);
  });

  it('blockTypes enum 을 못 읽으면 던진다', () => {
    expect(() => readKnown("export const blockTypes = ['hero_banner'];")).toThrow(/blockTypes 파싱 실패/);
  });
});
