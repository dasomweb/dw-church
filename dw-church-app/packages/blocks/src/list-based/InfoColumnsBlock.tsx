import { SectionShell } from '../utilities/SectionShell';

interface InfoColumnsBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * info_columns — 2~4-up 정보 그리드 (예배시간 / 오시는 길 / 처음 오시는 분 같은
 * "한눈에 보는" 셀). 각 셀 = 작은 라벨(title) + 값(content, 여러 줄 가능).
 * 헤어라인 구분선 그리드. 프론트 샘플 다수(00,01,05,06,07,11,14,16,17,20 등)에서
 * 반복되는 패턴이라 별도 블록으로 신설. 색/배경은 테마 토큰(--brand/--fg/--bg/
 * --border)을 읽어 라이트·다크 테마 모두에서 자연스럽게 렌더된다.
 */
export function InfoColumnsBlock({ props }: InfoColumnsBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) return null;

  const cols = Math.min(Math.max(Number(props.columns) || items.length || 3, 1), 4);
  // static class names so Tailwind's content scan can't purge them
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 4 ? 'sm:grid-cols-4' : cols === 1 ? 'sm:grid-cols-1' : 'sm:grid-cols-3';

  return (
    <SectionShell props={props} style={{ paddingBlock: 'var(--section-py-lg)' }} applyLayout>
      {(eyebrow || title) && (
        <div className="mb-6 text-center">
          {eyebrow && <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--dw-primary, var(--brand, #1466d6))' }}>{eyebrow}</div>}
          {title && <h2 className="text-2xl font-bold" style={{ color: 'var(--dw-text, var(--fg, #16181d))' }}>{title}</h2>}
        </div>
      )}
      <div
        className={`grid grid-cols-1 ${colClass}`}
        style={{ gap: '1px', background: 'var(--dw-border, var(--border, #e5e7eb))', border: '1px solid var(--dw-border, var(--border, #e5e7eb))', borderRadius: 'var(--radius-lg, 16px)', overflow: 'hidden' }}
      >
        {items.map((it, i) => (
          <div key={i} style={{ background: 'var(--dw-background, var(--bg, #ffffff))', padding: '26px 28px' }}>
            {it.title ? (
              <div style={{ color: 'var(--dw-primary, var(--brand, #1466d6))', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{String(it.title)}</div>
            ) : null}
            {it.content ? (
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--dw-text, var(--fg, #16181d))', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{String(it.content)}</div>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
