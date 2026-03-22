import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Sermon, SermonListParams, PostStatus } from '@dw-church/api-client';
import {
  useSermons,
  useCreateSermon,
  useUpdateSermon,
  useDeleteSermon,
  useSermonCategories,
  useSermonPreachers,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

interface SermonFormData {
  title: string;
  scripture: string;
  preacher: string;
  youtubeUrl: string;
  date: string;
  categoryIds: string;
  thumbnailUrl: string;
  status: PostStatus;
}

export default function SermonManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Sermon | null>(null);
  const [params, setParams] = useState<SermonListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error } = useSermons(params);
  const { data: categories } = useSermonCategories();
  const { data: preachers } = useSermonPreachers();
  const createMutation = useCreateSermon();
  const updateMutation = useUpdateSermon();
  const deleteMutation = useDeleteSermon();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SermonFormData>();

  const handleEdit = (item: Sermon) => {
    setEditingItem(item);
    reset({
      title: item.title,
      scripture: item.scripture,
      preacher: item.preacher,
      youtubeUrl: item.youtubeUrl,
      date: item.date,
      categoryIds: JSON.stringify(item.categoryIds),
      thumbnailUrl: item.thumbnailUrl,
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', scripture: '', preacher: '', youtubeUrl: '', date: '', categoryIds: '[]', thumbnailUrl: '', status: 'draft' });
    setView('edit');
  };

  const handleDelete = (item: Sermon) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: SermonFormData) => {
    const payload = {
      title: formData.title,
      scripture: formData.scripture,
      preacher: formData.preacher,
      youtubeUrl: formData.youtubeUrl,
      date: formData.date,
      categoryIds: JSON.parse(formData.categoryIds || '[]') as string[],
      category: '',
      thumbnailUrl: formData.thumbnailUrl,
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingItem ? '설교 수정' : '설교 등록'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">설교 영상과 정보를 관리합니다</p>
          </div>
          <button
            type="button"
            onClick={() => setView('list')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            ← 목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="기본 정보">
            <div className="space-y-4">
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
              <FormRow>
                <FormField label="설교자">
                  <select {...register('preacher')} className={selectClass}>
                    <option value="">선택하세요</option>
                    {preachers?.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="성경구절">
                  <input
                    {...register('scripture')}
                    placeholder="요한복음 3:16"
                    className={inputClass}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="날짜" required error={errors.date?.message}>
                  <input
                    type="date"
                    {...register('date', { required: '날짜를 선택하세요' })}
                    className={inputClass}
                  />
                </FormField>
                <div />
              </FormRow>
            </div>
          </FormSection>

          <FormSection title="미디어">
            <div className="space-y-4">
              <FormField label="YouTube URL">
                <input
                  {...register('youtubeUrl')}
                  placeholder="https://youtube.com/watch?v=..."
                  className={inputClass}
                />
                <p className="text-sm text-gray-500 mt-1">설교 영상의 YouTube URL을 입력하세요</p>
              </FormField>
              <ImageUpload
                value={watch('thumbnailUrl') || ''}
                onChange={(url) => setValue('thumbnailUrl', url)}
                label="썸네일"
                aspectRatio="16/9"
              />
            </div>
          </FormSection>

          <FormSection title="카테고리">
            <div className="space-y-4">
              <div className="border rounded p-3 max-h-40 overflow-y-auto space-y-1">
                {categories?.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={cat.id} className="rounded" />
                    {cat.name}
                  </label>
                ))}
                {(!categories || categories.length === 0) && (
                  <p className="text-gray-400 text-sm">카테고리가 없습니다</p>
                )}
              </div>
              <input type="hidden" {...register('categoryIds')} />
            </div>
          </FormSection>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            >
              취소
            </button>
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
        <h2 className="text-xl font-bold">설교 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 설교
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="검색..."
          value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2 w-64"
        />
        <select
          value={params.category || ''}
          onChange={(e) => setParams((p) => ({ ...p, category: e.target.value || undefined, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 카테고리</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
        <select
          value={params.preacher || ''}
          onChange={(e) => setParams((p) => ({ ...p, preacher: e.target.value || undefined, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 설교자</option>
          {preachers?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="🎤"
          title="등록된 설교가 없습니다"
          description="새로운 설교를 추가해보세요."
          actionLabel="설교 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">설교자</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">성경구절</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">날짜</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">YouTube</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">{item.preacher}</td>
                    <td className="px-4 py-3 text-sm">{item.scripture}</td>
                    <td className="px-4 py-3 text-sm">{item.date}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.youtubeUrl ? (
                        <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          보기
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
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
