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

  const { data, isLoading, error } = useSermons(params);
  const { data: categories } = useSermonCategories();
  const { data: preachers } = useSermonPreachers();
  const createMutation = useCreateSermon();
  const updateMutation = useUpdateSermon();
  const deleteMutation = useDeleteSermon();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SermonFormData>();

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
    if (window.confirm(`"${item.title}" 을(를) 삭제하시겠습니까?`)) {
      deleteMutation.mutate(item.id);
    }
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
        { onSuccess: () => setView('list') },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setView('list') });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingItem ? '설교 수정' : '설교 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
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
            <label className="block text-sm font-medium mb-1">성경구절</label>
            <input
              {...register('scripture')}
              placeholder="요한복음 3:16"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설교자</label>
            <select {...register('preacher')} className="w-full border rounded px-3 py-2">
              <option value="">선택하세요</option>
              {preachers?.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
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
            <label className="block text-sm font-medium mb-1">날짜</label>
            <input
              type="date"
              {...register('date', { required: '날짜를 선택하세요' })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">카테고리 (복수 선택)</label>
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
            <label className="block text-sm font-medium mb-1">썸네일 URL</label>
            <input
              {...register('thumbnailUrl')}
              placeholder="https://example.com/thumb.jpg"
              className="w-full border rounded px-3 py-2"
            />
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
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

      {isLoading && <p className="text-gray-500">로딩 중...</p>}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && (
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
                        className="text-red-600 hover:underline disabled:opacity-50"
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
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                이전
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
