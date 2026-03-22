import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Event, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

interface EventFormData {
  title: string;
  backgroundImageUrl: string;
  imageOnly: boolean;
  department: string;
  eventDate: string;
  location: string;
  linkUrl: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  status: PostStatus;
}

export default function EventManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Event | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error } = useEvents(params);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EventFormData>();

  const handleEdit = (item: Event) => {
    setEditingItem(item);
    reset({
      title: item.title,
      backgroundImageUrl: item.backgroundImageUrl,
      imageOnly: item.imageOnly,
      department: item.department,
      eventDate: item.eventDate,
      location: item.location,
      linkUrl: item.linkUrl,
      description: item.description,
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: (item as any).thumbnailUrl || '',
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      title: '', backgroundImageUrl: '', imageOnly: false, department: '',
      eventDate: '', location: '', linkUrl: '', description: '', youtubeUrl: '', thumbnailUrl: '', status: 'draft',
    });
    setView('edit');
  };

  const handleDelete = (item: Event) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: EventFormData) => {
    const payload = {
      ...formData,
      thumbnailUrl: formData.thumbnailUrl || '',
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingItem ? '이벤트 수정' : '이벤트 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="이벤트 정보">
            <FormField label="제목" required error={errors.title?.message}>
              <input {...register('title', { required: '제목을 입력하세요' })} className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="부서">
                <input {...register('department')} placeholder="예: 청년부" className={inputClass} />
              </FormField>
              <FormField label="날짜/시간">
                <input {...register('eventDate')} placeholder="예: 2026-03-22 10:00" className={inputClass} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="장소">
                <input {...register('location')} placeholder="본당 대예배실" className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select {...register('status')} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormField label="이벤트 URL">
              <input {...register('linkUrl')} placeholder="https://example.com/register" className={inputClass} />
            </FormField>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('imageOnly')} className="rounded" />
              <span className="text-sm font-medium text-gray-700">이미지만 사용</span>
            </label>
          </FormSection>

          <FormSection title="설명">
            <FormField label="설명">
              <textarea {...register('description')} rows={6} className={textareaClass} />
            </FormField>
          </FormSection>

          <FormSection title="미디어">
            <ImageUpload
              label="배경 이미지"
              value={watch('backgroundImageUrl') || ''}
              onChange={(url) => setValue('backgroundImageUrl', url)}
              aspectRatio="16/9"
            />
            <FormField label="YouTube URL">
              <input {...register('youtubeUrl')} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
            </FormField>
            <ImageUpload
              label="썸네일"
              value={watch('thumbnailUrl') || ''}
              onChange={(url) => setValue('thumbnailUrl', url)}
            />
          </FormSection>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
        <h2 className="text-xl font-bold">이벤트 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 이벤트
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
          icon="📅"
          title="등록된 이벤트가 없습니다"
          description="새로운 이벤트를 추가해보세요."
          actionLabel="이벤트 추가"
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
                  <th className="text-left px-4 py-3 text-sm font-medium">날짜</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">위치</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">{item.eventDate || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.location || '-'}</td>
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
