import Link from 'next/link';
import { getEvent } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

interface FeaturedEventBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** Format an event date to Korean "11월 27일(목)". Returns '' if unparseable. */
function formatKoreanDate(raw: unknown): string {
  if (!raw) return '';
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

/**
 * 다가오는 행사 (featured_event) — Data Block.
 *
 * The operator PICKS one event (props.eventId) from the events content module
 * and it renders as a top announcement bar. Renders NOTHING (null) when:
 *   - no event is picked (props.eventId empty),
 *   - the picked event no longer exists / isn't published, or
 *   - the auto-hide date (props.endDate) has passed.
 * This is by design (대표님): "pick 안 하면 아예 안 보이게, ending 날짜 지나면 숨김".
 */
export async function FeaturedEventBlock({ props, slug }: FeaturedEventBlockProps) {
  const eventId = (props.eventId as string) || '';
  if (!eventId) return null;

  // Auto-hide once the end date has passed (day granularity, UTC).
  const endDate = (props.endDate as string) || '';
  if (endDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > endDate) return null;
  }

  let event: any = null;
  try {
    event = await getEvent(slug, eventId);
  } catch {
    event = null;
  }
  // Gone, or a draft — don't surface publicly.
  if (!event || (event.status && event.status !== 'published')) return null;

  const label = (props.label as string) || '다가오는 행사';
  const buttonText = (props.buttonText as string) || '자세히 보기';
  const buttonUrl = (props.buttonUrl as string) || (event.linkUrl as string) || `/events/${event.id}`;

  const dateStr = formatKoreanDate(event.eventDate);
  const metaParts = [dateStr, event.location as string].filter(Boolean);

  return (
    <DataSection props={props} paddingClassName="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 rounded-2xl bg-[#111827] px-5 py-5 text-white sm:flex-row sm:items-center sm:px-7">
          <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
            {label}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold font-heading sm:text-lg" style={getElementStyle(props, 'title')}>
              {event.title}
            </h3>
            {metaParts.length > 0 && (
              <p className="mt-0.5 truncate text-sm text-white/60">{metaParts.join(' · ')}</p>
            )}
          </div>
          <Link
            href={buttonUrl}
            className="inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </DataSection>
  );
}
