import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Album, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useAlbums,
  useCreateAlbum,
  useUpdateAlbum,
  useDeleteAlbum,
  useAlbumCategories,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, ImageUpload, MultiImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

interface AlbumFormData {
  title: string;
  images: string[];
  youtubeUrl: string;
  thumbnailUrl: string;
  categoryIds: string;
  status: PostStatus;
}

export default function AlbumManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Album | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 12, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error } = useAlbums(params);
  const { data: categories } = useAlbumCategories();
  const createMutation = useCreateAlbum();
  const updateMutation = useUpdateAlbum();
  const deleteMutation = useDeleteAlbum();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AlbumFormData>();

  const handleEdit = (item: Album) => {
    setEditingItem(item);
    reset({
      title: item.title,
      images: item.images || [],
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: item.thumbnailUrl,
      categoryIds: JSON.stringify(item.categoryIds),
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', images: [], youtubeUrl: '', thumbnailUrl: '', categoryIds: '[]', status: 'draft' });
    setView('edit');
  };

  const handleDelete = (item: Album) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: AlbumFormData) => {
    const payload = {
      title: formData.title,
      images: formData.images,
      youtubeUrl: formData.youtubeUrl,
      thumbnailUrl: formData.thumbnailUrl,
      categoryIds: JSON.parse(formData.categoryIds || '[]') as string[],
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
              {editingItem ? '앨범 수정' : '앨범 등록'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">교회 앨범을 등록하고 관리합니다</p>
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
          <FormSection title="앨범 정보">
            <div className="space-y-4">
              <FormRow>
                <FormField label="제목" required error={errors.title?.message}>
                  <input {...register('title', { required: '제목을 입력하세요' })} className={inputClass} />
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
                <FormField label="카테고리">
                  <select {...register('categoryIds')} className={selectClass}>
                    <option value="[]">선택</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={JSON.stringify([cat.id])}>{cat.name}</option>
                    ))}
                  </select>
                </FormField>
                <div />
              </FormRow>
            </div>
          </FormSection>

          <FormSection title="앨범 이미지" description="첫 번째 이미지가 대표 이미지로 사용됩니다. 최대 15개">
            <div className="space-y-4">
              <MultiImageUpload
                value={watch('images') || []}
                onChange={(urls) => setValue('images', urls)}
                max={15}
              />
            </div>
          </FormSection>

          <FormSection title="미디어">
            <div className="space-y-4">
              <FormField label="YouTube URL">
                <input {...register('youtubeUrl')} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
              </FormField>
              <ImageUpload
                label="썸네일"
                value={watch('thumbnailUrl') || ''}
                onChange={(url) => setValue('thumbnailUrl', url)}
              />
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
        <h2 className="text-xl font-bold">앨범 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 앨범
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

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="📸"
          title="등록된 앨범이 없습니다"
          description="새로운 앨범을 추가해보세요."
          actionLabel="앨범 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.data.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 relative">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      이미지 없음
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {item.images?.length ?? 0}장
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium truncate">{item.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 hover:underline">편집</button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
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
