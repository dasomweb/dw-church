import { SectionShell } from '../utilities/SectionShell';

interface QuickLinksBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * quick_links — 사이드 "바로가기" 카드: 제목 + 화살표 링크 목록
 * (기도 요청 →, 소그룹 신청 →, 온라인 헌금 → 등). 프론트 샘플 04/05/11/12/20의
 * 우측 위젯 패턴. 각 항목 = 라벨(title) + 링크(content=URL).
 */
export function QuickLinksBlock({ props }: QuickLinksBlockProps) {
  const title = (props.title as string) ?? '';
  const variant = (props.variant as string) || 'card';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (!title && items.length === 0) return null;

  // tiles — 6-열(모바일 2~3열) 아이콘+라벨 바로가기 그리드 (프론트 샘플 15 상단
  // "빠른 작업" 위젯). 각 항목 icon(이모지) + title(라벨) + content(URL).
  if (variant === 'tiles') {
    return (
      <SectionShell props={props} style={{ paddingBlock: 'var(--section-py-sm)' }} applyLayout>
        {title && <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--dw-text, var(--fg, #16181d))', marginBottom: 12 }}>{title}</div>}
        <div
          style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}
          className="dw-quicktiles"
        >
          {items.map((it, i) => (
            <a
              key={i}
              href={String(it.content || '#')}
              style={{
                border: '1px solid var(--dw-border, var(--border, #e5e7eb))',
                borderRadius: 'var(--radius, 12px)', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
                color: 'var(--dw-text, var(--fg, #16181d))', textDecoration: 'none',
                background: 'var(--dw-background, var(--bg, #fff))',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-sm, 8px)',
                  background: 'color-mix(in srgb, var(--dw-primary, var(--brand, #1466d6)) 12%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}
              >{String(it.icon || '🔗')}</span>
              <b style={{ fontSize: 15, fontWeight: 600 }}>{String(it.title || '')}</b>
            </a>
          ))}
        </div>
        {/* 데스크톱 6열 / 태블릿 3열 — CSS media (인라인 style 로는 표현 불가). */}
        <style>{`@media(min-width:640px){.dw-quicktiles{grid-template-columns:repeat(3,1fr)!important}}@media(min-width:1024px){.dw-quicktiles{grid-template-columns:repeat(6,1fr)!important}}`}</style>
      </SectionShell>
    );
  }

  return (
    <SectionShell props={props} style={{ paddingBlock: 'var(--section-py-md)' }} applyLayout>
      <div style={{ border: '1px solid var(--dw-border, var(--border, #e5e7eb))', borderRadius: 'var(--radius-lg, 16px)', padding: '22px 24px' }}>
        {title && <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--dw-text, var(--fg, #16181d))', marginBottom: 12 }}>{title}</div>}
        <div className="flex flex-col">
          {items.map((it, i) => (
            <a
              key={i}
              href={String(it.content || '#')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid var(--dw-border, var(--border, #e5e7eb))',
                color: 'var(--dw-text, var(--fg, #16181d))', textDecoration: 'none', fontSize: 15, fontWeight: 500,
              }}
            >
              <span>{String(it.title || '')}</span>
              <span style={{ color: 'var(--dw-primary, var(--brand, #1466d6))', flex: 'none', marginLeft: 12 }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
