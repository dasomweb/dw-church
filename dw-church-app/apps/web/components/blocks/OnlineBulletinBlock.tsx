import { getLatestOnlineBulletin, getOnlineBulletin } from '@/lib/api';
import { DataSection } from './DataSection';
import { OnlineBulletinView } from './OnlineBulletinView';

interface OnlineBulletinBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * online_bulletin — 온라인 주보 data block. 최신 발행 주보(또는 props.bulletinId)를
 * 서버에서 가져와 스크롤 다운 형태로 렌더. 실제 렌더/한영 토글은 클라이언트
 * 컴포넌트(OnlineBulletinView)가 담당. 발행분이 없으면 null(빈 섹션 미출력).
 *
 * 스크롤 순서: 예배순서 → 찬양악보 → 대표기도 → 교회소식 → 성경본문(개역개정/ESV)
 *   → 설교노트 → 어린이 설교노트 → 기도제목 → 마지막찬양 → 소그룹 나눔 질문.
 * 성경본문·설교노트·어린이설교노트·기도제목·소그룹질문은 한/영 병기 시 토글 전환.
 */
export async function OnlineBulletinBlock({ props, slug }: OnlineBulletinBlockProps) {
  const bulletinId = (props.bulletinId as string) || '';
  let bulletin: Record<string, unknown> | null = null;
  try {
    bulletin = bulletinId ? await getOnlineBulletin(slug, bulletinId) : await getLatestOnlineBulletin(slug);
  } catch {
    bulletin = null;
  }
  if (!bulletin) return null;

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #ffffff)">
      <OnlineBulletinView bulletin={bulletin} />
    </DataSection>
  );
}
