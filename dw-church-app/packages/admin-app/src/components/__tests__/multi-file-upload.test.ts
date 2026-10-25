import { describe, it, expect } from 'vitest';
import { fileNameFromUrl } from '../MultiFileUpload';

/**
 * 표시 이름 폴백 — 서버가 비이미지 파일의 **원본 파일명을 R2 키에 보존**하므로
 * (files/service.ts safeDocumentName) URL 끝부분이 곧 사람이 읽을 이름이다.
 * 이게 깨지면 성도가 "e842f484-….pdf" 를 받게 된다.
 */
describe('fileNameFromUrl', () => {
  it('URL 끝의 파일명을 뽑는다', () => {
    expect(fileNameFromUrl('https://r2.example/tenant_a/sermon-notes/activity.pdf')).toBe('activity.pdf');
  });
  it('퍼센트 인코딩된 한글을 되돌린다', () => {
    expect(fileNameFromUrl('https://r2.example/t/%ED%99%9C%EB%8F%99%EC%A7%80_1%EA%B3%BC.pdf'))
      .toBe('활동지_1과.pdf');
  });
  it('쿼리스트링은 이름에 섞이지 않는다', () => {
    expect(fileNameFromUrl('https://r2.example/t/worksheet.docx?v=2')).toBe('worksheet.docx');
  });
  it('URL 이 아니면 마지막 조각으로 떨어진다', () => {
    expect(fileNameFromUrl('not-a-url/plan.pdf')).toBe('plan.pdf');
  });
});
