import { useState } from 'react';
import type { Book, ListParams } from '@dw-church/api-client';
import {
  useBooks, useCreateBook, useUpdateBook, useDeleteBook, useDWChurchClient,
} from '@dw-church/api-client';
import {
  FormField, FormSection, FormRow, inputClass, selectClass,
  ImageUpload, MultiImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton,
} from '../components';

/**
 * 책 추천 관리.
 *
 * 서지 정보(제목·저자·출판사)보다 **추천사**가 핵심인 모듈이다 — 서점 목록이
 * 아니라 "우리 교회가 왜 이 책을 권하는가"를 남기는 곳이라, 입력 순서도
 * 추천인·추천사를 앞에 둔다.
 */

interface FormState {
  title: string;
  author: string;
  publisher: string;
  coverImageUrls: string[];
  category: string;
  recommendation: string;
  linkUs: string;
  linkKr: string;
  recommendedAt: string;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
  featuredPeriod: 'month' | 'week';
  status: 'draft' | 'published' | 'archived';
}

const EMPTY: FormState = {
  title: '', author: '', publisher: '', coverImageUrls: [], category: '',
  recommendation: '', linkUs: '', linkKr: '', recommendedAt: '',
  startDate: '', endDate: '', isFeatured: false, featuredPeriod: 'month',
  status: 'published',
};

/** 게시 기간 대비 오늘 상태 — 목록에서 한눈에 보이게. */
function periodState(start?: string, end?: string): { label: string; cls: string } {
  const today = new Date().toISOString().slice(0, 10);
  const s = (start || '').slice(0, 10);
  const e = (end || '').slice(0, 10);
  if (s && s > today) return { label: '예정', cls: 'bg-blue-100 text-blue-800' };
  if (e && e < today) return { label: '종료', cls: 'bg-gray-100 text-gray-500' };
  return { label: '게시중', cls: 'bg-green-100 text-green-800' };
}

function periodText(start?: string, end?: string): string {
  const s = (start || '').slice(0, 10);
  const e = (end || '').slice(0, 10);
  if (!s && !e) return '제한 없음';
  return `${s || '—'} ~ ${e || '—'}`;
}

export default function BookManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 20, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file, 'books')).url;

  const { data, isLoading, error } = useBooks(params);
  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const books: Book[] = Array.isArray(data) ? data : [];

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY }); setView('edit'); };
  const openEdit = (b: Book) => {
    setEditingId(b.id);
    setForm({
      title: b.title ?? '',
      author: b.author ?? '',
      publisher: b.publisher ?? '',
      coverImageUrls: Array.isArray(b.coverImageUrls) ? b.coverImageUrls : [],
      category: b.category ?? '',
      recommendation: b.recommendation ?? '',
      linkUs: b.linkUs ?? '',
      linkKr: b.linkKr ?? '',
      recommendedAt: b.recommendedAt ? String(b.recommendedAt).slice(0, 10) : '',
      startDate: b.startDate ? String(b.startDate).slice(0, 10) : '',
      endDate: b.endDate ? String(b.endDate).slice(0, 10) : '',
      isFeatured: !!b.isFeatured,
      featuredPeriod: (b.featuredPeriod as 'month' | 'week') ?? 'month',
      status: (b.status as FormState['status']) ?? 'published',
    });
    setView('edit');
  };

  const onSubmit = () => {
    if (!form.title.trim()) { showToast('error', '책 제목을 입력하세요.'); return; }
    const done = {
      onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
      onError: () => showToast('error', '오류가 발생했습니다.'),
    };
    if (editingId) updateMutation.mutate({ id: editingId, data: form }, done);
    else createMutation.mutate(form, done);
  };

  // ── 편집 ──
  if (view === 'edit') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button type="button" onClick={() => setView('list')} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingId ? '추천 도서 수정' : '추천 도서 등록'}</h2>
        </div>

        <div className="space-y-6">
          <FormSection title="추천">
            <FormField label="추천일">
              <input type="date" value={form.recommendedAt} onChange={(e) => setForm({ ...form, recommendedAt: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="추천사">
              <textarea value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} rows={5}
                placeholder="왜 이 책을 권하는지 적어주세요. 사이트에서 제목 다음으로 눈에 띄는 내용입니다." className={inputClass} />
            </FormField>
          </FormSection>

          <FormSection title="책 정보">
            <FormField label="제목" required>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 복음과 하나님의 나라" className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="저자">
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputClass} />
              </FormField>
              <FormField label="출판사">
                <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className={inputClass} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="분야">
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="예: 신앙일반 · 묵상 · 제자훈련 · 가정" className={inputClass} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="구입처 · 미국">
                <input value={form.linkUs} onChange={(e) => setForm({ ...form, linkUs: e.target.value })} placeholder="예: Amazon 주소" className={inputClass} />
              </FormField>
              <FormField label="구입처 · 한국">
                <input value={form.linkKr} onChange={(e) => setForm({ ...form, linkKr: e.target.value })} placeholder="예: 교보문고 · 알라딘 주소" className={inputClass} />
              </FormField>
            </FormRow>
            <p className="-mt-2 text-xs text-gray-400">비운 쪽은 사이트에 표시되지 않습니다.</p>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">표지 · 소개 이미지 (최대 2장)</p>
              <MultiImageUpload value={form.coverImageUrls} onChange={(urls) => setForm({ ...form, coverImageUrls: urls })} onUpload={uploadImage} resize="content" max={2} label="" />
              <p className="mt-1 text-xs text-gray-400">세로형(2:3) 권장. 화살표로 순서를 바꿀 수 있고 첫 장이 대표 이미지입니다. 없으면 제목 첫 글자로 대신합니다.</p>
            </div>
          </FormSection>

          <FormSection title="표시">
            <FormRow>
              <FormField label="상태">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
              <FormField label="대표 추천 주기">
                <select value={form.featuredPeriod} onChange={(e) => setForm({ ...form, featuredPeriod: e.target.value as 'month' | 'week' })} className={selectClass}>
                  <option value="month">이달의 추천도서</option>
                  <option value="week">이번 주 추천도서</option>
                </select>
              </FormField>
            </FormRow>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
              대표 추천으로 크게 표시
            </label>
            <FormRow>
              <FormField label="게시 시작일">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
              </FormField>
              <FormField label="게시 종료일">
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputClass} />
              </FormField>
            </FormRow>
            <p className="-mt-2 text-xs text-gray-400">비우면 제한 없이 계속 표시됩니다. 종료일을 넣어두면 그날까지만 사이트에 나갑니다.</p>
          </FormSection>

          <div className="flex items-center justify-end gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
            <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900">취소</button>
            <button type="button" onClick={onSubmit} disabled={isSaving} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 목록 ──
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">책 추천</h2>
        <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ 추천 도서 등록</button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="제목·저자·추천사 검색..." value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
          className="w-full rounded border px-3 py-2 sm:w-72" />
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {!isLoading && books.length === 0 && (
        <EmptyState icon="📚" title="등록된 추천 도서가 없습니다"
          description="성도에게 권하고 싶은 책을 등록해보세요." actionLabel="추천 도서 등록" onAction={openCreate} />
      )}

      {books.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium">책</th>
                <th className="px-4 py-3 text-left text-sm font-medium">분야</th>
                <th className="px-4 py-3 text-left text-sm font-medium">게시 기간</th>
                <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {(b.coverImageUrls?.[0])
                        ? <img src={b.coverImageUrls[0]} alt="" className="h-12 w-8 shrink-0 rounded object-cover" />
                        : <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">{(b.title || '?').slice(0, 1)}</span>}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {b.isFeatured && (
                            <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                              {b.featuredPeriod === 'week' ? '이번 주' : '이달의 책'}
                            </span>
                          )}
                          {b.title}
                        </p>
                        <p className="truncate text-xs text-gray-500">{[b.author, b.publisher].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{b.category || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{periodText(b.startDate, b.endDate)}</td>
                  <td className="px-4 py-3 text-sm">
                    {/* 공개여도 기간이 지나면 사이트엔 안 나온다 — 둘을 같이 보여줘야 오해가 없다. */}
                    {b.status === 'published' ? (() => {
                      const st = periodState(b.startDate, b.endDate);
                      return <span className={`rounded px-2 py-1 text-xs ${st.cls}`}>{st.label}</span>;
                    })() : (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {b.status === 'draft' ? '임시저장' : '보관'}
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3 text-sm">
                    <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline">편집</button>
                    <button onClick={() => setDeleteTarget({ id: b.id, name: b.title })} disabled={deleteMutation.isPending}
                      className="text-red-600 hover:underline disabled:opacity-50">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); setDeleteTarget(null); },
            onError: () => { showToast('error', '삭제에 실패했습니다.'); setDeleteTarget(null); },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
