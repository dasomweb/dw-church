import { SectionShell } from '../utilities/SectionShell';

/**
 * image_link_list — 사진 + 번호 매긴 항목 링크 목록 + 더보기.
 *
 * 교회소개의 '목회 비전' 요약처럼 **대표 사진 옆에 핵심 항목을 순서대로 세우고
 * 각 항목이 상세로 이어지는** 구성. 비전·사역·프로그램 안내 등에 두루 쓴다.
 * items = [{ title, href }], 번호(01, 02 …)는 자동으로 매긴다.
 */
interface ImageLinkListBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function ImageLinkListBlock({ props }: ImageLinkListBlockProps) {
  const p = (props ?? {}) as Record<string, unknown>;
  const eyebrow = String(p.eyebrow ?? '');
  const imageUrl = String(p.imageUrl ?? '');
  const imageLeft = String(p.imagePosition ?? 'left') !== 'right';
  const moreLabel = String(p.moreLabel ?? '');
  const moreHref = String(p.moreHref ?? '');
  const rawItems = Array.isArray(p.items) ? (p.items as Record<string, unknown>[]) : [];
  const items = rawItems
    .map((it) => ({ title: String(it?.title ?? '').trim(), href: String(it?.href ?? '').trim() }))
    .filter((it) => it.title);

  const TEXT = 'var(--dw-text, #3a3129)';
  const PRIMARY = 'var(--dw-primary, #7b7d5c)';
  const FAINT_LINE = 'var(--border, #ece2d6)';
  const NUM = '#a89684';
  const IMG_BG = 'var(--dw-surface, #f2ece3)';
  const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

  if (items.length === 0 && !imageUrl) return null;

  const media = (
    <div style={{ flex: '1 1 420px', minWidth: 0 }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: IMG_BG, overflow: 'hidden' }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={eyebrow || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    </div>
  );

  const list = (
    <div style={{ flex: '1 1 320px', minWidth: 0 }}>
      {eyebrow && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>{eyebrow}</p>}
      <div style={{ marginTop: 18, display: 'grid', gap: 0 }}>
        {items.map((it, i) => {
          const row = (
            <>
              <span style={{ ...SERIF, flex: '0 0 28px', fontSize: 13, letterSpacing: '.1em', color: NUM }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ ...SERIF, minWidth: 0, fontSize: 'clamp(17px,1.9vw,20px)', fontWeight: 600, lineHeight: 1.5 }}>{it.title}</span>
            </>
          );
          const style = {
            display: 'flex', gap: 16, alignItems: 'baseline',
            borderTop: `1px solid ${FAINT_LINE}`, padding: '14px 0',
            color: TEXT, textDecoration: 'none',
          } as const;
          return it.href
            ? <a key={i} href={it.href} style={style}>{row}</a>
            : <div key={i} style={style}>{row}</div>;
        })}
        <div style={{ borderTop: `1px solid ${FAINT_LINE}` }} />
      </div>
      {moreLabel && moreHref && (
        <p style={{ margin: '16px 0 0', fontSize: 14, fontWeight: 600 }}>
          <a href={moreHref} style={{ color: PRIMARY, textDecoration: 'none' }}>{moreLabel} ›</a>
        </p>
      )}
    </div>
  );

  return (
    <SectionShell
      props={props}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
        {imageLeft ? <>{media}{list}</> : <>{list}{media}</>}
      </div>
    </SectionShell>
  );
}
