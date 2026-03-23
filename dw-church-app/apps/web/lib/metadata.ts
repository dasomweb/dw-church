import { getChurchSettings } from './api';
import type { Metadata } from 'next';

export async function buildTenantMetadata(slug: string, pageName?: string, description?: string): Promise<Metadata> {
  let settings;
  try {
    settings = await getChurchSettings(slug);
  } catch {
    // fallback
  }
  const name = settings?.name ?? slug;
  const desc = description ?? settings?.description ?? `${name} - 교회 웹사이트`;
  return {
    title: pageName ? `${pageName} | ${name}` : name,
    description: desc,
    openGraph: {
      title: pageName ? `${pageName} | ${name}` : name,
      description: desc,
      type: 'website',
    },
  };
}
