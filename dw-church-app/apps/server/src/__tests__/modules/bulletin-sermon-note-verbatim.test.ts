import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 온라인 주보는 설교노트를 **작성된 그대로** 보여준다.
 *
 * 예전에는 주보가 노트를 자기 멋대로 재구성했다 — 번호 제목(## 1. …)을 포인트로
 * 쪼개 아코디언으로 접고(첫 항목만 펼침), 그 뒤 내용을 '아웃트로'로 밀어 순서를
 * 바꾸고, `# 제목` 줄은 아예 삭제하고, 카툰을 포인트에 임의로 짝지웠다.
 * 목사가 쓴 글이 뒤죽박죽으로 나와서 전부 걷어냈다.
 *
 * 이 테스트는 그 로직이 되살아나는 것을 막는다. 렌더는 전용 설교노트 페이지와
 * 같은 공용 렌더러(apps/web/components/blocks/note-markdown.tsx)를 쓴다.
 */
const WEB = join(process.cwd(), '../web/components/blocks');
const view = readFileSync(join(WEB, 'OnlineBulletinView.tsx'), 'utf-8');

describe('온라인 주보 — 설교노트 원문 보존', () => {
  it('노트를 포인트로 쪼개는 로직이 없다', () => {
    expect(view).not.toContain('splitPoints');
    expect(view).not.toMatch(/intro[\s\S]{0,40}points[\s\S]{0,40}outro/);
  });

  it('설교노트를 접는 UI(아코디언)가 없다', () => {
    // 본문을 숨기면 "그대로 보여준다"가 아니다.
    const sermon = view.slice(view.indexOf('function SermonNote'), view.indexOf('function SermonSection'));
    expect(sermon).not.toContain('setOpen');
    expect(sermon).not.toContain('▾');
  });

  it('주보 전용 마크다운 렌더러를 따로 두지 않는다 (공용 렌더러 사용)', () => {
    expect(view).not.toMatch(/^function Markdown\(/m);
    expect(view).not.toMatch(/^function InlineMd\(/m);
    expect(view).toContain("from './note-markdown'");
    expect(view).toContain('<NoteBody md=');
  });

  it('카툰은 포인트에 짝지우지 않고 올린 순서대로 본문 아래에 둔다', () => {
    const sermon = view.slice(view.indexOf('function SermonNote'), view.indexOf('function SermonSection'));
    expect(sermon).not.toMatch(/imgs\[i\]/);
    expect(sermon).toContain('<ScoreList imgs={imgs}');
  });

  it('공용 렌더러는 전용 설교노트 페이지와 같은 파일이다', () => {
    const page = readFileSync(join(WEB, 'SermonNotePageView.tsx'), 'utf-8');
    expect(page).toContain("from './note-markdown'");
  });
});

/**
 * 주보의 설교노트 섹션은 전용 설교노트 페이지와 **같은 항목**을 보여준다.
 * 한쪽에만 있는 항목이 생기면, 운영자는 올렸는데 주보에선 사라진 것처럼 보인다.
 */
describe('온라인 주보 — 설교노트와 항목 일치', () => {
  const page = readFileSync(join(WEB, 'SermonNotePageView.tsx'), 'utf-8');

  for (const field of ['activityFiles', 'parentGuide']) {
    it(`${field} 를 주보도 가져온다`, () => {
      expect(page).toContain(field);   // 전용 페이지에 있는 항목이고
      expect(view).toContain(field);   // 주보에도 있어야 한다
    });
  }

  it('활동학습 자료를 내려받기 목록으로 그린다', () => {
    expect(view).toContain('활동학습 자료');
    expect(view).toContain('rel="noopener noreferrer"');
    expect(view).toContain('function docName');
  });

  it('Kids 부모 안내 문구를 본문 위에 그린다', () => {
    expect(view).toMatch(/parentGuide \|\| ''\)\.trim\(\)/);
  });

  it('카툰만 있고 본문이 없어도 섹션이 열린다 (자료만 올린 주)', () => {
    expect(view).toMatch(/curNote = [^;]*files\?\.length/);
  });
});
