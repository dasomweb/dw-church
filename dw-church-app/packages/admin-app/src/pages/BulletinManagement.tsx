import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Bulletin, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useBulletins,
  useCreateBulletin,
  useUpdateBulletin,
  useDeleteBulletin,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, MultiImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

interface BulletinFormData {
  title: string;
  date: string;
  pdfUrl: string;
  images: string[];
  status: PostStatus;
}

export default function BulletinManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Bulletin | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error } = useBulletins(params);
  const createMutation = useCreateBulletin();
  const updateMutation = useUpdateBulletin();
  const deleteMutation = useDeleteBulletin();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BulletinFormData>();

  const handleEdit = (item: Bulletin) => {
    setEditingItem(item);
    reset({
      title: item.title,
      date: item.date,
      pdfUrl: item.pdfUrl,
      images: item.images || [],
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', date: '', pdfUrl: '', images: [], status: 'draft' });
    setView('edit');
  };

  const handleDelete = (item: Bulletin) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: BulletinFormData) => {
    const images = formData.images || [];
    const payload = {
      title: formData.title,
      date: formData.date,
      pdfUrl: formData.pdfUrl,
      images,
      thumbnailUrl: '',
      status: formData.status,
    };
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: payload },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '주보 수정' : '주보 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="제목" required error={errors.title?.message}>
                <input
                  {...register('title', { required: '제목을 입력하세요' })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="상태">
                <select {...register('status')} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormField label="날짜" required error={errors.date?.message}>
              <input
                type="date"
                {...register('date', { required: '날짜를 선택하세요' })}
                className={inputClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="주보 이미지">
            <MultiImageUpload
              value={watch('images') || []}
              onChange={(urls) => setValue('images', urls)}
              max={10}
              label="주보 이미지"
            />
          </FormSection>

          <FormSection title="PDF 파일">
            <FormField label="PDF URL" help="주보 PDF 파일의 URL을 입력하세요">
              <input
                {...register('pdfUrl')}
                placeholder="https://example.com/bulletin.pdf"
                className={inputClass}
              />
            </FormField>
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">모든 필수 항목을 입력해주세요</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                취소
              </button>
              <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-600/25">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-red-500 text-sm">저장 중 오류가 발생했습니다.</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">주보 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 주보
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="검색..."
          value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2 w-64"
        />
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="📋"
          title="등록된 주보가 없습니다"
          description="새로운 주보를 추가해보세요."
          actionLabel="주보 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium">날짜</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">PDF</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">이미지수</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.date}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.pdfUrl ? (
                        <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.images?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              총 {data.total}건 (페이지 {data.page}/{data.totalPages})
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); },
            onError: () => { showToast('error', '오류가 발생했습니다.'); },
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
