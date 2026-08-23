import { SectionShell } from '../utilities/SectionShell';

interface DashboardBannerBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * dashboard_banner — 회원 대시보드형 환영 배너 (프론트 샘플 15).
 * 브랜드 컬러 라운드 카드: 좌측에 날짜(eyebrow) + 큰 제목 + 안내 문구,
 * 우측에 흰색/아웃라인 pill 버튼 2개. "이번 주 예배 안내" 같은 상단 요약 배너.
 * 색상은 테마 토큰(--dw-primary)에서 오므로 어떤 테마에서도 브랜드색으로 렌더.
 */
export function DashboardBannerBlock({ props }: DashboardBannerBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || (props.description as string) || '';
  const btnText = (props.buttonText as string) || '';
  const btnUrl = (props.buttonUrl as string) || '#';
  const btn2Text = (props.secondaryButtonText as string) || '';
  const btn2Url = (props.secondaryButtonUrl as string) || '#';
  if (!title && !eyebrow && !subtitle) return null;

  return (
    <SectionShell props={props} applyLayout style={{ paddingBlock: 'var(--section-py-sm)' }}>
      <div
        style={{
          background: 'var(--dw-primary, var(--brand, #1466d6))',
          color: '#fff',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', marginBottom: 8 }}>{eyebrow}</div>
          )}
          {title && (
            <div className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, lineHeight: 1.25 }}>{title}</div>
          )}
          {subtitle && (
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,.85)' }}>{subtitle}</div>
          )}
        </div>
        {(btnText || btn2Text) && (
          <div style={{ display: 'flex', gap: 10, flex: 'none', flexWrap: 'wrap' }}>
            {btnText && (
              <a
                href={btnUrl}
                style={{
                  display: 'inline-flex', alignItems: 'center', height: 46, padding: '0 22px',
                  borderRadius: 999, background: '#fff', color: 'var(--dw-primary, var(--brand, #1466d6))',
                  fontSize: 15, fontWeight: 600, textDecoration: 'none',
                }}
              >{btnText}</a>
            )}
            {btn2Text && (
              <a
                href={btn2Url}
                style={{
                  display: 'inline-flex', alignItems: 'center', height: 46, padding: '0 22px',
                  borderRadius: 999, border: '1px solid rgba(255,255,255,.5)', color: '#fff',
                  fontSize: 15, fontWeight: 600, textDecoration: 'none',
                }}
              >{btn2Text}</a>
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
