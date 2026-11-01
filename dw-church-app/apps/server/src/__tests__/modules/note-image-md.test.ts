import { describe, it, expect } from 'vitest';

/**
 * 노트 본문 사진 — 스토어프론트 렌더러(apps/web/components/blocks/note-markdown.tsx)가
 * 쓰는 규칙과 관리자 편집기(NoteRichArea)가 넣는 문자열이 **같은 모양**이어야 한다.
 * 한쪽만 바뀌면 사진이 이미지가 아니라 날것의 마크다운 글자로 본문에 박힌다.
 *
 * 설교노트와 말씀 묵상(QT)이 같은 렌더러를 쓰므로 이 규칙은 둘 다에 적용된다.
 *
 * 규칙: 한 줄이 통째로 ![캡션](주소) 일 때만 이미지. 문장 중간 혼용은 받지 않는다
 * (InlineMd 의 링크/강조 규칙과 충돌해 오히려 깨진다).
 */
const IMG_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

describe('본문 사진 마크다운 규칙', () => {
  it('캡션 없이 넣은 줄을 이미지로 읽는다 (편집기가 넣는 모양)', () => {
    const m = IMG_LINE.exec('![](https://r2.example/a/b.png)');
    expect(m).not.toBeNull();
    expect(m![1]).toBe('');
    expect(m![2]).toBe('https://r2.example/a/b.png');
  });

  it('캡션이 있으면 캡션을 뽑는다', () => {
    const m = IMG_LINE.exec('![예배 사진](https://r2.example/a/b.jpg)');
    expect(m![1]).toBe('예배 사진');
  });

  it('문장 중간에 섞인 것은 이미지로 보지 않는다', () => {
    expect(IMG_LINE.exec('오늘 ![](https://x/y.png) 보세요')).toBeNull();
  });

  it('일반 링크를 이미지로 오인하지 않는다', () => {
    expect(IMG_LINE.exec('[링크](https://x/y)')).toBeNull();
  });

  it('주소에 공백이 섞이면 받지 않는다 (깨진 입력)', () => {
    expect(IMG_LINE.exec('![](https://x/y z.png)')).toBeNull();
  });

  it('한글 파일명 주소도 받는다', () => {
    const m = IMG_LINE.exec('![](https://r2.example/t/%ED%99%9C%EB%8F%99.png)');
    expect(m).not.toBeNull();
  });
});
