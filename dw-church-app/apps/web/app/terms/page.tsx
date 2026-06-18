import type { Metadata } from 'next';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Terms of Service / 이용약관 — TRUE LIGHT',
  description: 'Terms of Service for TRUE LIGHT, a church website and online-ministry solution.',
};

// Bilingual (KO/EN). Good-faith draft — NOT legal advice; Georgia attorney
// review recommended. English version governs.
export default function TermsPage() {
  return <LegalDoc kind="terms" />;
}
