import { describe, it, expect } from 'vitest';
import { BLOCK_REGISTRY, isKnownBlockType } from '../registry';

/**
 * 블록은 여러 곳에 **같이** 등록돼야 동작한다(렌더러 · 레지스트리 · 서버 zod enum ·
 * 에디터 BLOCK_DEFS · element-registry). 한 군데만 빠지면 화면엔 멀쩡히 보이는데
 * 저장이 400 나거나, 저장은 되는데 스토어프론트가 빈칸을 그린다 — 원인 찾기 어려운 쪽.
 *
 * 여기서는 이 패키지가 닿을 수 있는 두 곳(레지스트리 · 알려진 타입 판정)을 못 박는다.
 * 서버 enum 은 apps/server 쪽 테스트에서 확인한다.
 */
const PUSH_BLOCKS = ['push_subscribe', 'notification_prefs'] as const;

describe('푸시 블록 등록', () => {
  it.each(PUSH_BLOCKS)('%s 가 블록 레지스트리에 있다', (type) => {
    expect(BLOCK_REGISTRY[type]).toBeDefined();
  });

  it.each(PUSH_BLOCKS)('%s 가 알려진 블록 타입으로 판정된다', (type) => {
    expect(isKnownBlockType(type)).toBe(true);
  });

  it.each(PUSH_BLOCKS)('%s 에 라벨·설명·AI 힌트가 채워져 있다', (type) => {
    const def = BLOCK_REGISTRY[type]!;
    // 빈 라벨이면 블록 팔레트에서 이름 없는 칸으로 보인다.
    expect(def.label.trim().length).toBeGreaterThan(0);
    expect(def.description?.trim().length ?? 0).toBeGreaterThan(0);
    expect(def.aiHint?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('데이터 블록이나 레이아웃 블록으로 잘못 표시되지 않았다', () => {
    for (const t of PUSH_BLOCKS) {
      const f = BLOCK_REGISTRY[t]!.flags ?? {};
      // 둘 다 자체 입력 UI 라 콘텐츠 모듈에서 fetch 하지 않고, 자식 블록도 없다.
      expect(f.isDataBlock ?? false).toBe(false);
      expect(f.isLayoutBlock ?? false).toBe(false);
    }
  });
});

describe('recent_books 블록 등록', () => {
  it('레지스트리에 있고 데이터 블록으로 표시된다', () => {
    const def = BLOCK_REGISTRY['recent_books'];
    expect(def).toBeDefined();
    // 콘텐츠 모듈에서 fetch 하는 블록이라 isDataBlock 이어야 팔레트 분류가 맞다.
    expect(def!.flags?.isDataBlock).toBe(true);
    expect(def!.label.trim().length).toBeGreaterThan(0);
    expect(def!.aiHint?.trim().length ?? 0).toBeGreaterThan(0);
  });
  it('알려진 블록 타입으로 판정된다', () => {
    expect(isKnownBlockType('recent_books')).toBe(true);
  });
});
