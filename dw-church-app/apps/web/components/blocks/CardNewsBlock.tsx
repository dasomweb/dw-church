import { getCardnews } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { CardNewsDecksClient, type DeckItem } from './CardNewsDecksClient';

// 카드뉴스 — 데이터 블록. Atlanta Koreatown 카드뉴스 레퍼런스 기반: 한 주제를 여러
// 4:5 이미지 카드로 넘겨 보는 "덱". 카드뉴스 모듈(관리자 업로드)의 게시 덱을 표지
// 그리드/레일로 보여 주고, 표지를 누르면 몰입형 뷰어가 열린다. 교회 톤(밝은 배경).
// 등록 덱이 없으면 props.items(정적) 폴백, 그것도 없으면 섹션 숨김.
interface Props { props: Record<string, unknown>; slug: string }

interface Row {
  id?: string; title?: string; category?: string | null; description?: string | null;
  imageUrl?: string; linkUrl?: string; href?: string;
  cards?: { imageUrl: string; caption?: string }[];
}

// 한 행(카드뉴스)을 덱으로 정규화. cards 가 있으면 그대로, 없으면(레거시 flat 행)
// image_url/description 으로 1장 덱을 만든다. 표지=image_url 우선, 없으면 첫 카드.
function toDeck(r: Row, i: number): DeckItem | null {
  const cards = (Array.isArray(r.cards) && r.cards.length)
    ? r.cards.filter((c) => c && c.imageUrl)
    : (r.imageUrl ? [{ imageUrl: r.imageUrl, caption: r.description ?? '' }] : []);
  const cover = r.imageUrl || cards[0]?.imageUrl;
  const linkUrl = r.linkUrl || r.href || '';
  if (!cover && !cards.length && !linkUrl) return null;
  return {
    id: r.id || `card-${i}`,
    title: r.title, category: r.category ?? null, description: r.description ?? null,
    cover, linkUrl, cards,
  };
}

export async function CardNewsBlock({ props, slug }: Props) {
  const eyebrow = (props.eyebrow as string) || '카드뉴스';
  const title = (props.title as string) || '한 장으로 보내는 소식';
  const inLayout = props._inLayout === true;
  const variant = (props.variant === 'rail' ? 'rail' : 'grid') as 'grid' | 'rail';

  // 1) 카드뉴스 모듈에서 게시 덱 fetch.
  let rows: Row[] = [];
  try {
    const data = await getCardnews(slug);
    rows = (Array.isArray(data) ? data : []) as Row[];
  } catch { rows = []; }

  // 2) 모듈 덱이 있으면 그걸, 없으면 정적 items(블록에 직접 넣은 카드) 폴백.
  const staticItems = (Array.isArray(props.items) ? props.items : []) as Row[];
  const source = rows.length ? rows : staticItems;
  const decks = source.map(toDeck).filter(Boolean) as DeckItem[];
  if (!decks.length) return null; // 아무 덱도 없으면 섹션 숨김

  const BRAND = 'var(--dw-primary, #1466d6)';
  // 교회 톤: 브랜드를 살짝 섞은 차분한 배경. inLayout(반폭)일 땐 흰 배경.
  const churchBg = inLayout
    ? 'var(--dw-bg, #ffffff)'
    : 'color-mix(in srgb, var(--dw-primary, #1466d6) 6%, var(--dw-bg, #ffffff))';

  return (
    <DataSection props={props} defaultBg={churchBg}>
      {/* 가로 패딩은 DataSection 이 제공 — 이중 여백 방지 */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          {eyebrow && <div className="mb-2 text-[13px] font-semibold" style={{ color: BRAND }}>{eyebrow}</div>}
          <h2 className="font-heading text-[22px] font-bold sm:text-[26px]" style={getElementStyle(props, 'title')}>{title}</h2>
        </div>
        <CardNewsDecksClient decks={decks} variant={variant} />
      </div>
    </DataSection>
  );
}
