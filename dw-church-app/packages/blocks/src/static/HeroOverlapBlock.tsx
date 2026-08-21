/**
 * hero_overlap — 시안 11/20의 시그니처 섹션을 그대로 블록화.
 * 상단: 라운드 히어로 사진 + 좌측 그라디언트 위 eyebrow/제목/부제.
 * 하단: 히어로에 -64px 로 겹쳐 올라오는 3칸 안내 카드(주일예배 / 주중예배 /
 * 처음 오시는 분). card-11.html 의 마크업/치수를 그대로 옮기되, 색은 테마
 * 토큰(--dw-* 우선, --brand 폴백)으로 매핑해 라이트/다크 모두 대응.
 */
const C = {
  brand: 'var(--dw-primary, var(--brand, #1466d6))',
  fg: 'var(--dw-text, var(--fg, #16181d))',
  muted: 'var(--fg-muted, #61697a)',
  bg: 'var(--dw-background, var(--bg, #ffffff))',
  surface: 'var(--dw-surface, var(--surface, #f7f8fa))',
  border: 'var(--dw-border, var(--border, #e5e7eb))',
  radius: 'var(--radius-lg, 16px)',
};

interface Row { label?: string; value?: string }
interface Card { title?: string; rows?: Row[] }
interface Props { props: Record<string, unknown>; slug?: string }

export function HeroOverlapBlock({ props }: Props) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const bg = (props.backgroundImageUrl as string) ?? '';
  const cards = Array.isArray(props.cards) ? (props.cards as Card[]) : [];

  return (
    <div style={{ position: 'relative', padding: '0 56px', background: `linear-gradient(180deg, ${C.surface} 0%, ${C.surface} 62%, ${C.bg} 62%)` }}>
      <div style={{ position: 'relative', paddingTop: 44 }}>
        <div style={{ position: 'relative', height: 470, borderRadius: C.radius, overflow: 'hidden' }}>
          {bg && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(9,15,28,.62) 0%,rgba(9,15,28,.25) 55%,rgba(9,15,28,0) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 52, top: 96, maxWidth: 520, pointerEvents: 'none' }}>
            {eyebrow && <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', color: '#cfe0fb', marginBottom: 18 }}>{eyebrow}</div>}
            {title && <h1 style={{ margin: '0 0 20px', fontSize: 52, fontWeight: 700, color: '#fff', lineHeight: 1.28, whiteSpace: 'pre-line' }}>{title}</h1>}
            {subtitle && <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,.86)' }}>{subtitle}</p>}
          </div>
        </div>
        {cards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden', margin: '-64px 40px 0', position: 'relative', boxShadow: '0 18px 40px rgba(15,25,45,.13)' }}>
            {cards.map((card, i) => (
              <div key={i} style={{ background: C.bg, padding: '26px 30px' }}>
                {card.title && <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, marginBottom: 12 }}>{card.title}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.5 }}>
                  {(card.rows ?? []).map((r, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: C.muted }}>{r.label}</span>
                      <b style={{ fontWeight: 600, color: C.fg, textAlign: 'right' }}>{r.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
