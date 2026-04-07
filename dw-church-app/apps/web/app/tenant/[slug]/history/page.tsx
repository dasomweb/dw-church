import { getHistory, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { HistoryTimelineClient } from './HistoryTimelineClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface HistoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HistoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '연혁');
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { slug } = await params;

  let page;
  try { page = await getPageBySlug(slug, 'history'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const history = await getHistory(slug);

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'history_timeline') {
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <HistoryTimelineClient history={history} />
              </div>
            </section>
          );
        }
        return <BlockRenderer key={section.id} section={section} slug={slug} />;
      })}
    </div>
  );
}
