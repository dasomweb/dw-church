import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';

/**
 * LB-01 자료실 — 주간 교안·양식 등을 분류·열람권한과 함께 올린다. 파일은 R2 업로드,
 * 리더 전용/구성원/전체 열람권한. 주간 교안은 날짜로 정렬해 최근 것이 위로.
 */
type Resource = Record<string, any>;
const PERM_LABEL: Record<string, string> = { all: '전체', members: '구성원', leaders: '리더 전용' };

const blank = (): Resource => ({ title: '', category: '', fileUrl: '', fileName: '', fileSize: 0, viewPermission: 'leaders', teachingDate: '', note: '' });

export default function GroupResources() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Resource | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resQ = useQuery({ queryKey: ['group-resources'], queryFn: async () => (await api.get<{ data: Resource[] }>('/api/v1/group-resources') as any).data as Resource[] });
  const resources = resQ.data ?? [];

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const up = await apiClient!.uploadFile(file, 'group-resource');
      setEditing((cur) => ({ ...(cur as Resource), fileUrl: up.url, fileName: file.name, fileSize: file.size, title: (cur?.title || file.name.replace(/\.[^.]+$/, '')) }));
      showToast('success', '파일을 올렸습니다.');
    } catch (e: any) { showToast('error', e?.message || '업로드 실패'); }
    finally { setUploading(false); }
  };

  const save = async (r: Resource) => {
    if (!r.title?.trim()) { showToast('error', '제목을 입력하세요.'); return; }
    setBusy(true);
    const payload = { ...r, teachingDate: r.teachingDate || undefined };
    try {
      if (r.id) await api.put(`/api/v1/group-resources/${r.id}`, payload);
      else await api.post('/api/v1/group-resources', payload);
      qc.invalidateQueries({ queryKey: ['group-resources'] });
      setEditing(null);
      showToast('success', '저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setBusy(false); }
  };
  const del = async (r: Resource) => {
    if (!window.confirm('이 자료를 삭제할까요?')) return;
    try { await api.delete(`/api/v1/group-resources/${r.id}`); qc.invalidateQueries({ queryKey: ['group-resources'] }); if (editing?.id === r.id) setEditing(null); } catch (e: any) { showToast('error', e?.message || '실패'); }
  };
  const openEdit = (r: Resource) => setEditing({ ...r, fileUrl: r.file_url, fileName: r.file_name, fileSize: r.file_size, viewPermission: r.view_permission, teachingDate: r.teaching_date ?? '' });

  const fmtSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)}MB` : b > 1e3 ? `${Math.round(b / 1e3)}KB` : `${b}B`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">자료실</h1>
          <p className="text-sm text-gray-500 mt-1">주간 교안·양식 등을 분류와 열람권한을 정해 올립니다.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 자료 추가</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {resQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
            : resources.length === 0 ? <EmptyState icon="📁" title="자료가 없습니다" description="첫 자료를 올리세요." />
            : (
              <div className="divide-y divide-gray-50">
                {resources.map((r) => (
                  <div key={r.id} className="p-4 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">📄</span>
                    <button onClick={() => openEdit(r)} className="min-w-0 flex-1 text-left">
                      <span className="text-sm font-medium text-gray-800">{r.title}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{[r.category, PERM_LABEL[r.view_permission], r.teaching_date, r.file_size ? fmtSize(r.file_size) : ''].filter(Boolean).join(' · ') || '—'}</span>
                    </button>
                    {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 shrink-0">열기</a>}
                    <button onClick={() => void del(r)} className="text-xs text-gray-300 hover:text-red-600 shrink-0">삭제</button>
                  </div>
                ))}
              </div>
            )}
        </div>

        {editing && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 h-fit">
            <h2 className="text-sm font-semibold text-gray-800">{editing.id ? '자료 수정' : '새 자료'}</h2>
            {/* 파일 */}
            <div>
              <span className="text-xs font-medium text-gray-600">파일</span>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }} />
              {editing.fileUrl ? (
                <div className="flex items-center gap-2 mt-1 bg-gray-50 rounded-lg p-2.5">
                  <span className="text-sm text-gray-700 truncate flex-1">{editing.fileName || '파일'}</span>
                  <a href={editing.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600">열기</a>
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-gray-500 hover:text-gray-700">변경</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-1 w-full border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  {uploading ? '업로드 중…' : '파일 선택 (PDF·이미지·문서)'}
                </button>
              )}
            </div>
            <label className="block"><span className="text-xs font-medium text-gray-600">제목 *</span>
              <input className={inputClass} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-medium text-gray-600">분류</span>
                <input className={inputClass} value={editing.category} placeholder="예: 주간교안" onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">열람 권한</span>
                <select className={inputClass} value={editing.viewPermission} onChange={(e) => setEditing({ ...editing, viewPermission: e.target.value })}>
                  {Object.entries(PERM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></label>
              <label className="block col-span-2"><span className="text-xs font-medium text-gray-600">교안 날짜 (선택)</span>
                <input type="date" className={inputClass} value={editing.teachingDate} onChange={(e) => setEditing({ ...editing, teachingDate: e.target.value })} /></label>
            </div>
            <div className="flex gap-2 pt-1">
              <button disabled={busy} onClick={() => void save(editing)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">저장</button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 ml-auto">취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
