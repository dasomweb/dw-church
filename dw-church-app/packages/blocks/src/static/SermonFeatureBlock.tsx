/**
 * sermon_feature — "이번 주 말씀" 섹션 (설교 영상 중심).
 * 좌측 큰 영상 카드(사진 + 재생버튼 + 하단 오버레이 제목/메타) + 우측 최근
 * 설교 목록(썸네일 + 제목 + 날짜) + 하단 링크 버튼. 색은 테마 토큰 매핑.
 *
 * 대표님 2026-09-06 (Claude Design "Church Homepage" 반영):
 *  - 설교 영상이 "커지면서" 디자인 변경 → 피처 영상을 고정 height 330px 에서
 *    aspect-ratio 16/9 (정식 영상 비율, 더 큼)로 교체.
 *  - 모바일 디자인 적용 → 인라인 고정 px(padding 80/56, grid 1.5fr 1fr) 를
 *    Tailwind 반응형으로 전환: 모바일은 1열로 쌓이고 영상은 전체폭 16:9,
 *    최근 설교는 그 아래로. 색/사진/props 는 그대로.
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
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-14 lg:pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 sm:mb-7">
        <div>
          {eyebrow && <div style={{ color: C.brand }} className="mb-1.5 text-[13px] font-semibold">{eyebrow}</div>}
          {title && <h2 style={{ color: C.fg }} className="m-0 text-2xl font-bold sm:text-[32px]">{title}</h2>}
        </div>
        {moreLabel && <span style={{ color: C.muted }} className="text-sm sm:text-[15px]">{moreLabel}</span>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
        {/* 피처 영상 — 전체폭 16:9 (고정 330px 에서 확대) */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', borderRadius: C.radiusLg }}>
          {featured.imageUrl && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${featured.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(9,15,28,0) 40%,rgba(9,15,28,.78))', pointerEvents: 'none' }} />
          <div className="absolute left-1/2 top-[46%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl sm:h-16 sm:w-16 sm:text-2xl" style={{ background: 'rgba(255,255,255,.94)', color: C.brand, pointerEvents: 'none' }}>▶</div>
          <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-6" style={{ pointerEvents: 'none' }}>
            {featured.title && <div className="mb-1.5 text-lg font-bold text-white sm:text-[22px]">{featured.title}</div>}
            {featured.meta && <div className="text-[13px] text-white/80 sm:text-sm">{featured.meta}</div>}
          </div>
        </div>

        {/* 최근 설교 목록 */}
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <div key={i} className="flex gap-3.5 p-3.5" style={{ border: `1px solid ${C.border}`, borderRadius: C.radius }}>
              <div className="aspect-video w-24 flex-none overflow-hidden sm:w-[104px]" style={{ borderRadius: C.radiusSm, backgroundImage: it.imageUrl ? `url('${it.imageUrl}')` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', background: it.imageUrl ? undefined : C.border }} />
              <div className="flex flex-col justify-center gap-1">
                <div className="text-[15px] font-semibold sm:text-base" style={{ color: C.fg }}>{it.title}</div>
                {it.meta && <div className="text-[13px]" style={{ color: C.muted }}>{it.meta}</div>}
              </div>
            </div>
          ))}
          {footerLabel && (
            <div className="flex h-[52px] items-center justify-center text-[15px] font-semibold" style={{ border: `1px solid ${C.border}`, borderRadius: C.radius, color: C.brand }}>{footerLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}
