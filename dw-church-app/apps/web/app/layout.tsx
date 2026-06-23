import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { getMarketingConfig } from '../lib/api';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const SITE_URL = 'https://truelight.app';
const DEFAULT_TITLE = 'True Light — 교회 웹사이트를 쉽고 편리하게';
const DEFAULT_DESC = '복잡한 준비 없이 교회의 온라인 사역을 시작하세요. 설교·주보부터 새가족·목장까지 한 곳에서 관리합니다.';

// Platform marketing metadata (title/description + SNS link-preview image), driven
// by the super-admin 사이트 설정. Tenant routes override this via their own layout.
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getMarketingConfig().catch(() => ({} as Record<string, unknown>));
  const title = (cfg.seoTitle as string) || (cfg.siteName as string) || DEFAULT_TITLE;
  const description = (cfg.seoDescription as string) || (cfg.tagline as string) || DEFAULT_DESC;
  const ogImage = (cfg.ogImageUrl as string) || '';
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: (cfg.siteName as string) || 'TRUE LIGHT',
      title,
      description,
      url: SITE_URL,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
