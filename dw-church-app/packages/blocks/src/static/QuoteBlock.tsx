import { HeadingElement, TextBodyElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface QuoteBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * Pull-quote block — display quote + optional source + reference, with
 * SectionShell owning background image / overlay / border / width /
 * contentWidth / height / textAlign uniformly with every other section.
 *
 * 2026-05-29: hand-roll <section> + manual SectionBackground 제거. 이전엔
 * bg image 있을 때 hardcoded `#000000` opacity 55 scrim 이 강제됐는데,
 * 이건 feedback-no-hardcoded-defaults 위반 — 운영자/AI 가 overlay* props
 * 로 직접 설정해야 함. 또한 hand-roll `max-w-3xl` 도 변형 identity 라는
 * 명목으로 박혀 있어 인스펙터의 contentWidth 토글이 무시되던 상태.
 * 인용 텍스트의 좁은 폭이 필요하면 elementStyles.quote.maxWidth 로 per-
 * element 조정.
 *
 * Phase-2 element-composition refactor: quote / source / reference 모두
 * TextBodyElement / HeadingElement 로 렌더 → 운영자 elementStyles /
 * elementTags / brand-token CSS 변수가 typography 결정 owner.
 */
export function QuoteBlock({ props }: QuoteBlockProps) {
  const quote = (props.quote as string) ?? '';
  const source = (props.source as string) ?? '';
  const reference = (props.reference as string) ?? '';

  if (!quote) return null;

  return (
    <SectionShell
      props={props}
      style={{ paddingBlock: 'var(--section-py-lg)' }}
      applyLayout
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--block-gap, 1.25rem)',
        }}
      >
        <svg className="h-10 w-10 opacity-60" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
        <TextBodyElement
          text={quote}
          props={props}
          elementKey="quote"
          defaultTag="p"
          defaultSize="h3"
          html
          className="leading-relaxed text-center"
        />
        {(source || reference) && (
          <footer className="opacity-80 text-center">
            {source && (
              <HeadingElement
                text={source}
                props={props}
                elementKey="source"
                defaultTag="span"
                defaultSize="label"
                className="font-semibold"
              />
            )}
            {source && reference && <span className="mx-2">·</span>}
            {reference && (
              <TextBodyElement
                text={reference}
                props={props}
                elementKey="reference"
                defaultTag="span"
                defaultSize="caption"
              />
            )}
          </footer>
        )}
      </div>
    </SectionShell>
  );
}
