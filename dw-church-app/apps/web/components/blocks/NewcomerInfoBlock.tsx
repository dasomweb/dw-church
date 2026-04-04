interface NewcomerInfoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function NewcomerInfoBlock({ props }: NewcomerInfoBlockProps) {
  const title = (props.title as string) ?? '처음 오신 분들을 환영합니다';
  const content = (props.content as string) ?? '';

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-4xl text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ backgroundColor: 'var(--dw-primary)', color: 'white' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
          </svg>
        </div>
        <h2 className="mb-4 text-3xl font-bold font-heading">{title}</h2>
        {content && (
          <div
            className="prose prose-lg mx-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </section>
  );
}
