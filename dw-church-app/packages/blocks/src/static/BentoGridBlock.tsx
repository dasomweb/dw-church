/**
 * bento_grid — 시안 13(매거진 타일)의 시그니처. 6칸 그리드에 사진/브랜드카드/
 * 설교/리스트/텍스트카드가 서로 다른 span 으로 배치되는 매거진형 레이아웃.
 * card-13.html 치수(6col, auto-rows 132px, gap 16) 그대로. 모바일에서는 1칸
 * 스택으로 자동 전환. 색은 테마 토큰 매핑.
 *
 * tiles[]: { colSpan, rowSpan, kind, ... }
 *   kind 'photo' : imageUrl + (title/subtitle 하단 오버레이) + eyebrow?
 *   kind 'card'  : bg('brand'|'surface'|'outline') + eyebrow?/title/text?
 *   kind 'list'  : outline 카드 + title/moreLabel + items[{label,date}]
 *   kind 'pair'  : outline 카드 2개(각 title/text)
 */
const C = {
  brand: 'var(--dw-primary, var(--brand, #1466d6))',
  fg: 'var(--dw-text, var(--fg, #16181d))',
  muted: 'var(--fg-muted, #61697a)',
  surface: 'var(--dw-surface, var(--surface, #f7f8fa))',
  border: 'var(--dw-border, var(--border, #e5e7eb))',
  radiusLg: 'var(--radius-lg, 16px)',
};

interface Tile {
  colSpan?: number; rowSpan?: number; kind?: string;
  imageUrl?: string; eyebrow?: string; title?: string; subtitle?: string; text?: string;
  bg?: string; moreLabel?: string;
  items?: { label?: string; date?: string }[];
  cards?: { title?: string; text?: string }[];
}
interface Props { props: Record<string, unknown>; slug?: string }

function TileView({ t }: { t: Tile }) {
  const span = { gridColumn: `span ${t.colSpan ?? 2}`, gridRow: `span ${t.rowSpan ?? 1}` } as const;
  if (t.kind === 'photo') {
    return (
      <div style={{ ...span, position: 'relative', borderRadius: C.radiusLg, overflow: 'hidden', minHeight: 132 }}>
        {t.imageUrl && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${t.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        {(t.title || t.subtitle || t.eyebrow) && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(9,15,28,.05) 40%,rgba(9,15,28,.72))', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', left: 28, right: 20, bottom: 24, pointerEvents: 'none' }}>
          {t.eyebrow && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 6 }}>{t.eyebrow}</div>}
          {t.title && <div style={{ fontSize: (t.rowSpan ?? 1) >= 3 ? 34 : 19, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{t.title}</div>}
          {t.subtitle && <div style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', marginTop: 8 }}>{t.subtitle}</div>}
        </div>
      </div>
    );
  }
  if (t.kind === 'list') {
    return (
      <div style={{ ...span, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <b style={{ fontSize: 17, color: C.fg }}>{t.title}</b>
          {t.moreLabel && <span style={{ fontSize: 13, color: C.muted }}>{t.moreLabel}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 15 }}>
          {(t.items ?? []).map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: C.fg }}>{it.label}</span>
              <span style={{ color: C.muted, fontSize: 13 }}>{it.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (t.kind === 'pair') {
    return (
      <div style={{ ...span, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {(t.cards ?? []).map((c, i) => (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <b style={{ fontSize: 17, color: C.fg, marginBottom: 6 }}>{c.title}</b>
            <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{c.text}</span>
          </div>
        ))}
      </div>
    );
  }
  // 'card'
  const isBrand = t.bg === 'brand';
  const bg = isBrand ? C.brand : t.bg === 'surface' ? C.surface : 'transparent';
  const border = t.bg === 'outline' || !t.bg ? `1px solid ${C.border}` : 'none';
  return (
    <div style={{ ...span, background: bg, border, borderRadius: C.radiusLg, padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: isBrand ? '#fff' : C.fg }}>
      {t.eyebrow && <div style={{ fontSize: 13, color: isBrand ? 'rgba(255,255,255,.75)' : C.muted, marginBottom: 6 }}>{t.eyebrow}</div>}
      {t.title && <div style={{ fontSize: t.subtitle && !t.text ? 24 : 17, fontWeight: 700, marginBottom: t.text ? 8 : 4 }}>{t.title}</div>}
      {t.subtitle && <div style={{ fontSize: 15, color: isBrand ? 'rgba(255,255,255,.85)' : C.muted }}>{t.subtitle}</div>}
      {t.text && <span style={{ fontSize: 14, color: isBrand ? 'rgba(255,255,255,.85)' : C.muted, lineHeight: 1.7 }}>{t.text}</span>}
    </div>
  );
}

export function BentoGridBlock({ props }: Props) {
  const tiles = Array.isArray(props.tiles) ? (props.tiles as Tile[]) : [];
  const cols = Number(props.columns) || 6;
  if (tiles.length === 0) return null;
  return (
    <div style={{ padding: 32 }}>
      <style dangerouslySetInnerHTML={{ __html: `
.dw-bento{display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:132px;gap:16px}
@media (max-width:768px){.dw-bento{grid-template-columns:1fr;grid-auto-rows:auto}.dw-bento>*{grid-column:1 / -1 !important;grid-row:auto !important;min-height:150px}}
` }} />
      <div className="dw-bento">
        {tiles.map((t, i) => <TileView key={i} t={t} />)}
      </div>
    </div>
  );
}
