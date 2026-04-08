import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

// ─── API Helper (same pattern as SuperAdminDashboardV2) ──
function useAdminApi() {
  const session = useAuthStore((s) => s.session);
  return useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${session?.accessToken || ''}`,
        ...(options?.headers as Record<string, string>),
      };
      if (options?.body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${baseUrl}/api/v1/migration${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [session?.accessToken],
  );
}

// ─── Types ───────────────────────────────────────────────

interface ScrapedPage {
  url: string;
  title: string;
  imageCount: number;
  images: string[];
  textPreview: string;
  textContent: string;
}

interface ScrapedSite {
  url: string;
  title: string;
  pageCount: number;
  menu: { label: string; href: string; children: { label: string; href: string }[] }[];
  pages: ScrapedPage[];
}

interface PagePlan {
  sourceUrl: string;
  sourceTitle: string;
  targetSlug: string;
  targetTitle: string;
  blocks: { blockType: string; label: string; props: Record<string, unknown> }[];
  included: boolean;
}

type Step = 'input' | 'scraped' | 'plan' | 'applying' | 'done';

// ─── Block Label Map ─────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  hero_banner: '히어로 배너',
  banner_slider: '배너 슬라이더',
  text_image: '텍스트+이미지',
  text_only: '텍스트',
  pastor_message: '담임목사 인사',
  church_intro: '교회 소개',
  mission_vision: '미션/비전',
  recent_sermons: '설교 목록',
  recent_bulletins: '주보 목록',
  recent_columns: '목회칼럼',
  album_gallery: '앨범 갤러리',
  event_grid: '행사',
  staff_grid: '교역자',
  history_timeline: '교회 연혁',
  worship_times: '예배 시간',
  location_map: '약도',
  contact_info: '연락처',
  newcomer_info: '새가족 안내',
  board: '게시판',
  divider: '구분선',
  quote_block: '인용/성경구절',
};

function blockLabel(type: string): string {
  return BLOCK_LABELS[type] || type;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function MigrationTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('input');
  const [siteUrl, setSiteUrl] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [scraping, setScraping] = useState(false);
  const [applying, setApplying] = useState(false);

  const [site, setSite] = useState<ScrapedSite | null>(null);
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([]);
  const [pagePlans, setPagePlans] = useState<PagePlan[]>([]);
  const [applyResult, setApplyResult] = useState<Record<string, number> | null>(null);

  // Fetch tenants on mount (tenants API is under /admin, not /migration)
  useEffect(() => {
    const host = window.location.hostname;
    const baseUrl = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
    const token = useAuthStore.getState().session?.accessToken || '';
    fetch(`${baseUrl}/api/v1/admin/tenants?page=1&perPage=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTenants(d.data || []))
      .catch(() => {});
  }, []);

  // ─── Step 1: Scrape ──────────────────────────────────
  const handleScrape = async () => {
    if (!siteUrl.trim()) return;
    setScraping(true);
    try {
      const res = await apiFetch<{ success: boolean; site: ScrapedSite }>('/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: siteUrl.trim(), maxPages: 30 }),
      });
      setSite(res.site);
      setStep('scraped');
      showToast('success', `${res.site.pageCount}개 페이지 수집 완료`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '사이트 수집 실패');
    } finally {
      setScraping(false);
    }
  };

  // ─── Step 2: Generate Plan ───────────────────────────
  // This generates a suggested block plan for each scraped page.
  // In the future, this could call an AI endpoint. For now, rule-based.
  const generatePlan = () => {
    if (!site) return;

    const plans: PagePlan[] = site.pages.map((page) => {
      const slug = page.url.replace(site.url, '').replace(/^\//, '').replace(/\/$/, '') || 'home';
      const title = page.title || slug;
      const hasImages = page.imageCount > 0;
      const text = page.textContent || '';

      // Rule-based block suggestions based on content analysis
      const blocks: PagePlan['blocks'] = [];

      // Every page gets a hero banner
      blocks.push({ blockType: 'hero_banner', label: blockLabel('hero_banner'), props: { title, subtitle: '', height: 'md' } });

      // Detect content type from URL patterns and text
      const lowerSlug = slug.toLowerCase();
      const lowerText = text.toLowerCase();

      if (lowerSlug === 'home' || lowerSlug === '') {
        blocks.push({ blockType: 'recent_sermons', label: blockLabel('recent_sermons'), props: { title: '최근 설교', limit: 4, variant: 'grid-4' } });
        blocks.push({ blockType: 'recent_bulletins', label: blockLabel('recent_bulletins'), props: { title: '최근 주보', limit: 4, variant: 'grid-4' } });
        blocks.push({ blockType: 'event_grid', label: blockLabel('event_grid'), props: { title: '교회 행사', limit: 4, variant: 'cards-4' } });
      } else if (/sermon|설교|preaching/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'recent_sermons', label: blockLabel('recent_sermons'), props: { limit: 12, variant: 'grid-4' } });
      } else if (/bulletin|주보|weekly/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'recent_bulletins', label: blockLabel('recent_bulletins'), props: { limit: 12, variant: 'grid-4' } });
      } else if (/column|칼럼|pastoral/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'recent_columns', label: blockLabel('recent_columns'), props: { limit: 12, variant: 'grid-3' } });
      } else if (/staff|교역|pastor|섬기는|사역자/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'staff_grid', label: blockLabel('staff_grid'), props: { title: '교역자', limit: 20, variant: 'grid-4' } });
      } else if (/gallery|album|앨범|갤러리|photo/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'album_gallery', label: blockLabel('album_gallery'), props: { limit: 12, variant: 'grid-4' } });
      } else if (/event|행사|소식|news/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'event_grid', label: blockLabel('event_grid'), props: { limit: 12, variant: 'cards-4' } });
      } else if (/history|연혁|역사/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'history_timeline', label: blockLabel('history_timeline'), props: { title: '교회 연혁' } });
      } else if (/worship|예배|service/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'worship_times', label: blockLabel('worship_times'), props: { title: '예배 안내', services: [] } });
      } else if (/direction|오시는|location|map|약도/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'location_map', label: blockLabel('location_map'), props: { title: '오시는 길' } });
        blocks.push({ blockType: 'contact_info', label: blockLabel('contact_info'), props: { title: '연락처' } });
      } else if (/newcomer|새가족|welcome|환영/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'newcomer_info', label: blockLabel('newcomer_info'), props: { title: '새가족 안내' } });
      } else if (/vision|비전|mission|사명/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'mission_vision', label: blockLabel('mission_vision'), props: { title: '비전과 사명' } });
      } else if (/about|소개|greet|인사/i.test(lowerSlug + lowerText)) {
        blocks.push({ blockType: 'pastor_message', label: blockLabel('pastor_message'), props: { title } });
      } else {
        // Default: text block with images if available
        if (hasImages) {
          blocks.push({ blockType: 'text_image', label: blockLabel('text_image'), props: { title, content: page.textPreview, imageUrl: page.images[0] || '' } });
        } else {
          blocks.push({ blockType: 'text_only', label: blockLabel('text_only'), props: { title, content: page.textPreview } });
        }
      }

      return { sourceUrl: page.url, sourceTitle: title, targetSlug: slug, targetTitle: title, blocks, included: true };
    });

    setPagePlans(plans);
    setStep('plan');
  };

  // ─── Step 3: Apply ──────────────────────────────────
  const handleApply = async () => {
    if (!targetSlug) {
      showToast('error', '대상 테넌트를 선택하세요');
      return;
    }

    const includedPlans = pagePlans.filter((p) => p.included);
    if (includedPlans.length === 0) {
      showToast('error', '적용할 페이지가 없습니다');
      return;
    }

    if (!window.confirm(`"${targetSlug}" 테넌트에 ${includedPlans.length}개 페이지를 적용하시겠습니까?`)) return;

    setApplying(true);
    setStep('applying');
    try {
      const data = {
        churchInfo: { name: site?.title || '' },
        pages: includedPlans.map((p) => ({
          title: p.targetTitle,
          slug: p.targetSlug,
          sections: p.blocks.map((b, i) => ({ blockType: b.blockType, props: b.props, sortOrder: i })),
        })),
      };

      const res = await apiFetch<{ success: boolean; result: Record<string, number> }>('/apply', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug: targetSlug, data }),
      });

      setApplyResult(res.result);
      setStep('done');
      showToast('success', '마이그레이션 완료');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '적용 실패');
      setStep('plan');
    } finally {
      setApplying(false);
    }
  };

  // ─── Toggle page inclusion ──────────────────────────
  const togglePage = (idx: number) => {
    setPagePlans((prev) => prev.map((p, i) => i === idx ? { ...p, included: !p.included } : p));
  };

  // ─── Remove a block from a page plan ────────────────
  const removeBlock = (pageIdx: number, blockIdx: number) => {
    setPagePlans((prev) => prev.map((p, i) => i === pageIdx ? { ...p, blocks: p.blocks.filter((_, bi) => bi !== blockIdx) } : p));
  };

  // ─── Reset ──────────────────────────────────────────
  const handleReset = () => {
    setStep('input');
    setSite(null);
    setPagePlans([]);
    setApplyResult(null);
    setSiteUrl('');
    setTargetSlug('');
  };

  // ═══════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-6">

      {/* ─── Step 1: URL Input ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔍</span>
          <h3 className="text-base font-semibold text-gray-900">1단계: 사이트 수집</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">마이그레이션할 교회 웹사이트 URL을 입력하세요.</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://example-church.com"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            disabled={scraping}
          />
          <button
            onClick={handleScrape}
            disabled={scraping || !siteUrl.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {scraping ? '수집 중...' : '사이트 수집'}
          </button>
        </div>
      </div>

      {/* ─── Step 2: Scraped Result ────────────────────── */}
      {site && step !== 'input' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <h3 className="text-base font-semibold text-gray-900">2단계: 수집 결과</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">{site.pageCount}개 페이지</span>
              <span className="text-gray-500">{site.pages.reduce((s, p) => s + p.imageCount, 0)}개 이미지</span>
            </div>
          </div>

          {/* Menu structure */}
          {site.menu.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">메뉴 구조</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-0.5">
                {site.menu.map((m, i) => (
                  <div key={i}>
                    <span className="font-medium">{m.label}</span>
                    {m.children.length > 0 && (
                      <span className="text-gray-400 ml-2">
                        ({m.children.map((c) => c.label).join(', ')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {site.pages.map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                <span className="font-medium flex-1 truncate">{p.title || '(제목 없음)'}</span>
                <span className="text-gray-400">{p.imageCount}장</span>
              </div>
            ))}
          </div>

          {/* Tenant selector + Generate plan button */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <select
              value={targetSlug}
              onChange={(e) => setTargetSlug(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1"
            >
              <option value="">대상 테넌트 선택</option>
              {tenants.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
              ))}
            </select>
            <button
              onClick={generatePlan}
              disabled={!targetSlug}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              블록 구성 제안 생성
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Block Plan Review ─────────────────── */}
      {pagePlans.length > 0 && (step === 'plan' || step === 'applying') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧩</span>
              <h3 className="text-base font-semibold text-gray-900">3단계: 블록 구성 검토</h3>
            </div>
            <div className="text-xs text-gray-500">
              {pagePlans.filter((p) => p.included).length}/{pagePlans.length} 페이지 선택됨
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            각 페이지별 블록 구성을 검토하세요. 불필요한 페이지는 체크 해제, 블록은 X로 제거할 수 있습니다.
          </p>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {pagePlans.map((plan, pi) => (
              <div
                key={pi}
                className={`border rounded-xl overflow-hidden ${plan.included ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}
              >
                {/* Page header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b">
                  <input
                    type="checkbox"
                    checked={plan.included}
                    onChange={() => togglePage(pi)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{plan.sourceTitle}</span>
                    <span className="text-xs text-gray-400 ml-2">→ /{plan.targetSlug}</span>
                  </div>
                  <span className="text-xs text-gray-400">{plan.blocks.length}개 블록</span>
                </div>

                {/* Blocks */}
                {plan.included && (
                  <div className="p-3 space-y-1.5">
                    {plan.blocks.map((block, bi) => (
                      <div key={bi} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {block.blockType}
                        </span>
                        <span className="text-xs text-gray-600 flex-1 truncate">{block.label}</span>
                        <button
                          onClick={() => removeBlock(pi, bi)}
                          className="text-gray-400 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Apply button */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
            >
              처음으로
            </button>
            <button
              onClick={handleApply}
              disabled={applying || pagePlans.filter((p) => p.included).length === 0}
              className="flex-1 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {applying ? '적용 중...' : `승인 및 적용 (${pagePlans.filter((p) => p.included).length}개 페이지)`}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Done ──────────────────────────────── */}
      {step === 'done' && applyResult && (
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✅</span>
            <h3 className="text-base font-semibold text-green-800">마이그레이션 완료</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {Object.entries(applyResult).filter(([, v]) => v > 0).map(([key, val]) => (
              <div key={key} className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">{val}</p>
                <p className="text-xs text-green-600">{key}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            새 마이그레이션 시작
          </button>
        </div>
      )}

      {/* ─── Empty state ───────────────────────────────── */}
      {step === 'input' && !scraping && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-3xl mb-3">🔄</p>
          <p className="text-sm font-medium text-gray-700 mb-2">사이트 마이그레이션</p>
          <p className="text-xs text-gray-500">
            기존 교회 웹사이트 URL을 입력하면 페이지를 수집하고,<br />
            각 페이지별 블록 구성을 제안합니다.<br />
            검토 후 승인하면 선택한 테넌트에 자동 적용됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
