import { useState, useEffect } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

// truelight.app 마케팅 사이트의 디자인 — 기본 글자 크기. Tailwind 텍스트가 rem
// 기반이라 루트 폰트 크기를 바꾸면 사이트 전체 글자가 비례해서 커지거나 작아진다.
export default function SiteDesignTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [baseFontPx, setBaseFontPx] = useState(16);
  const [heroMobileRatio, setHeroMobileRatio] = useState<'4:5' | 'full'>('4:5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ data: { baseFontPx?: number; heroMobileRatio?: string } }>('/marketing-config');
        setBaseFontPx((res.data?.baseFontPx as number) || 16);
        setHeroMobileRatio(res.data?.heroMobileRatio === 'full' ? 'full' : '4:5');
      } catch (e) { showToast('error', e instanceof Error ? e.message : '로딩 실패'); }
      finally { setLoading(false); }
    })();
  }, [apiFetch, showToast]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/marketing-config', { method: 'PUT', body: JSON.stringify({ baseFontPx: Number(baseFontPx), heroMobileRatio }) });
      showToast('success', '디자인을 저장했습니다. (사이트 새로고침 시 반영)');
    } catch (e) { showToast('error', e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">truelight.app 사이트의 기본 글자 크기를 조정합니다. 전체 텍스트가 비례해서 커지거나 작아집니다.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">홈 Hero 배너 — 모바일 표시</h2>
        <p className="text-xs text-gray-400">휴대폰에서 메인 hero 배너를 어떤 비율로 보여줄지 선택합니다. (데스크톱은 항상 와이드 21:9)</p>
        <div className="flex flex-wrap gap-2">
          {([['4:5', '4:5 (세로 카드)'], ['full', '모바일 풀사이즈 (9:16)']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setHeroMobileRatio(val)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${heroMobileRatio === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">기본 글자 크기</h2>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">기본 글자 크기 — {baseFontPx}px</label>
          <input type="range" min={12} max={22} value={baseFontPx}
            onChange={(e) => setBaseFontPx(Number(e.target.value))} className="w-full" />
          <p className="text-xs text-gray-400">기본 16px. 작게(12) ~ 크게(22).</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-400 mb-2">미리보기</p>
          <div style={{ fontSize: baseFontPx }}>
            <p className="font-bold text-gray-900" style={{ fontSize: '1.5rem' }}>교회의 온라인 사역, 전문 솔루션으로.</p>
            <p className="mt-1 text-gray-500" style={{ fontSize: '0.95rem' }}>TRUE LIGHT는 교회의 온라인 사역을 위한 전문 솔루션입니다.</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? '저장 중…' : '디자인 저장'}
        </button>
      </div>
    </div>
  );
}
