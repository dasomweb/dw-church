import Link from 'next/link';
import { getCardnews } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

// 카드뉴스 (Claude Design 15a) — 데이터 블록. 카드뉴스 콘텐츠 모듈(관리자 업로드)의
// 게시된 카드를 fetch 해서 정사각 이미지 카드 그리드로 표시. 등록 카드가 없으면
// props.items(정적 카드) 폴백, 그것도 없으면 섹션 숨김. 모바일 = 2열.
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
  const MUTED = 'var(--dw-text-muted, #61697a)';
  // 중첩(반폭 컬럼)이면 항상 2열, 전면폭이면 2→3→4 반응형. 모바일은 항상 2열.
  const gridClass = inLayout ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
      {/* 가로 패딩은 DataSection 이 제공 — 이중 여백 방지 */}
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          {eyebrow && <div className="mb-2 text-[13px] font-semibold" style={{ color: BRAND }}>{eyebrow}</div>}
          <h2 className="font-heading text-[22px] font-bold sm:text-2xl" style={getElementStyle(props, 'title')}>{title}</h2>
        </div>
        <div className={`grid gap-3 sm:gap-4 ${gridClass}`}>
          {cards.map((c, i) => {
            const href = c.linkUrl || c.href || '';
            const desc = c.description || c.caption || '';
            const inner = (
              <>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.title ?? ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-white/90" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #1466d6), var(--dw-secondary, #64748b))' }}>🗞️</div>
                  )}
                </div>
                {c.title && <div className="mt-2.5 text-[14px] font-semibold leading-snug sm:text-[15.5px]">{c.title}</div>}
                {desc && <div className="mt-1 text-[12.5px] leading-[1.5] sm:text-[13px]" style={{ color: MUTED }}>{desc}</div>}
              </>
            );
            return href ? (
              <Link key={i} href={href} className="group block text-left">{inner}</Link>
            ) : (
              <div key={i} className="group text-left">{inner}</div>
            );
          })}
        </div>
      </div>
    </DataSection>
  );
}
