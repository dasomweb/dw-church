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
import { useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

interface AlbumFormData {
  title: string;
  images: string;
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
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AlbumFormData>();

  const watchImages = watch('images');

  const handleEdit = (item: Album) => {
    setEditingItem(item);
    reset({
      title: item.title,
      images: item.images.join(', '),
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: item.thumbnailUrl,
      categoryIds: JSON.stringify(item.categoryIds),
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', images: '', youtubeUrl: '', thumbnailUrl: '', categoryIds: '[]', status: 'draft' });
    setView('edit');
  };

  const handleDelete = (item: Album) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const parseImages = (input: string): string[] => {
    const trimmed = (input || '').trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch { /* fall through */ }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const imageCount = parseImages(watchImages || '').length;

  const onSubmit = (formData: AlbumFormData) => {
    const images = parseImages(formData.images);
    const payload = {
      title: formData.title,
      images,
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingItem ? '앨범 수정' : '앨범 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input
              {...register('title', { required: '제목을 입력하세요' })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              이미지 URLs (쉼표 구분 또는 JSON 배열)
            </label>
            <textarea
              {...register('images')}
              rows={4}
              placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              className="w-full border rounded px-3 py-2 font-mono text-sm"
            />
            <div className="flex justify-between mt-1">
              <span className="text-sm text-gray-500">이미지 수: {imageCount}</span>
              {imageCount > 15 && (
                <span className="text-sm text-amber-600 font-medium">
                  경고: 이미지가 15개를 초과합니다. 성능에 영향을 줄 수 있습니다.
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">YouTube URL</label>
            <input
              {...register('youtubeUrl')}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">썸네일 URL</label>
            <input
              {...register('thumbnailUrl')}
              placeholder="https://example.com/thumb.jpg"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
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

          <div>
            <label className="block text-sm font-medium mb-1">상태</label>
            <select {...register('status')} className="w-full border rounded px-3 py-2">
              <option value="published">공개</option>
              <option value="draft">임시저장</option>
              <option value="archived">보관</option>
            </select>
          </div>

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
