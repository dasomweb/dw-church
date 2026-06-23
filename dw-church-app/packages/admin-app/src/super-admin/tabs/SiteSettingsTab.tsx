import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components';
import { useAuthStore } from '../../stores/auth';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

// ─── Tab: 사이트 설정 (truelight.app 브랜딩 — 로고/파비콘/기본정보) ──────────
// 로고·파비콘은 투명도(PNG/SVG) 보존을 위해 리사이즈 없이 원본 그대로 업로드한다
// (리사이즈 유틸은 JPEG 흰배경으로 변환 → 로고 깨짐). 작은 파일이라 용량 문제 없음.
function BrandImageInput({ value, onChange, upload, label, hint, previewClass }: {
  value: string; onChange: (url: string) => void; upload: (f: File) => Promise<string>;
  label: string; hint?: string; previewClass?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await upload(f)); }
    catch { alert('업로드에 실패했습니다.'); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center rounded-lg border border-gray-200 bg-[conic-gradient(#f3f4f6_90deg,#fff_90deg_180deg,#f3f4f6_180deg_270deg,#fff_270deg)] bg-[length:16px_16px] overflow-hidden ${previewClass ?? 'h-14 w-32'}`}>
          {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">미리보기</span>}
        </div>
        <input ref={ref} type="file" accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg,.ico,.svg" className="hidden" onChange={onFile} />
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? '업로드 중…' : '파일 선택'}
        </button>
        {value && <button type="button" onClick={() => onChange('')} className="text-xs text-gray-400 hover:text-red-600">삭제</button>}
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="또는 이미지 URL"
        className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SiteSettingsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);
  const [cfg, setCfg] = useState({ logoUrl: '', logoHeight: 32, faviconUrl: '', siteName: '', tagline: '', contactEmail: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ data: Record<string, unknown> }>('/marketing-config');
        const d = res.data || {};
        setCfg({
          logoUrl: (d.logoUrl as string) || '', logoHeight: (d.logoHeight as number) || 32,
          faviconUrl: (d.faviconUrl as string) || '', siteName: (d.siteName as string) || '',
          tagline: (d.tagline as string) || '', contactEmail: (d.contactEmail as string) || '',
        });
      } catch (e) { showToast('error', e instanceof Error ? e.message : '로딩 실패'); }
      finally { setLoading(false); }
    })();
  }, [apiFetch, showToast]);

  // Upload as-is (no resize) so logo/favicon transparency is preserved.
  const uploadAsIs = async (file: File): Promise<string> => {
    const host = window.location.hostname;
    const base = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${base}/api/v1/admin/shared-images/upload?category=brand`, {
      method: 'POST', headers: { Authorization: `Bearer ${session?.accessToken || ''}` }, body: fd,
    });
    if (!res.ok) throw new Error('업로드 실패');
    const json = await res.json();
    return (json.data?.url ?? json.url) as string;
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/marketing-config', {
        method: 'PUT',
        body: JSON.stringify({
          logoUrl: cfg.logoUrl || null,
          logoHeight: Number(cfg.logoHeight) || 32,
          faviconUrl: cfg.faviconUrl || null,
          siteName: cfg.siteName || null,
          tagline: cfg.tagline || null,
          contactEmail: cfg.contactEmail || null,
        }),
      });
      showToast('success', '사이트 설정을 저장했습니다. (프론트에 반영되려면 새로고침)');
    } catch (e) { showToast('error', e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          truelight.app 사이트의 로고·파비콘·기본 정보를 설정합니다. 저장 후 사이트를 새로고침하면 반영됩니다.
        </p>
      </div>

      {/* 로고 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">로고</h2>
        <BrandImageInput
          label="헤더 로고 (투명 PNG·SVG 권장)"
          value={cfg.logoUrl}
          onChange={(url) => setCfg({ ...cfg, logoUrl: url })}
          upload={uploadAsIs}
          hint="비우면 'TRUE LIGHT' 글자 로고가 표시됩니다."
        />
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">로고 높이 — {cfg.logoHeight}px</label>
          <input type="range" min={16} max={64} value={cfg.logoHeight}
            onChange={(e) => setCfg({ ...cfg, logoHeight: Number(e.target.value) })} className="w-full" />
          <p className="text-xs text-gray-400">헤더에 표시되는 로고의 높이입니다 (16–64px).</p>
        </div>
        {cfg.logoUrl && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-2">헤더 미리보기</p>
            <div className="flex items-center bg-white rounded-md px-3 py-2 border border-gray-100">
              <img src={cfg.logoUrl} alt="" style={{ height: cfg.logoHeight }} className="object-contain" />
            </div>
          </div>
        )}
      </div>

      {/* 파비콘 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">파비콘</h2>
        <BrandImageInput
          label="파비콘 (브라우저 탭 아이콘, 정사각형 PNG·ICO)"
          value={cfg.faviconUrl}
          onChange={(url) => setCfg({ ...cfg, faviconUrl: url })}
          upload={uploadAsIs}
          previewClass="h-12 w-12"
          hint="32×32 또는 64×64 정사각형 이미지를 권장합니다."
        />
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">기본 정보</h2>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">사이트 이름</label>
          <input value={cfg.siteName} onChange={(e) => setCfg({ ...cfg, siteName: e.target.value })} className={inputCls} placeholder="TRUE LIGHT" />
          <p className="mt-1 text-xs text-gray-400">로고 이미지가 없을 때 헤더와 브라우저 탭 제목에 사용됩니다.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">태그라인 (선택)</label>
          <input value={cfg.tagline} onChange={(e) => setCfg({ ...cfg, tagline: e.target.value })} className={inputCls} placeholder="교회 홈페이지를 직접 만들고 관리하세요" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">대표 이메일</label>
          <input value={cfg.contactEmail} onChange={(e) => setCfg({ ...cfg, contactEmail: e.target.value })} className={inputCls} placeholder="info@truelight.app" />
          <p className="mt-1 text-xs text-gray-400">사이트 푸터에 표시됩니다.</p>
        </div>
      </div>

      <button onClick={() => void save()} disabled={saving}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? '저장 중…' : '사이트 설정 저장'}
      </button>
    </div>
  );
}
