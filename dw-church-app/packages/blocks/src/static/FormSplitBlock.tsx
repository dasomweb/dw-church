/**
 * FormSplitBlock (admin-canvas preview) — sync mirror of the storefront
 * form_split block (apps/web). Left: tenant application-form placeholder
 * (the live form is fetched on the storefront). Right: title / subtitle /
 * content via HeadingElement / TextBodyElement so per-element inspector
 * styling works. All copy English (US target). 대표님 2026-05-29.
 */
import { HeadingElement, TextBodyElement } from '../elements';

interface FormSplitBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

function FormPlaceholder({ formSlug }: { formSlug: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-3">
        {formSlug ? `Form · ${formSlug}` : 'Application form (select in inspector)'}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 rounded bg-gray-200 mb-1.5" />
            <div className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-lg bg-gray-300" />
      </div>
    </div>
  );
}

export function FormSplitBlock({ props }: FormSplitBlockProps) {
  const formSlug = (props.formSlug as string) || '';
  const layout = (props.layout as string) === 'form-right' ? 'form-right' : 'form-left';
  // 미리보기에선 빈 값일 때 구조가 보이도록 영어 sample 폴백.
  const title = (props.title as string) || 'Section title';
  const subtitle = (props.subtitle as string) || 'Supporting subtitle goes here.';
  const content = (props.content as string) || '';

  const formNode = <FormPlaceholder formSlug={formSlug} />;
  const textNode = (
    <div className="flex flex-col">
      <HeadingElement
        text={title}
        props={props}
        elementKey="title"
        defaultTag="h2"
        defaultSize="h2"
        className="text-2xl sm:text-3xl font-bold"
      />
      <TextBodyElement
        text={subtitle}
        props={props}
        elementKey="subtitle"
        defaultTag="p"
        defaultSize="h5"
        className="mt-3 text-gray-600"
      />
      <TextBodyElement
        text={content || 'Body content goes here. Use the inspector to edit and style this text.'}
        props={props}
        elementKey="content"
        defaultTag="div"
        defaultSize="body"
        className="mt-4 text-gray-700"
      />
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {layout === 'form-right' ? (
          <>
            {textNode}
            <div>{formNode}</div>
          </>
        ) : (
          <>
            <div>{formNode}</div>
            {textNode}
          </>
        )}
      </div>
    </section>
  );
}
