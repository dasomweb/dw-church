import { SectionShell } from '../utilities/SectionShell';

/**
 * highlight_media — 좌측에 "큰 한 줄"(시간·숫자·연도), 우측에 사진 + 설명.
 *
 * 예배안내의 '주일예배 11:00' 처럼 **한 가지 핵심 값을 크게 보여주고 옆에 사진과
 * 설명을 붙이는** 구성. 예배 시간, 창립 연도, 모임 인원 등에 두루 쓴다.
 * 색/폰트는 테마 토큰(--dw-*)을 따른다.
 */
interface HighlightMediaBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function HighlightMediaBlock({ props }: HighlightMediaBlockProps) {
  const p = (props ?? {}) as Record<string, unknown>;
  const eyebrow = String(p.eyebrow ?? '');
  const bigText = String(p.bigText ?? '');
  const subText = String(p.subText ?? '');
  const imageUrl = String(p.imageUrl ?? '');
  const body = String(p.body ?? '');
  const ratio = String(p.imageRatio ?? '16/9').replace('/', ' / ');

  const TEXT = 'var(--dw-text, #3a3129)';
  const PRIMARY = 'var(--dw-primary, #7b7d5c)';
  const MUTED = 'var(--brand-muted, #6f6255)';
  const IMG_BG = 'var(--dw-surface, #f2ece3)';
  const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

  if (!bigText && !imageUrl && !body) return null;

  return (
    <SectionShell
      props={props}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 56px' }}>
        <div style={{ flex: '0 1 260px', minWidth: 0 }}>
          {eyebrow && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>{eyebrow}</p>}
          {bigText && (
            <p style={{ ...SERIF, margin: '14px 0 0', fontSize: 'clamp(40px,6vw,72px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, color: TEXT }}>{bigText}</p>
          )}
          {subText && <p style={{ ...SERIF, margin: '8px 0 0', fontSize: 17, color: MUTED }}>{subText}</p>}
        </div>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          {imageUrl && (
            <div style={{ position: 'relative', width: '100%', aspectRatio: ratio, background: IMG_BG, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={eyebrow || bigText} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {body && (
            <p style={{ ...SERIF, margin: imageUrl ? '22px 0 0' : 0, fontSize: 'clamp(17px,1.9vw,19px)', lineHeight: 1.85, color: TEXT }}>{body}</p>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
