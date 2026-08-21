/**
 * news_split — 시안 11의 "주보·공지 + 마음을 나눠주세요" 2단 섹션을 그대로 블록화.
 * 좌: 탭 라벨이 붙은 소식 리스트(태그 + 제목 + 날짜). 우: surface 카드
 * (제목 + 안내문 + CTA 버튼 2개 + 화살표 바로가기 목록). card-11.html 그대로.
 */
const C = {
  brand: 'var(--dw-primary, var(--brand, #1466d6))',
  fg: 'var(--dw-text, var(--fg, #16181d))',
  muted: 'var(--fg-muted, #61697a)',
  bg: 'var(--dw-background, var(--bg, #ffffff))',
  surface: 'var(--dw-surface, var(--surface, #f7f8fa))',
  border: 'var(--dw-border, var(--border, #e5e7eb))',
  radius: 'var(--radius, 12px)',
  radiusLg: 'var(--radius-lg, 16px)',
};

interface NewsItem { tag?: string; title?: string; date?: string; primary?: boolean }
interface Btn { label?: string; primary?: boolean }
interface Props { props: Record<string, unknown>; slug?: string }

export function NewsSplitBlock({ props }: Props) {
  const title = (props.title as string) ?? '주보 · 공지';
  const tabs = Array.isArray(props.tabs) ? (props.tabs as string[]) : [];
  const moreLabel = (props.moreLabel as string) ?? '더보기 +';
  const items = Array.isArray(props.items) ? (props.items as NewsItem[]) : [];
  const sideTitle = (props.sideTitle as string) ?? '';
  const sideDesc = (props.sideDesc as string) ?? '';
  const buttons = Array.isArray(props.buttons) ? (props.buttons as Btn[]) : [];
  const links = Array.isArray(props.links) ? (props.links as string[]) : [];

  return (
    <div style={{ padding: '76px 56px 0', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 40 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 14, marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.fg }}>{title}</span>
          {tabs.map((t, i) => <span key={i} style={{ fontSize: 16, color: C.muted }}>{t}</span>)}
          <span style={{ marginLeft: 'auto', fontSize: 14, color: C.muted }}>{moreLabel}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: `1px solid ${C.border}` }}>
              {it.tag && <span style={{ fontSize: 12, fontWeight: 600, color: it.primary ? C.brand : C.muted, background: it.primary ? '#eaf2ff' : C.surface, borderRadius: 999, padding: '4px 10px', flex: 'none' }}>{it.tag}</span>}
              <span style={{ fontSize: 16, flex: 1, color: C.fg }}>{it.title}</span>
              {it.date && <span style={{ fontSize: 14, color: C.muted }}>{it.date}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.surface, borderRadius: C.radiusLg, padding: '28px 30px' }}>
        {sideTitle && <div style={{ fontSize: 20, fontWeight: 700, color: C.fg, marginBottom: 6 }}>{sideTitle}</div>}
        {sideDesc && <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.7, color: C.muted }}>{sideDesc}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {buttons.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: C.radius, fontSize: 15, fontWeight: 600, ...(b.primary ? { background: C.brand, color: '#fff' } : { background: C.bg, border: `1px solid ${C.border}`, color: C.fg }) }}>{b.label}</div>
          ))}
        </div>
        {links.length > 0 && (
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>{l}</span><span style={{ color: C.fg }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
