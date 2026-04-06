import { getPageBySlug } from '@/lib/api';
import { HeroBannerBlock } from './blocks/HeroBannerBlock';

interface PageHeroBannerProps {
  tenantSlug: string;
  pageSlug: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
}

/**
 * Server component that fetches a page's hero_banner section from the API
 * and renders it. Falls back to a default hero banner if no section exists.
 * Used by dedicated route pages (sermons, bulletins, etc.) that don't go
 * through the generic [pageSlug] dynamic route.
 */
export async function PageHeroBanner({ tenantSlug, pageSlug, fallbackTitle, fallbackSubtitle }: PageHeroBannerProps) {
  try {
    const page = await getPageBySlug(tenantSlug, pageSlug);
    const heroSection = page.sections?.find(
      (s: { blockType: string; isVisible: boolean }) =>
        (s.blockType === 'hero_banner' || s.blockType === 'hero_full_width') && s.isVisible
    );

    if (heroSection) {
      return <HeroBannerBlock props={heroSection.props} slug={tenantSlug} />;
    }
  } catch {
    // Page not found in page editor — use fallback
  }

  // Fallback: render default hero with page title
  return (
    <HeroBannerBlock
      props={{ title: fallbackTitle, subtitle: fallbackSubtitle ?? '' }}
      slug={tenantSlug}
    />
  );
}
