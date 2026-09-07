// /features → /help. 기능 소개 페이지는 도움센터로 통합됨(마케팅 리뉴얼 2026-09-07).
// 마케팅 도메인 전용 라우트 — 테넌트 서브도메인은 /tenant/[slug]/… 로 리라이트되어 영향 없음.
import { redirect } from 'next/navigation';

export default function FeaturesRedirect() {
  redirect('/help');
}
