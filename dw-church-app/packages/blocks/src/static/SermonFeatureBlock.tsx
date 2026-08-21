/**
 * sermon_feature — 시안 11의 "이번 주 말씀" 섹션을 그대로 블록화.
 * 좌측 큰 영상 카드(사진 + 재생버튼 + 하단 오버레이 제목/메타) + 우측 최근
 * 설교 목록(썸네일 + 제목 + 날짜) + 하단 링크 버튼. card-11.html 치수 그대로,
 * 색은 테마 토큰 매핑. (정적 디자인 블록 — 동적 recent_sermons 와 별개)
 */
const C = {
  brand: 'var(--dw-primary, var(--brand, #1466d6))',
  fg: 'var(--dw-text, var(--fg, #16181d))',
  muted: 'var(--fg-muted, #61697a)',
  border: 'var(--dw-border, var(--border, #e5e7eb))',
  radius: 'var(--radius, 12px)',
  radiusLg: 'var(--radius-lg, 16px)',
  radiusSm: 'var(--radius-sm, 8px)',
};

interface Item { imageUrl?: string; title?: string; meta?: string }
interface Props { props: Record<string, unknown>; slug?: string }

export function SermonFeatureBlock({ props }: Props) {
  const eyebrow = (props.eyebrow as string) ?? '설교 말씀';
  const title = (props.title as string) ?? '이번 주 말씀';
  const moreLabel = (props.moreLabel as string) ?? '설교 아카이브 전체보기 →';
  const featured = (props.featured as Item) ?? {};
  const items = Array.isArray(props.items) ? (props.items as Item[]) : [];
  const footerLabel = (props.footerLabel as string) ?? '';

  return (
    <div style={{ padding: '80px 56px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          {eyebrow && <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, marginBottom: 8 }}>{eyebrow}</div>}
          {title && <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: C.fg }}>{title}</h2>}
        </div>
        {moreLabel && <span style={{ fontSize: 15, color: C.muted }}>{moreLabel}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        <div style={{ position: 'relative', height: 330, borderRadius: C.radiusLg, overflow: 'hidden' }}>
          {featured.imageUrl && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${featured.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(9,15,28,0) 40%,rgba(9,15,28,.78))', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.brand, pointerEvents: 'none' }}>▶</div>
          <div style={{ position: 'absolute', left: 28, right: 28, bottom: 24, pointerEvents: 'none' }}>
            {featured.title && <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{featured.title}</div>}
            {featured.meta && <div style={{ fontSize: 14, color: 'rgba(255,255,255,.78)' }}>{featured.meta}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: 14, border: `1px solid ${C.border}`, borderRadius: C.radius }}>
              <div style={{ width: 104, height: 66, borderRadius: C.radiusSm, overflow: 'hidden', flex: 'none', backgroundImage: it.imageUrl ? `url('${it.imageUrl}')` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', background: it.imageUrl ? undefined : C.border }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.fg }}>{it.title}</div>
                {it.meta && <div style={{ fontSize: 13, color: C.muted }}>{it.meta}</div>}
              </div>
            </div>
          ))}
          {footerLabel && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, border: `1px solid ${C.border}`, borderRadius: C.radius, fontSize: 15, fontWeight: 600, color: C.brand }}>{footerLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}
