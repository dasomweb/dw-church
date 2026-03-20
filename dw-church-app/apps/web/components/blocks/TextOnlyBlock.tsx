interface TextOnlyBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function TextOnlyBlock({ props }: TextOnlyBlockProps) {
  const title = (props.title as string) ?? '';
  const content = (props.content as string) ?? '';

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        {title && (
          <h2 className="mb-6 text-center text-3xl font-bold font-heading">{title}</h2>
        )}
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
