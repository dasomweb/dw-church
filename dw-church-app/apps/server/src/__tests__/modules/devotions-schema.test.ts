import { describe, it, expect } from 'vitest';
import { createDevotionSchema, updateDevotionSchema } from '../../modules/devotions/schema.js';

/**
 * 말씀 묵상(QT) 입력 검증.
 *
 * 묵상 본문(reflection)은 설교노트와 **같은 마크다운**으로 저장한다
 * (제목/굵게/인용/불릿/번호/링크/사진). 서식 문자와 R2 사진 주소가 섞이면
 * 본문 길이가 금방 불어나므로, 서식이 길이 제한에 걸려 저장 실패하지 않도록
 * 한도를 넉넉히 둔 것이 이 테스트의 핵심이다.
 *
 * ⚠️ 저작권: 성경 본문 전문은 저장하지 않는다 — scriptureRef(참조)만 필수에 가깝고
 *    verse 는 라이선스 있는 교회만 채우는 선택 필드.
 */
describe('createDevotionSchema', () => {
  it('제목만 있어도 통과한다', () => {
    const r = createDevotionSchema.parse({ title: '복 있는 사람의 길' });
    expect(r.title).toBe('복 있는 사람의 길');
    expect(r.status).toBe('published'); // 기본 공개
  });

  it('제목이 비면 거부한다', () => {
    expect(() => createDevotionSchema.parse({ title: '' })).toThrow();
    expect(() => createDevotionSchema.parse({})).toThrow();
  });

  it('본문에 마크다운 서식을 그대로 받는다', () => {
    const md = [
      '## 오늘의 묵상',
      '',
      '> 시편 1:1',
      '> 복 있는 사람은 악인의 꾀를 따르지 아니하며',
      '',
      '**복은 길의 문제입니다.**',
      '',
      '- 어디에 서 있는가',
      '- 누구와 걷는가',
      '',
      '1. 내 하루의 자리를 적어 봅니다',
      '',
      '![](https://r2.example/tenant_dasom/devotions/a.jpg)',
      '',
      '[지난 묵상 보기](https://example.org/devotions)',
      '',
      '---',
    ].join('\n');
    const r = createDevotionSchema.parse({ title: 'T', reflection: md });
    expect(r.reflection).toBe(md); // 서식을 깎아내지 않는다
  });

  it('사진 주소가 여러 장 섞인 긴 본문도 받는다 (20000자 한도였으면 실패)', () => {
    const photo = '![](https://r2.example/tenant_dasom/devotions/0123456789abcdef0123456789abcdef.jpg)\n\n';
    const long = '묵상 본문 문단입니다. '.repeat(1500) + photo.repeat(40);
    expect(long.length).toBeGreaterThan(20000);
    expect(long.length).toBeLessThanOrEqual(60000);
    expect(() => createDevotionSchema.parse({ title: 'T', reflection: long })).not.toThrow();
  });

  it('한도를 넘기면 거부한다', () => {
    expect(() => createDevotionSchema.parse({ title: 'T', reflection: 'ㄱ'.repeat(60001) })).toThrow();
  });

  it('대표 이미지 주소를 받는다 (관리 화면에서 올린 묵상 사진)', () => {
    const r = createDevotionSchema.parse({ title: 'T', imageUrl: 'https://r2.example/tenant_dasom/devotions/x.jpg' });
    expect(r.imageUrl).toContain('/devotions/');
  });

  it('성경 참조는 받고, 본문 전문 칸(verse)은 선택이다', () => {
    const r = createDevotionSchema.parse({ title: 'T', scriptureRef: '시편 1편' });
    expect(r.scriptureRef).toBe('시편 1편');
    expect(r.verse).toBeUndefined();
  });
});

describe('updateDevotionSchema', () => {
  it('본문만 보내는 부분 수정을 허용한다', () => {
    const r = updateDevotionSchema.parse({ reflection: '## 고침\n\n새 본문' });
    expect(r.reflection).toContain('## 고침');
    expect(r.title).toBeUndefined();
  });
});
