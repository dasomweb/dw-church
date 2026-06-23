import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAuthStore } from '../../stores/auth';
import { ImageUpload } from '../../components/ImageUpload';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';

// ─── Tab: 포트폴리오 (케이스 스터디) ──────────────────────────
// Operator-curated showcase of churches we've built. Published entries appear on
// the public marketing /portfolio page. Screenshots upload to the platform
// shared-images bucket under category='portfolio' (kept out of the tenant library).

interface CaseStudy {
  id: string;
  churchName: string;
  tagline: string | null;
  screenshotUrl: string | null;
  liveUrl: string | null;
  tags: string[];
  sortOrder: number;
  isPublished: boolean;
}

type Draft = Omit<CaseStudy, 'id'> & { id?: string };

const EMPTY: Draft = {
  churchName: '', tagline: '', screenshotUrl: '', liveUrl: '', tags: [], sortOrder: 0, isPublished: true,
};

export default function CaseStudiesTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: CaseStudy[] } | CaseStudy[]>('/case-studies');
      setItems(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '포트폴리오 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => { void load(); }, [load]);

  // Screenshots upload as-is to the platform bucket (operator-curated, few of them).
  const uploadScreenshot = async (file: File): Promise<string> => {
    const host = window.location.hostname;
    const base = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${base}/api/v1/admin/shared-images/upload?category=portfolio`, {
      method: 'POST', headers: { Authorization: `Bearer ${session?.accessToken || ''}` }, body: fd,
    });
    if (!res.ok) throw new Error('업로드 실패');
    const json = await res.json();
    return (json.data?.url ?? json.url) as string;
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.churchName.trim()) { showToast('error', '교회명을 입력하세요.'); return; }
    setSaving(true);
    try {
      const body = {
        churchName: editing.churchName,
        tagline: editing.tagline || null,
        screenshotUrl: editing.screenshotUrl || null,
        liveUrl: editing.liveUrl || null,
        tags: editing.tags,
        sortOrder: Number(editing.sortOrder) || 0,
        isPublished: editing.isPublished,
      };
      if (editing.id) {
        await apiFetch(`/case-studies/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/case-studies', { method: 'POST', body: JSON.stringify(body) });
      }
      showToast('success', '저장되었습니다.');
      setEditing(null);
      void load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const del = async (item: CaseStudy) => {
    if (!window.confirm(`"${item.churchName}" 케이스를 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/case-studies/${item.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      void load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex-1 mr-4">
          <p className="text-sm font-medium text-blue-800">
            적용한 교회를 truelight.app 포트폴리오(/portfolio)에 공개합니다. '공개'로 설정한 항목만 노출되며,
            카드를 클릭하면 실제 교회 사이트로 이동합니다.
          </p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY, sortOrder: items.length })}
          className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
          + 케이스 추가
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState message="등록된 케이스가 없습니다." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="aspect-video bg-gray-50">
                {it.screenshotUrl
                  ? <img src={it.screenshotUrl} alt={it.churchName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">스크린샷 없음</div>}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{it.churchName}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${it.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {it.isPublished ? '공개' : '비공개'}
                  </span>
                </div>
                {it.tagline && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{it.tagline}</p>}
                {it.liveUrl && <a href={it.liveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 hover:underline truncate max-w-full">{it.liveUrl}</a>}
                {it.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {it.tags.map((t) => <span key={t} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEditing({ ...it })} className="text-xs font-medium text-gray-600 hover:text-gray-900">편집</button>
                  <button onClick={() => void del(it)} className="text-xs font-medium text-red-600 hover:text-red-700">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing.id ? '케이스 편집' : '케이스 추가'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">교회명 *</label>
                <input value={editing.churchName} onChange={(e) => setEditing({ ...editing, churchName: e.target.value })} className={inputCls} placeholder="예: 다솜교회" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">한 줄 소개</label>
                <input value={editing.tagline || ''} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} className={inputCls} placeholder="예: 뉴저지 한인교회 — 10분 만에 만든 홈페이지" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">대표 스크린샷</label>
                <ImageUpload value={editing.screenshotUrl || ''} onChange={(url) => setEditing({ ...editing, screenshotUrl: url })} onUpload={uploadScreenshot} aspectRatio="16/9" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">실제 사이트 URL</label>
                <input value={editing.liveUrl || ''} onChange={(e) => setEditing({ ...editing, liveUrl: e.target.value })} className={inputCls} placeholder="https://dasom.truelight.app" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">태그 (쉼표로 구분)</label>
                <input value={editing.tags.join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className={inputCls} placeholder="예: 한인교회, 침례교, 뉴저지" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">정렬 순서</label>
                  <input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-6">
                  <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} className="h-4 w-4" />
                  공개
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">취소</button>
              <button onClick={() => void save()} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
