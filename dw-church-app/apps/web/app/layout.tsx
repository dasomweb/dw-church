import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'DW Church - 교회 웹사이트를 5분 만에',
  description: '교회 맞춤형 웹사이트를 무료로 만들어보세요. 설교, 주보, 앨범, 교역자 소개까지 한번에 관리하세요.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
