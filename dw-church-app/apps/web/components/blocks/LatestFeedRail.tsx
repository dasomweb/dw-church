import Link from 'next/link';
import { koText } from '@dw-church/blocks';

/**
 * 통합 피드의 **사이드 레일** (variant `rail-left` / `rail-right`).
 *
 * 본문 카드 옆에 붙는 좁은 안내 칼럼 — 이번 주 안내 / 기도제목 / 바로가기 줄.
 * 데이터는 서버(LatestFeedBlock)가 모아서 넘기고, 여기서는 그리기만 한다.
 *
 * 레일이 노리는 것은 **주마다 손이 가지 않는 안내 칼럼**이다. 바로가기 줄의
 * 오른쪽 값(날짜)은 각 Content Module 의 최신 글에서 자동으로 채워 넘어온다.
 */

const INK = 'var(--dw-text, #1a1a1a)';
const MUTED = 'var(--brand-muted, #8a857b)';
const RULE = 'var(--border, #e8e4dc)';

/** `2026-11-01` → `11. 1.` — 레일 값은 연도를 빼고 짧게 읽는다. */
export function shortDate(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  return `${Number(m[2])}. ${Number(m[3])}.`;
}

/** 바로가기 한 줄 — 왼쪽 이름 + 오른쪽 값(최신 글 날짜 또는 '›'). */
export interface RailRow {
  id: string;
  label: string;
  value: string;
  href?: string;
}

interface Props {
  /** 첫 덩어리 라벨 (예: THIS WEEK) */
  title: string;
  /** 첫 덩어리 본문 줄 */
  lines: string[];
  prayerTitle: string;
  prayerItems: string[];
  rows: RailRow[];
}

/**
 * 덩어리 라벨. 넓은 자간은 **라틴 대문자 기법**이라 한글 라벨(기도제목)에 주면
 * 음절이 흩어진다 — 아스키 라벨(THIS WEEK)에만 준다.
 */
function labelStyle(text: string) {
  const latin = /^[\x20-\x7F]+$/.test(text);
  return {
    margin: 0,
    ...koText('eyebrow', { fontWeight: 700, ...(latin ? { letterSpacing: '0.18em' } : {}) }),
    color: MUTED,
  };
}

export function LatestFeedRail({ title, lines, prayerTitle, prayerItems, rows }: Props) {
  const hasNote = !!title && lines.length > 0;
  const hasPrayer = prayerItems.length > 0;
  if (!hasNote && !hasPrayer && rows.length === 0) return null;

  return (
    <aside
      className="lg:sticky lg:top-[88px] lg:w-[220px] lg:shrink-0"
      style={{ display: 'grid', gap: 36, alignContent: 'start' }}
    >
      {hasNote && (
        <div>
          <p style={labelStyle(title)}>{title}</p>
          {lines.map((line, i) => (
            <p
              key={line}
              style={{ margin: i === 0 ? '12px 0 0' : '2px 0 0', ...koText('meta'), color: INK, opacity: 0.72 }}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {hasPrayer && (
        <div>
          <p style={labelStyle(prayerTitle)}>{prayerTitle}</p>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {prayerItems.map((item) => (
              <li key={item} style={{ ...koText('meta'), color: INK }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'grid' }}>
          {rows.map((row, i) => {
            // 마지막 줄만 아래 괘선까지 — 목록이 허공에서 끝나지 않게(시안).
            const last = i === rows.length - 1;
            const style = {
              display: 'flex', justifyContent: 'space-between', gap: 12,
              borderTop: `1px solid ${RULE}`,
              ...(last ? { borderBottom: `1px solid ${RULE}`, padding: '10px 0' } : { paddingTop: 10 }),
              ...koText('meta'), color: INK, textDecoration: 'none',
            } as const;
            const inner = (
              <>
                <span style={{ minWidth: 0 }}>{row.label}</span>
                <span style={{ color: MUTED, flexShrink: 0 }}>{row.value}</span>
              </>
            );
            // 아직 등록된 글이 없는 모듈은 링크를 걸지 않는다 — 눌러도 아무 일이
            // 없는 줄보다 안 눌리는 줄이 낫다(피드 카드와 같은 규칙).
            return row.href
              ? <Link key={row.id} href={row.href} style={style}>{inner}</Link>
              : <div key={row.id} style={style}>{inner}</div>;
          })}
        </div>
      )}
    </aside>
  );
}
