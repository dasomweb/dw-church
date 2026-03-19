import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { History, HistoryItem } from '@dw-church/api-client';
import {
  useHistory,
  useCreateHistory,
  useUpdateHistory,
  useDeleteHistory,
} from '@dw-church/api-client';

interface HistoryFormData {
  year: number;
}

interface ItemFormData {
  month: number;
  day: number;
  content: string;
  photoUrl: string;
}

export default function HistoryManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingEntry, setEditingEntry] = useState<History | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const { data: historyList, isLoading, error } = useHistory();
  const createMutation = useCreateHistory();
  const updateMutation = useUpdateHistory();
  const deleteMutation = useDeleteHistory();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HistoryFormData>();
  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItem,
    formState: { errors: itemErrors },
  } = useForm<ItemFormData>();

  const sortItems = (list: HistoryItem[]): HistoryItem[] => {
    return [...list].sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });
  };

  const handleEdit = (entry: History) => {
    setEditingEntry(entry);
    setItems(sortItems(entry.items || []));
    reset({ year: entry.year });
    setEditingItemIndex(null);
    resetItem({ month: 1, day: 1, content: '', photoUrl: '' });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setItems([]);
    reset({ year: new Date().getFullYear() });
    setEditingItemIndex(null);
    resetItem({ month: 1, day: 1, content: '', photoUrl: '' });
    setView('edit');
  };

  const handleDelete = (entry: History) => {
    if (window.confirm(`${entry.year}년 연혁을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  const handleAddItem = (data: ItemFormData) => {
    const newItem: HistoryItem = {
      id: editingItemIndex !== null ? (items[editingItemIndex]?.id ?? `temp-${Date.now()}`) : `temp-${Date.now()}`,
      month: Number(data.month),
      day: Number(data.day),
      content: data.content,
      photoUrl: data.photoUrl,
    };

    let updatedItems: HistoryItem[];
    if (editingItemIndex !== null) {
      updatedItems = [...items];
      updatedItems[editingItemIndex] = newItem;
    } else {
      updatedItems = [...items, newItem];
    }

    setItems(sortItems(updatedItems));
    setEditingItemIndex(null);
    resetItem({ month: 1, day: 1, content: '', photoUrl: '' });
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingItemIndex(index);
    resetItem({
      month: item.month,
      day: item.day,
      content: item.content,
      photoUrl: item.photoUrl,
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      resetItem({ month: 1, day: 1, content: '', photoUrl: '' });
    }
  };

  const onSubmit = (formData: HistoryFormData) => {
    const payload = {
      year: Number(formData.year),
      items,
    };

    if (editingEntry) {
      updateMutation.mutate(
        { id: editingEntry.id, data: payload },
        { onSuccess: () => setView('list') },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setView('list') });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const monthLabels = [
    '없음', '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ];

  if (view === 'edit') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingEntry ? '연혁 수정' : '연혁 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">연도</label>
            <input
              type="number"
              {...register('year', {
                required: '연도를 입력하세요',
                valueAsNumber: true,
                min: { value: 1900, message: '1900 이상' },
                max: { value: 2100, message: '2100 이하' },
              })}
              className="w-32 border rounded px-3 py-2"
            />
            {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>}
          </div>

          <div>
            <h3 className="text-sm font-bold mb-3">항목 목록 ({items.length}건)</h3>

            {items.length > 0 && (
              <div className="border rounded mb-4 divide-y">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        {item.month > 0 ? `${item.month}월` : ''}
                        {item.day > 0 ? ` ${item.day}일` : ''}
                        {item.month === 0 && item.day === 0 ? '(날짜 미지정)' : ''}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">{item.content}</span>
                      {item.photoUrl && (
                        <span className="text-xs text-blue-500 ml-2">[사진]</span>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEditItem(index)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border rounded p-4 bg-gray-50">
              <h4 className="text-sm font-medium mb-3">
                {editingItemIndex !== null ? '항목 수정' : '항목 추가'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">월 (0=미지정)</label>
                  <select
                    {...registerItem('month', { valueAsNumber: true })}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 13 }, (_, i) => (
                      <option key={i} value={i}>{monthLabels[i]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">일 (0=미지정)</label>
                  <input
                    type="number"
                    {...registerItem('day', { valueAsNumber: true, min: 0, max: 31 })}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">내용</label>
                  <input
                    {...registerItem('content', { required: '내용을 입력하세요' })}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                  {itemErrors.content && (
                    <p className="text-red-500 text-xs mt-0.5">{itemErrors.content.message}</p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1">사진 URL</label>
                <input
                  {...registerItem('photoUrl')}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSubmitItem(handleAddItem)}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  {editingItemIndex !== null ? '항목 수정' : '항목 추가'}
                </button>
                {editingItemIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemIndex(null);
                      resetItem({ month: 1, day: 1, content: '', photoUrl: '' });
                    }}
                    className="px-4 py-1.5 bg-gray-200 text-sm rounded hover:bg-gray-300"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
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
        <h2 className="text-xl font-bold">연혁 관리</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          새 연혁
        </button>
      </div>

      {isLoading && <p className="text-gray-500">로딩 중...</p>}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {historyList && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {historyList.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-gray-800">{entry.year}</div>
              <p className="text-sm text-gray-500 mt-1">
                {entry.items?.length ?? 0}개 항목
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(entry)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  편집
                </button>
                <button
                  onClick={() => handleDelete(entry)}
                  disabled={deleteMutation.isPending}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
