'use client';

import Link from 'next/link';
import { useMarketingLang } from './useMarketingLang';
import { useSiteBrand } from './useSiteBrand';

// Global truelight.app marketing footer — shared by every marketing page.
// Vertical padding is operator-configurable via marketing-config.
const COPY = {
  ko: {
    tagline: '현대 교회를 위한 전문 홈페이지 플랫폼.',
    platform: '플랫폼', featuresLink: '기능', pricing: '요금제', embed: '위젯 임베드',
    support: '지원', contact: '문의하기', customerSupport: '고객지원', adminLogin: '관리자 로그인',
    company: '회사', terms: '이용약관', privacy: '개인정보처리방침',
  },
  en: {
    tagline: 'Professional church website platform for modern ministries.',
    platform: 'Platform', featuresLink: 'Features', pricing: 'Pricing', embed: 'Widget Embed',
    support: 'Support', contact: 'Contact Us', customerSupport: 'Customer Support', adminLogin: 'Admin Login',
    company: 'Company', terms: 'Terms of Service', privacy: 'Privacy Policy',
  },
} as const;

export default function MarketingFooter() {
  const { lang } = useMarketingLang();
  const brand = useSiteBrand();
  const t = COPY[lang];
  const padY = brand?.footerPaddingY ?? 48;

  return (
    <footer className="border-t border-gray-200 bg-white px-4 sm:px-6" style={{ paddingTop: padY, paddingBottom: padY }}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <span className="text-lg font-bold text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
            <p className="mt-3 text-sm text-gray-500">{t.tagline}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">{t.platform}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/features" className="hover:text-gray-700">{t.featuresLink}</Link></li>
              <li><a href="/#plans" className="hover:text-gray-700">{t.pricing}</a></li>
              <li><Link href="/embed" className="hover:text-gray-700">{t.embed}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">{t.support}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="mailto:info@truelight.app" className="hover:text-gray-700">{t.contact}</a></li>
              <li><a href="mailto:support@truelight.app" className="hover:text-gray-700">{t.customerSupport}</a></li>
              <li><a href="https://admin.truelight.app" className="hover:text-gray-700">{t.adminLogin}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">{t.company}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="/terms" className="hover:text-gray-700">{t.terms}</a></li>
              <li><a href="/privacy" className="hover:text-gray-700">{t.privacy}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} TRUE LIGHT by DASOMWEB. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
