import { getSermons } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { RecentSermonsClient } from './RecentSermonsClient';

interface RecentSermonsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function RecentSermonsBlock({ props, slug }: RecentSermonsBlockProps) {
  const variant = (props.variant as string) || 'grid-3';
  const featured = variant === 'featured';
  const sermonCard = variant === 'card'; // 시안 '이번 주 말씀' 단일 카드(썸네일+본문+버튼)
  // featured needs a lead + a few for the side list; default a touch higher.
  const limit = (props.limit as number) ?? (sermonCard ? 1 : featured ? 5 : 6);
  const title = (props.title as string) || '최근 설교';
  const columns = variant === 'grid-2' ? 2 : variant === 'list' ? 1 : variant === 'grid-4' ? 4 : 3;

  let sermons;
  try {
    const result = await getSermons(slug, { perPage: limit });
    sermons = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    sermons = [];
  }

  if (sermons.length === 0) {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 설교가 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  // 카드 스킨은 자체 헤더(이번 주 말씀 · 설교 원고·음성)를 가지므로 중앙 h2 생략.
  if (sermonCard) {
    const card = <RecentSermonsClient sermons={sermons} slug={slug} columns={1} sermonCard cardTitle={title} />;
    // 레이아웃 컬럼 안에서는 섹션 크롬 없이 카드만(맨 카드 2단).
    if (props._inLayout) return card;
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)">
        <div className="mx-auto max-w-7xl">{card}</div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <RecentSermonsClient sermons={sermons} slug={slug} columns={columns} featured={featured} />
      </div>
    </DataSection>
  );
}
