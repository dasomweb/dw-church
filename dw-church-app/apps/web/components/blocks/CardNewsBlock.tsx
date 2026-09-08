import { getCardnews } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { CardNewsCarouselClient } from './CardNewsCarouselClient';

// 카드뉴스 (Claude Design 15a) — 데이터 블록. 카드뉴스 콘텐츠 모듈(관리자 업로드)의
// 게시된 카드를 fetch 해서 한 장씩 넘겨 보는 캐러셀로 표시(교회 톤 배경). 등록 카드가
// 없으면 props.items(정적 카드) 폴백, 그것도 없으면 섹션 숨김.
interface Props { props: Record<string, unknown>; slug: string }

interface Card { title?: string; description?: string; caption?: string; imageUrl?: string; linkUrl?: string; href?: string }

export async function CardNewsBlock({ props, slug }: Props) {
  const eyebrow = (props.eyebrow as string) || '카드뉴스';
  const title = (props.title as string) || '한 장으로 보내는 소식';
  const inLayout = props._inLayout === true;

  // 1) 카드뉴스 모듈에서 게시 카드 fetch.
  let moduleCards: Card[] = [];
  try {
    const rows = await getCardnews(slug);
    moduleCards = (Array.isArray(rows) ? rows : []) as Card[];
  } catch { moduleCards = []; }

  // 2) 모듈 카드가 있으면 그걸, 없으면 정적 items(운영자가 블록에 직접 넣은 카드) 폴백.
  const staticItems = (Array.isArray(props.items) ? props.items : []) as Card[];
  const cards: Card[] = moduleCards.length ? moduleCards : staticItems;
  if (!cards.length) return null; // 아무 카드도 없으면 섹션 숨김

  const BRAND = 'var(--dw-primary, #1466d6)';
  // 교회 톤: 강한 색 대신 브랜드를 살짝 섞은 차분한 배경(경건/정돈). inLayout(반폭)일
  // 땐 옆 블록과 톤이 튀지 않게 흰 배경.
  const churchBg = inLayout
    ? 'var(--dw-bg, #ffffff)'
    : 'color-mix(in srgb, var(--dw-primary, #1466d6) 6%, var(--dw-bg, #ffffff))';

  return (
    <DataSection props={props} defaultBg={churchBg}>
      {/* 가로 패딩은 DataSection 이 제공 — 이중 여백 방지 */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          {eyebrow && <div className="mb-2 text-[13px] font-semibold" style={{ color: BRAND }}>{eyebrow}</div>}
          <h2 className="font-heading text-[22px] font-bold sm:text-[26px]" style={getElementStyle(props, 'title')}>{title}</h2>
        </div>
        {/* 한 장씩 넘겨 보는 캐러셀 */}
        <CardNewsCarouselClient cards={cards} />
      </div>
    </DataSection>
  );
}
