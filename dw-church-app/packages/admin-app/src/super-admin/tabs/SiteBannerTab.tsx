import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { useAuthStore } from '../../stores/auth';
import { Spinner } from '../shared/admin-ui';

// truelight.app 홈 히어로(상단 배너) 슬라이드 편집. 슬라이드별로 한/영 문구 + 이미지.
// 비워두면 기본 슬라이드가 표시된다. marketing-config.heroSlides 에 저장.
type BtnVariant = 'primary' | 'outline' | 'demo';
interface HeroBtn { labelKo: string; labelEn: string; url: string; variant: BtnVariant; }
interface HeroSlide {
  headlineKo: string; headlineEn: string;
  sublineKo: string; sublineEn: string;
  imageUrl: string;
  buttons?: HeroBtn[];
}
const emptySlide = (): HeroSlide => ({ headlineKo: '', headlineEn: '', sublineKo: '', sublineEn: '', imageUrl: '', buttons: [] });
const emptyBtn = (): HeroBtn => ({ labelKo: '', labelEn: '', url: '', variant: 'primary' });
const VARIANT_LABELS: Record<BtnVariant, string> = { primary: '주요(파란 버튼)', outline: '외곽선(흰 테두리)', demo: '데모 체험(모달)' };

export default function SiteBannerTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ data: { heroSlides?: HeroSlide[] } }>('/marketing-config');
        setSlides(Array.isArray(res.data?.heroSlides) ? res.data.heroSlides : []);
      } catch (e) { showToast('error', e instanceof Error ? e.message : '로딩 실패'); }
      finally { setLoading(false); }
    })();
  }, [apiFetch, showToast]);

  const uploadImage = async (file: File): Promise<string> => {
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

  const set = (idx: number, patch: Partial<HeroSlide>) =>
    setSlides((arr) => arr.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= slides.length) return;
    setSlides((arr) => { const c = [...arr]; [c[idx], c[next]] = [c[next]!, c[idx]!]; return c; });
  };
  const onPick = async (idx: number, file: File | undefined) => {
    if (!file) return;
    setUploadingIdx(idx);
    try { set(idx, { imageUrl: await uploadImage(file) }); }
    catch (e) { showToast('error', e instanceof Error ? e.message : '업로드 실패'); }
    finally { setUploadingIdx(null); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/marketing-config', { method: 'PUT', body: JSON.stringify({ heroSlides: slides }) });
      showToast('success', '배너를 저장했습니다. (사이트 새로고침 시 반영)');
    } catch (e) { showToast('error', e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">truelight.app 홈 상단 배너(히어로) 슬라이드입니다. 비워두면 기본 배너가 표시됩니다. 이미지 권장: 가로형 1920×820.</p>
      </div>

      {slides.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          슬라이드가 없습니다. 아래 "+ 슬라이드 추가"로 만드세요. (없으면 기본 배너 사용)
        </div>
      )}

      {slides.map((s, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">슬라이드 {idx + 1}</h3>
            <div className="flex items-center gap-2 text-gray-400">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="hover:text-gray-700 disabled:opacity-30">▲</button>
              <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} className="hover:text-gray-700 disabled:opacity-30">▼</button>
              <button onClick={() => setSlides((arr) => arr.filter((_, i) => i !== idx))} className="text-xs text-red-500 hover:text-red-700">삭제</button>
            </div>
          </div>

          {/* 이미지 */}
          <div>
            <div className="aspect-[21/9] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {s.imageUrl
                ? <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-gray-300">이미지 없음</div>}
            </div>
            <input ref={(el) => { fileRefs.current[idx] = el; }} type="file" accept="image/*" className="hidden"
              onChange={(e) => onPick(idx, e.target.files?.[0])} />
            <button onClick={() => fileRefs.current[idx]?.click()} disabled={uploadingIdx === idx}
              className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {uploadingIdx === idx ? '업로드 중…' : '이미지 업로드'}
            </button>
          </div>

          {/* 문구 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-medium text-gray-600">제목 (한국어)
              <input className={`${inputCls} mt-1`} value={s.headlineKo} onChange={(e) => set(idx, { headlineKo: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-600">제목 (영어)
              <input className={`${inputCls} mt-1`} value={s.headlineEn} onChange={(e) => set(idx, { headlineEn: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-600">부제 (한국어)
              <input className={`${inputCls} mt-1`} value={s.sublineKo} onChange={(e) => set(idx, { sublineKo: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-600">부제 (영어)
              <input className={`${inputCls} mt-1`} value={s.sublineEn} onChange={(e) => set(idx, { sublineEn: e.target.value })} />
            </label>
          </div>

          {/* 버튼 */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">버튼 (최대 3개)</span>
              {(s.buttons?.length ?? 0) < 3 && (
                <button onClick={() => set(idx, { buttons: [...(s.buttons ?? []), emptyBtn()] })}
                  className="text-xs text-blue-600 hover:underline">+ 버튼 추가</button>
              )}
            </div>
            {(s.buttons?.length ?? 0) === 0 && <p className="text-[11px] text-gray-400">버튼이 없으면 기본 버튼(시작하기·요금제·데모)이 표시됩니다.</p>}
            <div className="space-y-2">
              {(s.buttons ?? []).map((b, bi) => {
                const setBtn = (patch: Partial<HeroBtn>) =>
                  set(idx, { buttons: (s.buttons ?? []).map((x, j) => (j === bi ? { ...x, ...patch } : x)) });
                return (
                  <div key={bi} className="rounded-lg border border-gray-200 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <select className={`${inputCls} flex-1`} value={b.variant} onChange={(e) => setBtn({ variant: e.target.value as BtnVariant })}>
                        {(Object.keys(VARIANT_LABELS) as BtnVariant[]).map((v) => <option key={v} value={v}>{VARIANT_LABELS[v]}</option>)}
                      </select>
                      <button onClick={() => set(idx, { buttons: (s.buttons ?? []).filter((_, j) => j !== bi) })}
                        className="text-gray-400 hover:text-red-600 px-1">✕</button>
                    </div>
                    {b.variant !== 'demo' && (
                      <div className="grid sm:grid-cols-3 gap-2">
                        <input className={inputCls} placeholder="버튼명(한국어)" value={b.labelKo} onChange={(e) => setBtn({ labelKo: e.target.value })} />
                        <input className={inputCls} placeholder="버튼명(영어)" value={b.labelEn} onChange={(e) => setBtn({ labelEn: e.target.value })} />
                        <input className={inputCls} placeholder="링크 (예: /apply, /#plans)" value={b.url} onChange={(e) => setBtn({ url: e.target.value })} />
                      </div>
                    )}
                    {b.variant === 'demo' && <p className="text-[11px] text-gray-400">데모 체험 신청 모달을 여는 버튼입니다. (문구·링크 고정)</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button onClick={() => setSlides((arr) => [...arr, emptySlide()])}
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">+ 슬라이드 추가</button>
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? '저장 중…' : '배너 저장'}
        </button>
      </div>
    </div>
  );
}
