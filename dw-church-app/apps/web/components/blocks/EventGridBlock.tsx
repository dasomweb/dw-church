import { getEvents } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { EventGridBlockClient } from './EventGridBlockClient';

interface EventGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

// variant:
//   'cards-3'(기본) / 'cards-2' — 16:10 카드 그리드(날짜 배지 + 전체보기 버튼).
//   'cardnews'(15a 카드뉴스) — 정사각(1:1) 2장, 좌측 정렬 헤더 + "전체 →".
//     "카드뉴스는 이벤트 블록이 비슷한 기능" — 행사 콘텐츠를 한 장짜리 소식 카드로 노출.
export async function EventGridBlock({ props, slug }: EventGridBlockProps) {
  const variant = (props.variant as string) || 'cards-3';
  const cardnews = variant === 'cardnews';
  const limit = (props.limit as number) ?? (cardnews ? 2 : 6);
  const title = (props.title as string) || (cardnews ? '한 장으로 보내는 소식' : '행사/이벤트');
  const eyebrow = (props.eyebrow as string) || '';
  const columns = cardnews ? 2 : variant === 'cards-2' ? 2 : 3;

  let events;
  try {
    const result = await getEvents(slug, { perPage: limit });
    events = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    events = [];
  }

  if (events.length === 0) {
    return (
      <DataSection props={props} defaultBg={cardnews ? 'var(--dw-bg, #fff)' : 'var(--dw-surface)'}>
        <div className={cardnews ? 'mx-auto max-w-7xl' : 'mx-auto max-w-7xl text-center'}>
          <h2 className={`mb-4 font-heading text-2xl font-bold sm:text-3xl ${cardnews ? '' : 'text-center'}`} style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-sm text-gray-400">등록된 소식이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  if (cardnews) {
    return (
      <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              {eyebrow && <div className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--dw-primary, #1466d6)' }}>{eyebrow}</div>}
              <h2 className="font-heading text-2xl font-bold" style={getElementStyle(props, 'title')}>{title}</h2>
            </div>
          </div>
          <EventGridBlockClient events={events} slug={slug} columns={columns} variant="cardnews" />
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <EventGridBlockClient events={events} slug={slug} columns={columns} />
      </div>
    </DataSection>
  );
}
