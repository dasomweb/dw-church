import { SectionShell } from '../utilities/SectionShell';

interface WeekScheduleBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * week_schedule — "이번 주 교회는 이렇게 모입니다" 아젠다 리스트.
 * 각 행 = 요일/날짜 배지(title) + 모임 내용·시간·장소(content, 한 줄).
 * 첫 행은 브랜드 색으로 강조. schedule_board(표 형태)와 달리 행 리스트 형태로,
 * 주간 일정 중심 시안(04,10,18)과 회원 대시보드(15) 위젯에서 쓰인다.
 */
export function WeekScheduleBlock({ props }: WeekScheduleBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) return null;

  return (
    <SectionShell props={props} style={{ paddingBlock: 'var(--section-py-lg)' }} applyLayout>
      {(eyebrow || title) && (
        <div className="mb-4">
          {eyebrow && <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--brand)' }}>{eyebrow}</div>}
          {title && <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{title}</h2>}
        </div>
      )}
      <div className="flex flex-col">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-4"
            style={{ padding: '16px 4px', borderTop: i === 0 ? 'none' : '1px solid var(--border, #e5e7eb)' }}
          >
            <span style={{ minWidth: 64, flex: 'none', color: 'var(--brand)', fontWeight: 700, fontSize: 15 }}>
              {String(it.title ?? '')}
            </span>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {String(it.content ?? '')}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
