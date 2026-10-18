import { describe, it, expect } from 'vitest';
import type { OnlineHymn } from '@dw-church/api-client';
import { hasHymnContent } from '../OnlineBulletinManagement';

/**
 * 마지막 찬양(closingHymn) 비우기 버튼의 노출 판정.
 *
 * 이 판정이 느슨하면 빈 주보에도 [비우기] 가 떠서 "지울 게 없는데 삭제 버튼이
 * 있다"가 되고, 반대로 빡빡하면 악보만 올려둔 찬양을 지울 길이 없어진다 —
 * 원래 버그(한 번 입력하면 지울 수 없음)가 그 자리로 돌아온다.
 */
const empty: OnlineHymn = { title: '', hymnNo: '', imageUrls: [], note: '', lyrics: '' };

describe('hasHymnContent', () => {
  it('빈 찬양은 내용 없음', () => {
    expect(hasHymnContent(empty)).toBe(false);
    expect(hasHymnContent(undefined)).toBe(false);
    expect(hasHymnContent(null)).toBe(false);
  });

  it('공백만 입력된 것도 내용 없음', () => {
    expect(hasHymnContent({ ...empty, title: '   ', note: '\n' })).toBe(false);
  });

  it('제목 · 장 · 메모 · 가사 중 하나만 있어도 내용 있음', () => {
    expect(hasHymnContent({ ...empty, title: '주 은혜임을' })).toBe(true);
    expect(hasHymnContent({ ...empty, hymnNo: '찬121' })).toBe(true);
    expect(hasHymnContent({ ...empty, note: '1절만' })).toBe(true);
    expect(hasHymnContent({ ...empty, lyrics: '내 주를 가까이' })).toBe(true);
    expect(hasHymnContent({ ...empty, lyricsEn: 'Nearer my God to Thee' })).toBe(true);
  });

  it('제목 없이 악보 이미지만 올라가 있어도 내용 있음', () => {
    expect(hasHymnContent({ ...empty, imageUrls: ['https://r2/closing.png'] })).toBe(true);
  });

  it('imageUrls 가 없는 옛 데이터도 터지지 않는다', () => {
    expect(hasHymnContent({ title: '', hymnNo: '', note: '' } as unknown as OnlineHymn)).toBe(false);
  });
});
