/**
 * /t/:slug/theme — deprecated landing.
 *
 * As of 2026-06-01 the theme system is owned by the super-admin (it's
 * evolving into a theme-set library where each set bundles design
 * tokens + layout + section-block compositions). The tenant admin no
 * longer edits theme directly. The old `/t/:slug/theme` route is left
 * mounted to avoid breaking bookmarks and to give a friendly notice
 * with a clear next-step (contact super-admin).
 *
 * Future: this whole route can be dropped once we're sure no tenants
 * have it bookmarked. For now it's a courteous 404 substitute.
 */
import { Link, useParams } from 'react-router-dom';

export default function ThemeDeprecatedNotice() {
  const { slug = '' } = useParams<{ slug: string }>();

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">🎨</div>
        <h1 className="text-xl font-bold text-gray-900">테마 설정은 이제 슈퍼어드민이 관리합니다</h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          교회 사이트의 디자인 (컬러, 폰트, 레이아웃) 은 우리가 큐레이션한
          테마셋 중에서 선택하여 적용하는 방식으로 바뀌었습니다.
          <br />
          테마 변경이 필요하시면 슈퍼어드민에게 문의해주세요.
        </p>

        <div className="mt-6 inline-block p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 text-left">
          <strong>왜 바뀌었나요?</strong>
          <ul className="mt-1.5 list-disc list-inside space-y-1">
            <li>전문가가 디자인한 테마셋을 한 번에 적용</li>
            <li>레이아웃과 페이지 구성이 자동으로 최적화</li>
            <li>운영자는 콘텐츠 관리에만 집중</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-2 justify-center">
          <Link
            to={`/t/${slug}`}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            대시보드로 돌아가기
          </Link>
          <Link
            to={`/t/${slug}/settings`}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            기본 설정
          </Link>
        </div>
      </div>
    </div>
  );
}
