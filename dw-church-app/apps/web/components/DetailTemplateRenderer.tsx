// DetailTemplateRenderer — renders a content-detail template (a page the
// operator designed in the builder and marked as kind=*_detail) for one
// specific item. Each section's props are resolved against the current item
// so DynamicSource bindings (e.g. "현재 항목 · 제목") become the item's
// actual title / content / image / date.
//
// Used by the sermon / column / bulletin detail routes when a template
// exists; otherwise those routes fall back to their built-in fixed layout.
import { BlockRenderer } from './BlockRenderer';
import { resolveDynamicProps } from '@/lib/dynamic';

interface TemplateSection {
  id: string;
  blockType: string;
  props: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
}

interface Props {
  sections: TemplateSection[];
  slug: string;
  /** The current item (sermon / column / bulletin). */
  item: unknown;
  /** Dynamic context key the template binds against — all church detail
   *  kinds use 'post'. */
  context?: string;
}

export function DetailTemplateRenderer({ sections, slug, item, context = 'post' }: Props) {
  const contexts = { [context]: item };
  return (
    <div>
      {sections.map((s) => (
        <BlockRenderer
          key={s.id}
          section={{ ...s, props: resolveDynamicProps(s.props, contexts) }}
          slug={slug}
        />
      ))}
    </div>
  );
}
