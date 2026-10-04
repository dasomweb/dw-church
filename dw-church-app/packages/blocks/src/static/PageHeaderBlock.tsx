import { SectionShell } from '../utilities/SectionShell';

/**
 * page_header — 서브페이지 머리글. 라벨(윗글) + 큰 제목 + 소개 문구 + 하단 더블 괘선.
 *
 * 교회소개·예배안내·말씀·저널 등 **모든 서브페이지가 공통으로 쓰는** 머리글이라
 * 페이지마다 따로 만들지 않고 이 블록 하나를 재사용한다.
 * 색/폰트는 테마 토큰(--dw-*)을 따르므로 교회마다 자동으로 맞춰진다.
 */
interface PageHeaderBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function PageHeaderBlock({ props }: PageHeaderBlockProps) {
  const p = (props ?? {}) as Record<string, unknown>;
  const eyebrow = String(p.eyebrow ?? '');
  const title = String(p.title ?? '');
  const description = String(p.description ?? '');
  // breadcrumb: "교회소개 · 담임목사" 처럼 상위 페이지를 함께 보여줄 때.
  const parentLabel = String(p.parentLabel ?? '');
  const parentHref = String(p.parentHref ?? '');

  const TEXT = 'var(--dw-text, #3a3129)';
  const SECONDARY = 'var(--dw-secondary, #5e6044)';
  const MUTED = 'var(--brand-muted, #6f6255)';
  const FAINT = '#a89684';
  const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

  if (!title && !eyebrow) return null;

  return (
    <SectionShell
      props={props}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div style={{ borderBottom: `3px double ${TEXT}`, paddingBottom: 22 }}>
        {(eyebrow || parentLabel) && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: SECONDARY }}>
            {parentLabel ? (
              <>
                {parentHref
                  ? <a href={parentHref} style={{ color: FAINT, textDecoration: 'none' }}>{parentLabel}</a>
                  : <span style={{ color: FAINT }}>{parentLabel}</span>}
                {eyebrow ? ` · ${eyebrow}` : ''}
              </>
            ) : eyebrow}
          </p>
        )}
        {title && (
          <h1 style={{ ...SERIF, margin: '16px 0 0', fontSize: 'clamp(30px,4.4vw,52px)', fontWeight: 600, letterSpacing: '-0.02em', color: TEXT }}>{title}</h1>
        )}
        {description && (
          <p style={{ margin: '16px 0 0', maxWidth: '28em', fontSize: 17, lineHeight: 1.75, color: MUTED }}>{description}</p>
        )}
      </div>
    </SectionShell>
  );
}
