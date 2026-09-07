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
    <div className="relative px-4 sm:px-6 lg:px-14" style={{ background: `linear-gradient(180deg, ${C.surface} 0%, ${C.surface} 62%, ${C.bg} 62%)` }}>
      <div className="relative pt-8 lg:pt-11">
        <div className="relative h-[320px] sm:h-[400px] lg:h-[470px] overflow-hidden" style={{ borderRadius: C.radius }}>
          {bg && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(9,15,28,.62) 0%,rgba(9,15,28,.25) 55%,rgba(9,15,28,0) 100%)', pointerEvents: 'none' }} />
          <div className="absolute left-4 right-4 top-8 sm:left-8 sm:right-8 sm:top-16 lg:left-[52px] lg:right-auto lg:top-24 max-w-[520px]" style={{ pointerEvents: 'none' }}>
            {eyebrow && <div className="text-sm mb-3 sm:mb-[18px]" style={{ fontWeight: 600, letterSpacing: '.08em', color: '#cfe0fb' }}>{eyebrow}</div>}
            {title && <h1 className="text-[32px] sm:text-[42px] lg:text-[52px] mb-4 lg:mb-5" style={{ marginTop: 0, fontWeight: 700, color: '#fff', lineHeight: 1.28, whiteSpace: 'pre-line' }}>{title}</h1>}
            {subtitle && <p className="text-[15px] sm:text-base lg:text-[18px]" style={{ margin: 0, lineHeight: 1.7, color: 'rgba(255,255,255,.86)' }}>{subtitle}</p>}
          </div>
        </div>
        {cards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.25fr] relative -mt-8 mx-4 sm:-mt-12 sm:mx-8 lg:-mt-16 lg:mx-10" style={{ gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,25,45,.13)' }}>
            {cards.map((card, i) => (
              <div key={i} className="px-5 py-5 sm:px-[30px] sm:py-[26px]" style={{ background: C.bg }}>
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
