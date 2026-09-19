import { useState } from 'react';
import type { OnlineBulletin, OnlineBulletinContent, OnlineHymn, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useOnlineBulletins,
  useCreateOnlineBulletin,
  useUpdateOnlineBulletin,
  useDeleteOnlineBulletin,
  useDWChurchClient,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, MultiImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

// 온라인 주보 관리 — 문서 주보(BulletinManagement)와 별개. content(jsonb) 한 건에
// 예배순서·찬양악보·대표기도·성경본문·기도제목·마지막찬양·주일광고·소그룹질문을 입력.

const EMPTY_HYMN: OnlineHymn = { title: '', hymnNo: '', imageUrls: [], note: '' };
const EMPTY_CONTENT: OnlineBulletinContent = {
  serviceTitle: '주일예배',
  presider: '',
  worshipOrder: [],
  hymns: [],
  representativePrayer: { person: '', content: '' },
  scripture: { reference: '', text: '' },
  prayerRequests: [],
  closingHymn: { ...EMPTY_HYMN },
  announcements: [],
  study: { observation: [], correlation: [], application: [] },
};

interface FormState { title: string; serviceDate: string; status: PostStatus; content: OnlineBulletinContent }
const EMPTY_FORM: FormState = { title: '', serviceDate: '', status: 'published', content: structuredClone(EMPTY_CONTENT) };

const btnGhost = 'text-sm text-blue-600 hover:underline';
const btnDelRow = 'text-red-500 hover:text-red-700 text-sm shrink-0';

export default function OnlineBulletinManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file, 'online-bulletins')).url;
  const { data, isLoading, error } = useOnlineBulletins(params);
  const createMutation = useCreateOnlineBulletin();
  const updateMutation = useUpdateOnlineBulletin();
  const deleteMutation = useDeleteOnlineBulletin();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── content mutation helpers ──
  const c = form.content;
  const setContent = (patch: Partial<OnlineBulletinContent>) => setForm((f) => ({ ...f, content: { ...f.content, ...patch } }));
  const wo = c.worshipOrder ?? [];
  const hymns = c.hymns ?? [];
  const prayers = c.prayerRequests ?? [];
  const anns = c.announcements ?? [];
  const study = c.study ?? { observation: [], correlation: [], application: [] };
  const setStudy = (key: 'observation' | 'correlation' | 'application', arr: string[]) =>
    setContent({ study: { ...study, [key]: arr } });

  const handleCreate = () => { setEditingId(null); setForm(structuredClone(EMPTY_FORM)); setView('edit'); };
  const handleEdit = (item: OnlineBulletin) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      serviceDate: item.serviceDate ? String(item.serviceDate).slice(0, 10) : '',
      status: item.status,
      // Merge over EMPTY_CONTENT so older/partial rows still have every field.
      content: { ...structuredClone(EMPTY_CONTENT), ...(item.content ?? {}) },
    });
    setView('edit');
  };

  const onSubmit = () => {
    if (!form.title.trim()) { showToast('error', '제목을 입력하세요.'); return; }
    if (!form.serviceDate) { showToast('error', '예배일을 선택하세요.'); return; }
    const payload = { title: form.title, serviceDate: form.serviceDate, status: form.status, content: form.content };
    const done = { onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); }, onError: () => showToast('error', '오류가 발생했습니다.') };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload }, done);
    else createMutation.mutate(payload as Omit<OnlineBulletin, 'id' | 'createdAt' | 'updatedAt'>, done);
  };

  // ── EDIT VIEW ──
  if (view === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingId ? '온라인 주보 수정' : '온라인 주보 작성'}</h2>
          <p className="text-sm text-gray-500 mt-1">아래 순서대로 입력하면 사이트에서 스크롤 다운으로 표시됩니다.</p>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="제목" required>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 2026년 12월 25일 성탄주일예배" className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="예배일" required>
                <input type="date" value={form.serviceDate} onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))} className={inputClass} />
              </FormField>
              <FormField label="예배명">
                <input value={c.serviceTitle ?? ''} onChange={(e) => setContent({ serviceTitle: e.target.value })} placeholder="주일예배" className={inputClass} />
              </FormField>
            </FormRow>
            <FormField label="인도 (예배 인도자)">
              <input value={c.presider ?? ''} onChange={(e) => setContent({ presider: e.target.value })} placeholder="예: 곽정민 목사" className={inputClass} />
            </FormField>
          </FormSection>

          {/* 1. 예배 순서 */}
          <FormSection title="1. 예배 순서">
            <div className="space-y-2">
              {wo.map((r, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={r.label} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })} placeholder="순서 (예: 찬양)" className={`${inputClass} w-32`} />
                  <input value={r.detail} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x) })} placeholder="내용 (예: 찬121 우리 구주 나신 날)" className={`${inputClass} flex-1`} />
                  <input value={r.person} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, person: e.target.value } : x) })} placeholder="담당 (예: 인도자)" className={`${inputClass} w-32`} />
                  <button type="button" onClick={() => setContent({ worshipOrder: wo.filter((_, idx) => idx !== i) })} className={`${btnDelRow} pt-2`}>삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ worshipOrder: [...wo, { label: '', detail: '', person: '' }] })} className={btnGhost}>+ 순서 추가</button>
            </div>
          </FormSection>

          {/* 2. 찬양 악보 */}
          <FormSection title="2. 찬양 악보">
            <div className="space-y-4">
              {hymns.map((h, i) => (
                <HymnEditor key={i} hymn={h} onChange={(patch) => setContent({ hymns: hymns.map((x, idx) => idx === i ? { ...x, ...patch } : x) })} onRemove={() => setContent({ hymns: hymns.filter((_, idx) => idx !== i) })} uploadImage={uploadImage} />
              ))}
              <button type="button" onClick={() => setContent({ hymns: [...hymns, { ...EMPTY_HYMN }] })} className={btnGhost}>+ 찬양 추가</button>
            </div>
          </FormSection>

          {/* 3. 대표기도 */}
          <FormSection title="3. 대표기도">
            <FormField label="기도자">
              <input value={c.representativePrayer?.person ?? ''} onChange={(e) => setContent({ representativePrayer: { ...(c.representativePrayer ?? { person: '', content: '' }), person: e.target.value } })} placeholder="예: 김집사" className={inputClass} />
            </FormField>
            <FormField label="기도 내용 / 메모 (선택)">
              <textarea value={c.representativePrayer?.content ?? ''} onChange={(e) => setContent({ representativePrayer: { ...(c.representativePrayer ?? { person: '', content: '' }), content: e.target.value } })} rows={3} className={inputClass} />
            </FormField>
          </FormSection>

          {/* 4. 성경 본문 */}
          <FormSection title="4. 성경 본문">
            <FormField label="본문 (장절)">
              <input value={c.scripture?.reference ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), reference: e.target.value } })} placeholder="예: 누가복음 1:46-55" className={inputClass} />
            </FormField>
            <FormField label="본문 내용">
              <textarea value={c.scripture?.text ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), text: e.target.value } })} rows={6} placeholder="성경 본문을 붙여넣으세요" className={inputClass} />
            </FormField>
          </FormSection>

          {/* 5. 기도 제목 */}
          <FormSection title="5. 기도 제목">
            <div className="space-y-2">
              {prayers.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={p.title} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="제목" className={`${inputClass} w-40`} />
                  <input value={p.detail} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x) })} placeholder="내용" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setContent({ prayerRequests: prayers.filter((_, idx) => idx !== i) })} className={`${btnDelRow} pt-2`}>삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ prayerRequests: [...prayers, { title: '', detail: '' }] })} className={btnGhost}>+ 기도 제목 추가</button>
            </div>
          </FormSection>

          {/* 6. 마지막 찬양 */}
          <FormSection title="6. 마지막 찬양">
            <HymnEditor hymn={c.closingHymn ?? { ...EMPTY_HYMN }} onChange={(patch) => setContent({ closingHymn: { ...(c.closingHymn ?? EMPTY_HYMN), ...patch } })} uploadImage={uploadImage} />
          </FormSection>

          {/* 7. 주일 광고 */}
          <FormSection title="7. 주일 광고">
            <div className="space-y-2">
              {anns.map((a, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={a.title} onChange={(e) => setContent({ announcements: anns.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="제목" className={`${inputClass} w-48`} />
                  <textarea value={a.body} onChange={(e) => setContent({ announcements: anns.map((x, idx) => idx === i ? { ...x, body: e.target.value } : x) })} placeholder="내용" rows={2} className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setContent({ announcements: anns.filter((_, idx) => idx !== i) })} className={`${btnDelRow} pt-2`}>삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ announcements: [...anns, { title: '', body: '' }] })} className={btnGhost}>+ 광고 추가</button>
            </div>
          </FormSection>

          {/* 8. 소그룹 나눔 질문 */}
          <FormSection title="8. 소그룹 나눔 질문 (본문 연계)">
            <p className="text-xs text-gray-500 -mt-2 mb-3">성경 본문과 연결된 관찰·상관·적용 질문 — 소그룹에서 사용합니다.</p>
            <QuestionList label="관찰 질문" items={study.observation} onChange={(arr) => setStudy('observation', arr)} />
            <QuestionList label="상관 질문" items={study.correlation} onChange={(arr) => setStudy('correlation', arr)} />
            <QuestionList label="적용 질문" items={study.application} onChange={(arr) => setStudy('application', arr)} />
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900">취소</button>
            <button type="button" onClick={onSubmit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50 shadow-sm">
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">온라인 주보 관리</h2>
        <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium">새 온라인 주보</button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="검색..." value={params.search || ''} onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))} className="border rounded px-3 py-2 w-full sm:w-64" />
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState icon="📜" title="등록된 온라인 주보가 없습니다" description="새 온라인 주보를 작성해보세요." actionLabel="온라인 주보 작성" onAction={handleCreate} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium">예배일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.serviceDate ? String(item.serviceDate).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button onClick={() => setDeleteTarget({ id: item.id, name: item.title || '' })} disabled={deleteMutation.isPending} className="text-red-600 hover:underline disabled:opacity-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">총 {data.total}건 (페이지 {data.page}/{data.totalPages})</span>
            <div className="flex gap-2">
              <button disabled={data.page <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))} className="px-3 py-1 border rounded disabled:opacity-50">이전</button>
              <button disabled={data.page >= data.totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))} className="px-3 py-1 border rounded disabled:opacity-50">다음</button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, { onSuccess: () => showToast('success', '삭제되었습니다.'), onError: () => showToast('error', '오류가 발생했습니다.') });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── sub-editors ── */
function HymnEditor({ hymn, onChange, onRemove, uploadImage }: { hymn: OnlineHymn; onChange: (patch: Partial<OnlineHymn>) => void; onRemove?: () => void; uploadImage: (f: File) => Promise<string> }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <input value={hymn.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="찬양 제목 (예: 우리 구주 나신 날)" className={`${inputClass} flex-1`} />
        <input value={hymn.hymnNo} onChange={(e) => onChange({ hymnNo: e.target.value })} placeholder="장 (예: 찬121)" className={`${inputClass} w-28`} />
        {onRemove && <button type="button" onClick={onRemove} className={`${btnDelRow} pt-2`}>삭제</button>}
      </div>
      <MultiImageUpload value={hymn.imageUrls || []} onChange={(urls) => onChange({ imageUrls: urls })} onUpload={uploadImage} resize="content" max={6} label="악보 이미지" />
      <input value={hymn.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="메모 (선택)" className={inputClass} />
    </div>
  );
}

function QuestionList({ label, items, onChange }: { label: string; items: string[]; onChange: (arr: string[]) => void }) {
  const list = items ?? [];
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      <div className="space-y-2">
        {list.map((q, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs text-gray-400 font-mono pt-2.5 w-5 shrink-0">{i + 1}.</span>
            <textarea value={q} onChange={(e) => onChange(list.map((x, idx) => idx === i ? e.target.value : x))} rows={2} placeholder="질문" className={`${inputClass} flex-1`} />
            <button type="button" onClick={() => onChange(list.filter((_, idx) => idx !== i))} className={`${btnDelRow} pt-2`}>삭제</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...list, ''])} className={btnGhost}>+ {label} 추가</button>
      </div>
    </div>
  );
}
