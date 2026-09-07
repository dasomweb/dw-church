import { SectionShell } from '../utilities/SectionShell';

interface InfoColumnsBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface InfoRow { label?: string; value?: string }
interface InfoItem { title?: string; variant?: string; rows?: InfoRow[]; content?: string }

/**
 * info_columns — 2~4-up 정보 그리드 (예배시간 / 오시는 길 / 처음 오시는 분 같은
 * "한눈에 보는" 셀). 헤어라인 구분선 그리드. 시안 card-00 구조:
 *   - 각 셀 = 작은 라벨(title, brand) + 행(rows[{label,value}])
 *   - variant 'split'(기본): 라벨 왼쪽 / 값 오른쪽(space-between, 값 볼드) — 예배 시간표
 *   - variant 'list': 고정폭 라벨 + 설명(muted) — 처음 오시는 분께
 * rows 가 없으면 content(여러 줄 텍스트) 폴백(구버전 프리셋 호환).
 * 색/배경은 테마 토큰(--dw-* / --brand/--fg/--bg/--border)을 읽는다.
 */
export function InfoColumnsBlock({ props }: InfoColumnsBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as InfoItem[];
  if (items.length === 0) return null;

  const cols = Math.min(Math.max(Number(props.columns) || items.length || 3, 1), 4);
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 4 ? 'sm:grid-cols-4' : cols === 1 ? 'sm:grid-cols-1' : 'sm:grid-cols-3';

  const muted = 'var(--dw-muted, var(--fg-muted, #61697a))';
  const fg = 'var(--dw-text, var(--fg, #16181d))';
  const brand = 'var(--dw-primary, var(--brand, #1466d6))';

  return (
    <SectionShell props={props} style={{ paddingBlock: '2rem' }} applyLayout>
      {(eyebrow || title) && (
        <div className="mb-6 text-center">
          {eyebrow && <div className="mb-2 text-sm font-semibold" style={{ color: brand }}>{eyebrow}</div>}
          {title && <h2 className="text-2xl font-bold" style={{ color: fg }}>{title}</h2>}
        </div>
      )}
      <div
        className={`grid grid-cols-1 ${colClass}`}
        style={{ gap: '1px', background: 'var(--dw-border, var(--border, #e5e7eb))', border: '1px solid var(--dw-border, var(--border, #e5e7eb))', borderRadius: 'var(--radius-lg, 16px)', overflow: 'hidden' }}
      >
        {items.map((it, i) => {
          const rows = Array.isArray(it.rows) ? it.rows : [];
          const isList = it.variant === 'list';
          return (
            <div key={i} style={{ background: 'var(--dw-background, var(--bg, #ffffff))', padding: '24px 28px' }}>
              {it.title ? (
                <div style={{ color: brand, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{it.title}</div>
              ) : null}
              {rows.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isList ? 9 : 6, fontSize: isList ? 15 : 16, lineHeight: isList ? 1.5 : undefined, color: fg }}>
                  {rows.map((r, k) => (
                    isList ? (
                      <div key={k} style={{ display: 'flex', gap: 12 }}>
                        <b style={{ width: 52, flex: 'none', fontWeight: 600 }}>{r.label}</b>
                        <span style={{ color: muted }}>{r.value}</span>
                      </div>
                    ) : (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>{r.label}</span>
                        <b style={{ fontWeight: 600 }}>{r.value}</b>
                      </div>
                    )
                  ))}
                </div>
              ) : it.content ? (
                <div style={{ fontSize: 16, color: fg, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{String(it.content)}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
