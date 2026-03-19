import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Event, ListParams, PostStatus } from '@dw-church/api-client';
import { useEvents } from '@dw-church/api-client';

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
  status: PostStatus;
}

export default function EventManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Event | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });

  const { data, isLoading, error } = useEvents(params);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>();

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
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      title: '', backgroundImageUrl: '', imageOnly: false, department: '',
      eventDate: '', location: '', linkUrl: '', description: '', youtubeUrl: '', status: 'draft',
    });
    setView('edit');
  };

  const handleDelete = (item: Event) => {
    if (window.confirm(`"${item.title}" 을(를) 삭제하시겠습니까?`)) {
      console.log('[DELETE] Event:', item.id);
    }
  };

  const onSubmit = (formData: EventFormData) => {
    if (editingItem) {
      console.log('[UPDATE] Event:', editingItem.id, formData);
    } else {
      console.log('[CREATE] Event:', formData);
    }
    alert('저장 기능은 WP REST API 연동 후 활성화됩니다.');
  };

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
            <label className="block text-sm font-medium mb-1">배경 이미지 URL</label>
            <input
              {...register('backgroundImageUrl')}
              placeholder="https://example.com/event-bg.jpg"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('imageOnly')} className="rounded" />
              <span className="text-sm font-medium">이미지만 표시 (텍스트 숨김)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">부서</label>
              <input
                {...register('department')}
                placeholder="예: 청년부"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">이벤트 날짜</label>
              <input
                type="date"
                {...register('eventDate')}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">장소</label>
            <input
              {...register('location')}
              placeholder="본당 대예배실"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">링크 URL</label>
            <input
              {...register('linkUrl')}
              placeholder="https://example.com/register"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full border rounded px-3 py-2"
            />
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
            <label className="block text-sm font-medium mb-1">상태</label>
            <select {...register('status')} className="w-full border rounded px-3 py-2">
              <option value="publish">공개</option>
              <option value="draft">임시저장</option>
              <option value="pending">검토 대기</option>
              <option value="private">비공개</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              저장 (placeholder)
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              취소
            </button>
          </div>
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

      {isLoading && <p className="text-gray-500">로딩 중...</p>}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && (
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
                      <span className={`px-2 py-1 rounded text-xs ${item.status === 'publish' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:underline">삭제</button>
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
