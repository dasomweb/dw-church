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
//     시안 15a 카드뉴스는 운영자 업로드 이미지 카드('browse files' 슬롯)라, props.items
//     (정적 카드)가 있으면 그걸 그대로 렌더(콘텐츠 의존 없음). 없으면 행사 데이터를
//     정사각 소식 카드로 노출(대표님 "이벤트 블록이 비슷한 기능"). 둘 다 없으면 숨김.
export async function EventGridBlock({ props, slug }: EventGridBlockProps) {
  const variant = (props.variant as string) || 'cards-3';
  const cardnews = variant === 'cardnews';
  const staticItems = (cardnews && Array.isArray(props.items) ? props.items : []) as {
    title?: string; description?: string; caption?: string; imageUrl?: string; href?: string;
  }[];
  const limit = (props.limit as number) ?? (cardnews ? 2 : 6);
  const title = (props.title as string) || (cardnews ? '한 장으로 보내는 소식' : '행사/이벤트');
  const eyebrow = (props.eyebrow as string) || '';
  const columns = cardnews ? 2 : variant === 'cards-2' ? 2 : 3;

  // 정적 카드뉴스면 행사 조회를 생략.
  let events: any[] = [];
  if (!(cardnews && staticItems.length)) {
    try {
      const result = await getEvents(slug, { perPage: limit });
      events = Array.isArray(result) ? result : (result?.data ?? []);
    } catch {
      events = [];
    }
  }

  if (cardnews) {
    const cards = staticItems.length
      ? staticItems.map((it) => ({
          id: it.href || '', title: it.title || '', location: it.description || it.caption || '',
          backgroundImageUrl: it.imageUrl || '', _static: true,
        }))
      : events;
    if (!cards.length) return null; // 행사·정적카드 모두 없으면 섹션 숨김(빈 박스 방지)
    return (
      <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              {eyebrow && <div className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--dw-primary, #1466d6)' }}>{eyebrow}</div>}
              <h2 className="font-heading text-2xl font-bold" style={getElementStyle(props, 'title')}>{title}</h2>
            </div>
          </div>
          <EventGridBlockClient events={cards} slug={slug} columns={columns} variant="cardnews" />
        </div>
      </DataSection>
    );
  }

  if (events.length === 0) {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold sm:text-3xl" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-sm text-gray-400">등록된 행사가 없습니다.</p>
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
